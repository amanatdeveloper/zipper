'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, CheckCircle2, Loader2, PlugZap, Save, Store } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  googleClientId: '',
  googleClientSecret: '',
  googleDeveloperToken: '',
  googleRefreshToken: '',
  googleCustomerId: '',
  googleLoginCustomerId: '',
  wooUrl: '',
  wooCk: '',
  wooCs: '',
};

const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'block text-sm font-medium text-slate-700 mb-2';

function TestResultRow({ label, result }) {
  const ok = Boolean(result?.ok);

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      {ok ? (
        <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
      ) : (
        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
      )}
      <div className="min-w-0">
        <div className={`text-sm font-bold ${ok ? 'text-green-900' : 'text-red-900'}`}>{label}</div>
        <div className={`text-xs mt-0.5 ${ok ? 'text-green-700' : 'text-red-700'}`}>{result?.message}</div>
        {!ok && result?.errorCode ? (
          <div className="text-[11px] font-mono text-slate-500 mt-1 break-all">{result.errorCode}</div>
        ) : null}
      </div>
    </div>
  );
}

function StoreSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const storeId = searchParams.get('storeId');

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState(null);

  const loadStore = useCallback(async (id) => {
    const res = await fetch(`/api/stores/${id}`, { cache: 'no-store' });
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || 'Unable to load store credentials');
    }

    setForm({ ...EMPTY_FORM, ...result.data });
    setResults(null);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    setError('');
    setNotice('');

    if (!storeId) {
      setForm(EMPTY_FORM);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    loadStore(storeId)
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load store credentials');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, status, storeId, router, loadStore]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setNotice('');
  };

  const handleTest = async () => {
    if (!storeId) return;

    setTesting(true);
    setError('');
    setNotice('');
    setResults(null);

    try {
      const res = await fetch(`/api/stores/${storeId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            wooUrl: form.wooUrl.trim(),
            wooCk: form.wooCk.trim(),
            wooCs: form.wooCs.trim(),
            googleClientId: form.googleClientId,
            googleClientSecret: form.googleClientSecret,
            googleDeveloperToken: form.googleDeveloperToken,
            googleRefreshToken: form.googleRefreshToken,
            googleCustomerId: form.googleCustomerId,
            googleLoginCustomerId: form.googleLoginCustomerId,
          },
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Connection test failed');

      setResults(result.data);
    } catch (err) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) return;

    setSaving(true);
    setError('');
    setNotice('');
    setResults(null);

    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          wooUrl: form.wooUrl.trim(),
          wooCk: form.wooCk.trim(),
          wooCs: form.wooCs.trim(),
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Unable to save credentials');

      setNotice('Credentials saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save credentials');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !form.name) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
          <Store size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Store Settings</h1>
          <p className="text-slate-600">
            Re-check and update this store&apos;s WooCommerce and Google Ads credentials.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {notice ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-green-700">{notice}</p>
        </div>
      ) : null}

      {!storeId ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-slate-600">
          No store found.{' '}
          <a href="/onboarding" className="text-blue-600 font-semibold">
            Connect your first store
          </a>
          .
        </div>
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Store</h2>
              <p className="text-xs text-slate-500 mt-1">
                Only super admins can rename a store or reassign it to another user.
              </p>
            </div>
            <div>
              <label className={labelClass}>Store Name</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                className={inputClass}
                required
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900">WooCommerce Credentials</h2>
            <div>
              <label className={labelClass}>WooCommerce Store URL</label>
              <input
                type="url"
                value={form.wooUrl}
                onChange={handleChange('wooUrl')}
                placeholder="https://your-store.com"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Consumer Key</label>
                <input
                  type="text"
                  value={form.wooCk}
                  onChange={handleChange('wooCk')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Consumer Secret</label>
                <input
                  type="text"
                  value={form.wooCs}
                  onChange={handleChange('wooCs')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900">Google Ads Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Google Client ID</label>
                <input
                  type="text"
                  value={form.googleClientId}
                  onChange={handleChange('googleClientId')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Google Client Secret</label>
                <input
                  type="text"
                  value={form.googleClientSecret}
                  onChange={handleChange('googleClientSecret')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Google Developer Token</label>
                <input
                  type="text"
                  value={form.googleDeveloperToken}
                  onChange={handleChange('googleDeveloperToken')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Google Refresh Token</label>
                <input
                  type="text"
                  value={form.googleRefreshToken}
                  onChange={handleChange('googleRefreshToken')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Google Customer ID</label>
                <input
                  type="text"
                  value={form.googleCustomerId}
                  onChange={handleChange('googleCustomerId')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Google Login Customer ID</label>
                <input
                  type="text"
                  value={form.googleLoginCustomerId}
                  onChange={handleChange('googleLoginCustomerId')}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              The refresh token is created by the Google Ads connection. If it stops working, reconnect
              Google Ads for this store.
            </p>
          </section>

          {results ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">Connection test</h2>
              <TestResultRow label="WooCommerce" result={results.woocommerce} />
              <TestResultRow label="Google Ads" result={results.googleAds} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {testing ? <Loader2 className="animate-spin" size={16} /> : <PlugZap size={16} />}
              {testing ? 'Testing...' : 'Test connection'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || testing || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save credentials'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function StoreSettingsPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}
    >
      <StoreSettingsContent />
    </Suspense>
  );
}
