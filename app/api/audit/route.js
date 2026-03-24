import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import OpenAI from 'openai';
import { prisma } from '../../../lib/prisma.js';
import { getAuthenticatedUser, getAccessibleStore } from '../../../lib/auth-helpers.js';
import {
  AUDIT_CHECKS,
  clampAuditScore,
  normalizeAuditChecklist,
  normalizeAuditPrompt,
  normalizeAuditSummary,
} from '../../../lib/page-audit.js';

export const dynamic = 'force-dynamic';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

function isMissingPageAuditStorage(error) {
  return (
    error?.code === 'P2021' &&
    (String(error?.meta?.table || '').includes('PageAudit') || String(error?.message || '').includes('PageAudit'))
  );
}

function normalizeUrl(value) {
  const parsedUrl = new URL(value);
  parsedUrl.hash = '';
  return parsedUrl.toString();
}

function cleanText(value, maxLength = 320) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 3).trim()}...`;
}

function countOccurrences(text, term) {
  if (!text || !term) {
    return 0;
  }

  let count = 0;
  let currentIndex = 0;

  while (true) {
    const nextIndex = text.indexOf(term, currentIndex);
    if (nextIndex === -1) {
      return count;
    }

    count += 1;
    currentIndex = nextIndex + term.length;
  }
}

function hasSelectorMatch($, selectors = []) {
  return selectors.some((selector) => $(selector).length > 0);
}

function extractAuditSignals(html, url) {
  const $ = load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().toLowerCase();
  const htmlLower = html.toLowerCase();
  const title =
    cleanText($('title').first().text()) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    new URL(url).hostname;
  const description =
    cleanText($('meta[name="description"]').attr('content')) ||
    cleanText($('meta[property="og:description"]').attr('content')) ||
    'No meta description found.';

  const signals = AUDIT_CHECKS.map((check) => {
    const matchedTerms = check.terms.filter((term) => bodyText.includes(term)).slice(0, 3);
    const htmlHints = check.htmlHints.filter((hint) => htmlLower.includes(hint)).slice(0, 2);
    const keywordHits = check.terms.reduce((total, term) => total + countOccurrences(bodyText, term), 0);
    const selectorHit = hasSelectorMatch($, check.selectors);

    return {
      key: check.key,
      label: check.label,
      present: selectorHit || keywordHits > 0 || htmlHints.length > 0,
      keywordHits,
      matchedTerms,
      selectorHit,
      htmlHints,
    };
  });

  return {
    url,
    title,
    description,
    signals,
  };
}

function buildFallbackChecklist(extractedSignals) {
  return extractedSignals.signals.map((signal) => {
    const evidenceParts = [];

    if (signal.matchedTerms.length > 0) {
      evidenceParts.push(`Detected terms: ${signal.matchedTerms.join(', ')}`);
    }

    if (signal.selectorHit) {
      evidenceParts.push('Detected supporting page structure');
    }

    if (signal.htmlHints.length > 0) {
      evidenceParts.push(`Markup hints: ${signal.htmlHints.join(', ')}`);
    }

    return {
      label: signal.label,
      status: signal.present ? 'present' : 'missing',
      evidence: signal.present
        ? evidenceParts.join('. ') || 'Detected supporting signals on the page.'
        : 'No clear signal found in the page title, description, text, or markup hints.',
    };
  });
}

function buildAuditMessages(storePrompt, extractedSignals) {
  const signalBlock = extractedSignals.signals
    .map(
      (signal) =>
        `- ${signal.label}: ${signal.present ? 'present' : 'missing'} | keywordHits=${signal.keywordHits} | matchedTerms=${signal.matchedTerms.join(', ') || 'none'} | selectorHit=${signal.selectorHit ? 'yes' : 'no'} | markupHints=${signal.htmlHints.join(', ') || 'none'}`
    )
    .join('\n');

  return [
    {
      role: 'developer',
      content: [
        'You are a senior ecommerce conversion-rate optimization auditor.',
        `Store instruction: ${normalizeAuditPrompt(storePrompt)}`,
        'Return valid JSON only.',
        'Use this exact shape: {"score": number, "summary": "line 1\\nline 2", "checklist": [{"label": "Customer reviews or testimonials", "status": "present|missing", "evidence": "short evidence"}]}.',
        'Checklist must contain exactly 8 items in this order:',
        AUDIT_CHECKS.map((check, index) => `${index + 1}. ${check.label}`).join('\n'),
        'Keep evidence concise. Score must be an integer from 0 to 100. Summary must be exactly two short strategic lines.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `URL: ${extractedSignals.url}`,
        `Page title: ${extractedSignals.title}`,
        `Meta description: ${extractedSignals.description}`,
        'Condensed conversion signals:',
        signalBlock,
        'Audit the page based only on these condensed signals.',
      ].join('\n'),
    },
  ];
}

function readCompletionContent(messageContent) {
  if (typeof messageContent === 'string') {
    return messageContent;
  }

  if (!Array.isArray(messageContent)) {
    return '';
  }

  return messageContent
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      if (part?.type === 'text') {
        return part.text || '';
      }

      return '';
    })
    .join('');
}

function parseJsonResponse(rawContent) {
  const cleanedContent = rawContent
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!cleanedContent) {
    return {};
  }

  try {
    return JSON.parse(cleanedContent);
  } catch (error) {
    const firstBrace = cleanedContent.indexOf('{');
    const lastBrace = cleanedContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleanedContent.slice(firstBrace, lastBrace + 1));
    }

    throw error;
  }
}

function serializeAuditRecord(auditRecord, fallbackChecklist = []) {
  return {
    id: auditRecord.id,
    sku: auditRecord.sku,
    storeId: auditRecord.storeId,
    url: auditRecord.url,
    score: clampAuditScore(auditRecord.score),
    checklist: normalizeAuditChecklist(auditRecord.checklist, fallbackChecklist),
    summary: normalizeAuditSummary(auditRecord.summary),
    createdAt: auditRecord.createdAt,
  };
}

async function findRecentAudit(storeId, sku, normalizedUrl, recentAuditCutoff) {
  try {
    return await prisma.pageAudit.findFirst({
      where: {
        storeId,
        sku,
        url: normalizedUrl,
        createdAt: {
          gte: recentAuditCutoff,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    if (isMissingPageAuditStorage(error)) {
      return null;
    }

    throw error;
  }
}

async function createAuditRecord(data) {
  try {
    return await prisma.pageAudit.create({
      data,
    });
  } catch (error) {
    if (isMissingPageAuditStorage(error)) {
      return {
        id: `page-audit-preview-${Date.now()}`,
        ...data,
        createdAt: new Date(),
      };
    }

    throw error;
  }
}

export async function POST(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sku = typeof body?.sku === 'string' ? body.sku.trim() : '';
    const storeId = typeof body?.storeId === 'string' ? body.storeId.trim() : '';
    const urlValue = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!sku || !storeId || !urlValue) {
      return NextResponse.json(
        { success: false, error: 'sku, storeId, and url are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    let normalizedUrl;

    try {
      normalizedUrl = normalizeUrl(urlValue);
    } catch {
      return NextResponse.json({ success: false, error: 'A valid product URL is required' }, { status: 400 });
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found or access denied' }, { status: 404 });
    }

    const recentAuditCutoff = new Date(Date.now() - SEVEN_DAYS_IN_MS);
    const recentAudit = await findRecentAudit(storeId, sku, normalizedUrl, recentAuditCutoff);

    if (recentAudit) {
      return NextResponse.json({
        success: true,
        data: {
          ...serializeAuditRecord(recentAudit),
          cached: true,
        },
      });
    }

    const pageResponse = await fetch(normalizedUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!pageResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Unable to fetch the product page (${pageResponse.status})` },
        { status: 502 }
      );
    }

    const html = await pageResponse.text();
    const extractedSignals = extractAuditSignals(html, normalizedUrl);
    const fallbackChecklist = buildFallbackChecklist(extractedSignals);
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_completion_tokens: 600,
      response_format: {
        type: 'json_object',
      },
      messages: buildAuditMessages(store.auditPrompt, extractedSignals),
    });

    const rawContent = readCompletionContent(completion.choices[0]?.message?.content);
    const parsedResponse = parseJsonResponse(rawContent);
    const checklist = normalizeAuditChecklist(parsedResponse.checklist, fallbackChecklist);
    const summary = normalizeAuditSummary(parsedResponse.summary);
    const score = clampAuditScore(parsedResponse.score);

    const savedAudit = await createAuditRecord({
      sku,
      storeId,
      url: normalizedUrl,
      score,
      checklist,
      summary,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...serializeAuditRecord(savedAudit, fallbackChecklist),
        cached: false,
      },
    });
  } catch (error) {
    console.error('Audit API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
