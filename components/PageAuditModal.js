'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, X, XCircle } from 'lucide-react';

function formatAuditDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreTone(score) {
  if (score >= 80) {
    return {
      stroke: '#16a34a',
      text: 'text-emerald-600',
      chip: 'bg-emerald-100 text-emerald-700',
      label: 'Strong',
    };
  }

  if (score >= 60) {
    return {
      stroke: '#2563eb',
      text: 'text-blue-600',
      chip: 'bg-blue-100 text-blue-700',
      label: 'Promising',
    };
  }

  if (score >= 40) {
    return {
      stroke: '#f59e0b',
      text: 'text-amber-600',
      chip: 'bg-amber-100 text-amber-700',
      label: 'Needs Work',
    };
  }

  return {
    stroke: '#dc2626',
    text: 'text-red-600',
    chip: 'bg-red-100 text-red-700',
    label: 'At Risk',
  };
}

function ScoreRing({ score }) {
  const size = 152;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const dashOffset = circumference - (safeScore / 100) * circumference;
  const tone = getScoreTone(safeScore);

  return (
    <div className="relative flex h-[152px] w-[152px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tone.stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-4xl font-black tracking-tight ${tone.text}`}>{safeScore}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Score</div>
      </div>
    </div>
  );
}

export default function PageAuditModal({ isOpen, product, storeId, onClose }) {
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !product?.productUrl || !storeId) {
      return undefined;
    }

    const abortController = new AbortController();

    const runAudit = async () => {
      setLoading(true);
      setError('');
      setAuditResult(null);

      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sku: product.sku,
            storeId,
            url: product.productUrl,
          }),
          signal: abortController.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Unable to audit this page right now.');
        }

        setAuditResult(result.data);
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return;
        }

        console.error(fetchError);
        setError(fetchError.message || 'Unable to audit this page right now.');
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    runAudit();

    return () => {
      abortController.abort();
    };
  }, [isOpen, product?.productUrl, product?.sku, refreshKey, storeId]);

  if (!isOpen || !product) {
    return null;
  }

  const tone = getScoreTone(auditResult?.score || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-200">AI Page Auditor</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {product.productName || product.sku}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                  SKU {product.sku}
                </span>
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-blue-200 underline underline-offset-4"
                >
                  {product.productUrl}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/15"
              aria-label="Close audit modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-40 items-center justify-center">
                  <RefreshCw className="animate-spin text-blue-600" size={42} />
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-slate-900">AI is scanning your page...</div>
                  <p className="mt-2 text-sm text-slate-500">
                    Checking reviews, media, trust, delivery clarity, and friction points.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 p-6">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 p-4">
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                      <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                      <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <ShieldAlert size={28} />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-900">Audit could not be completed</h3>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-slate-800"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}

          {!loading && !error && auditResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex justify-center">
                    <ScoreRing score={auditResult.score} />
                  </div>
                  <div className="mt-5 text-center">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] ${tone.chip}`}>
                      {tone.label}
                    </span>
                    <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      {auditResult.cached ? 'Recent audit reused' : 'Fresh audit generated'}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {formatAuditDate(auditResult.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-blue-600" size={18} />
                      <h3 className="text-lg font-black text-slate-900">Strategic Advice</h3>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                      {auditResult.summary}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">Checklist</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Green items are detected. Red items are likely missing or weak.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRefreshKey((current) => current + 1)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <RefreshCw size={14} />
                        Re-run
                      </button>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {auditResult.checklist.map((item) => {
                        const isPresent = item.status === 'present';

                        return (
                          <div
                            key={item.label}
                            className={`rounded-2xl border p-4 ${
                              isPresent ? 'border-emerald-200 bg-emerald-50/70' : 'border-red-200 bg-red-50/70'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {isPresent ? (
                                <CheckCircle2 className="mt-0.5 text-emerald-600" size={18} />
                              ) : (
                                <XCircle className="mt-0.5 text-red-600" size={18} />
                              )}
                              <div>
                                <div className="font-black text-slate-900">{item.label}</div>
                                <p className="mt-1 text-sm text-slate-600">{item.evidence}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
