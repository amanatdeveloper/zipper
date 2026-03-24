export const DEFAULT_AUDIT_PROMPT = 'Analyze this page for conversion optimization';

export const AUDIT_CHECKS = [
  {
    key: 'reviews',
    label: 'Customer reviews or testimonials',
    terms: ['review', 'reviews', 'testimonial', 'testimonials', 'rating', 'ratings'],
    selectors: ['[class*="review"]', '[id*="review"]', '[itemprop="aggregateRating"]', '[data-rating]'],
    htmlHints: ['review', 'testimonial', 'rating'],
  },
  {
    key: 'video',
    label: 'Product video or demo',
    terms: ['video', 'watch now', 'product demo', 'youtube', 'vimeo'],
    selectors: ['video', 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]', '[class*="video"]'],
    htmlHints: ['youtube.com', 'vimeo.com', '<video'],
  },
  {
    key: 'trust',
    label: 'Trust badges or secure payment cues',
    terms: ['secure checkout', 'trusted', 'trust badge', 'ssl', 'secure payment', 'payment icons'],
    selectors: ['[class*="trust"]', '[class*="badge"]', '[alt*="secure"]', '[alt*="payment"]', '[src*="payment"]'],
    htmlHints: ['secure checkout', 'ssl', 'payment-icons', 'trustbadge'],
  },
  {
    key: 'warranty',
    label: 'Warranty or guarantee messaging',
    terms: ['warranty', 'guarantee', 'guaranteed', 'money back'],
    selectors: ['[class*="warranty"]', '[class*="guarantee"]'],
    htmlHints: ['warranty', 'guarantee'],
  },
  {
    key: 'shipping',
    label: 'Shipping clarity',
    terms: ['shipping', 'delivery', 'dispatch', 'ships in', 'free shipping'],
    selectors: ['[class*="shipping"]', '[class*="delivery"]'],
    htmlHints: ['shipping', 'delivery'],
  },
  {
    key: 'returns',
    label: 'Returns or risk-reversal policy',
    terms: ['returns', 'return policy', 'refund', 'money back', 'exchange'],
    selectors: ['[class*="return"]', '[href*="return"]', '[href*="refund"]'],
    htmlHints: ['return policy', 'refund'],
  },
  {
    key: 'faq',
    label: 'FAQ or objection handling',
    terms: ['faq', 'frequently asked', 'common questions', 'need help'],
    selectors: ['[class*="faq"]', '[id*="faq"]', 'details', '[class*="accordion"]'],
    htmlHints: ['faq', 'accordion'],
  },
  {
    key: 'comparison',
    label: 'Comparison, size, or spec chart',
    terms: ['comparison', 'size chart', 'specification', 'specs', 'dimensions', 'chart'],
    selectors: ['table', '[class*="comparison"]', '[class*="size-chart"]', '[class*="spec"]'],
    htmlHints: ['size chart', 'comparison', 'specification'],
  },
];

function normalizeStatus(value, fallbackStatus = 'missing') {
  if (value === 'present' || value === 'missing') {
    return value;
  }

  return fallbackStatus;
}

export function normalizeAuditPrompt(value) {
  if (typeof value !== 'string') {
    return DEFAULT_AUDIT_PROMPT;
  }

  const trimmedValue = value.trim();
  return trimmedValue || DEFAULT_AUDIT_PROMPT;
}

export function clampAuditScore(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

export function normalizeAuditSummary(value, fallbackValue = '') {
  const rawValue = typeof value === 'string' ? value.replace(/\r/g, '').trim() : '';
  const safeFallback = typeof fallbackValue === 'string' ? fallbackValue.trim() : '';
  const candidate = rawValue || safeFallback;

  if (!candidate) {
    return 'Lead with stronger proof and reassurance.\nReduce buyer friction around trust, delivery, and risk.';
  }

  const directLines = candidate
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (directLines.length >= 2) {
    return directLines.slice(0, 2).join('\n');
  }

  const sentenceLines = candidate
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (sentenceLines.length >= 2) {
    return sentenceLines.slice(0, 2).join('\n');
  }

  return candidate;
}

export function normalizeAuditChecklist(checklist, fallbackChecklist = []) {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    return fallbackChecklist;
  }

  return AUDIT_CHECKS.map((check, index) => {
    const fallbackItem = fallbackChecklist[index] || {
      label: check.label,
      status: 'missing',
      evidence: 'No clear signal found.',
    };

    const matchedByLabel = checklist.find(
      (item) => typeof item?.label === 'string' && item.label.trim().toLowerCase() === check.label.toLowerCase()
    );
    const sourceItem = matchedByLabel || checklist[index] || fallbackItem;
    const evidence =
      typeof sourceItem?.evidence === 'string' && sourceItem.evidence.trim()
        ? sourceItem.evidence.trim()
        : fallbackItem.evidence;

    return {
      label: check.label,
      status: normalizeStatus(sourceItem?.status, fallbackItem.status),
      evidence,
    };
  });
}
