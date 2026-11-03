'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, Store } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatCustomerId } from '../../../lib/customer-id.js';

const steps = [
  { id: 1, title: 'Store details', description: 'Name your store and select your e-commerce platform.' },
  { id: 2, title: 'Platform credentials', description: 'Add the necessary API keys or connect your e-commerce platform.' },
  { id: 3, title: 'Google Ads', description: 'Connect your Google Ads account for reporting and optimization.' },
];

const EMPTY_STORE_DATA = {
  name: '',
  platform: 'woocommerce',
  wooUrl: '',
  wooCk: '',
  wooCs: '',
  shopifyShopDomain: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [storeData, setStoreData] = useState(EMPTY_STORE_DATA);
  const [onboardingId, setOnboardingId] = useState('');
  const [googleStatus, setGoogleStatus] = useState('disconnected');
  const [googleAccounts, setGoogleAccounts] = useState([]);
  const [googleError, setGoogleError] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isShopifyConnected, setIsShopifyConnected] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/pending', { cache: 'no-store' });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not load onboarding progress');
      }

      const data = result.data;
      if (!data) return;

      setOnboardingId(data.onboardingId || '');
      setStoreData({ ...EMPTY_STORE_DATA, ...data.storeData });
      setStep([1, 2, 3].includes(data.step) ? data.step : 1);
      setGoogleAccounts(Array.isArray(data.googleAccounts) ? data.googleAccounts : []);
      setGoogleStatus(data.googleStatus === 'connected' ? 'connected' : 'disconnected');
      setGoogleError(data.googleError || '');
      setSelectedCustomerId(data.selectedCustomerId || '');
      setIsShopifyConnected(Boolean(data.shopifyConnected));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const savePending = useCallback(async (data, nextStep) => {
    const res = await fetch('/api/onboarding/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, step: nextStep }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Could not save onboarding progress');
    }

    if (result.data?.onboardingId) {
      setOnboardingId(result.data.onboardingId);
    }

    return result.data;
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores?scope=linked', { cache: 'no-store' });
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          router.replace(`/dashboard?storeId=${result.data[0].id}`);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (status === 'authenticated') {
      fetchStores();
    }
  }, [status, router]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleAuthParam = urlParams.get('google_auth');
    const googleErrorParam = urlParams.get('google_error');
    const shopifyConnectedParam = urlParams.get('shopify_connected');
    const hasParams = Boolean(googleAuthParam || googleErrorParam || shopifyConnectedParam);

    if (hasParams) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadPending().finally(() => {
      if (googleErrorParam) {
        setError(googleErrorParam);
        setGoogleError(googleErrorParam);
        setStep(3);
      }

      if (googleAuthParam === 'complete') {
        setStep(3);
      }

      if (shopifyConnectedParam === 'true') {
        setIsShopifyConnected(true);
        setStep(3);
      }
    });
  }, [loadPending]);

  const eligibleAccounts = useMemo(
    () => googleAccounts.filter((account) => !account?.manager),
    [googleAccounts]
  );

  useEffect(() => {
    if (googleStatus !== 'connected') {
      return;
    }

    if (eligibleAccounts.length === 1) {
      setSelectedCustomerId((current) =>
        current === eligibleAccounts[0].customerId ? current : eligibleAccounts[0].customerId
      );
      return;
    }

    if (!eligibleAccounts.some((account) => account.customerId === selectedCustomerId)) {
      setSelectedCustomerId('');
    }
  }, [googleStatus, eligibleAccounts, selectedCustomerId]);

  const activeStep = useMemo(() => steps.find((item) => item.id === step) || steps[0], [step]);

  const canAdvance = useMemo(() => {
    if (step === 1) {
      return Boolean(storeData.name.trim() && storeData.platform);
    }
    if (step === 2) {
      if (storeData.platform === 'woocommerce') {
        return Boolean(storeData.wooCk.trim() && storeData.wooCs.trim());
      }
      if (storeData.platform === 'shopify') {
        return Boolean(storeData.shopifyShopDomain.trim() && isShopifyConnected);
      }
    }
    if (step === 3) {
      return Boolean(googleStatus === 'connected' && selectedCustomerId);
    }
    return false;
  }, [step, storeData, isShopifyConnected, googleStatus, selectedCustomerId]);

  const handleChange = (field) => (event) => {
    setStoreData((current) => ({ ...current, [field]: event.target.value }));
  };

  const normalizeShopifyDomain = (value) => {
    if (!value) return '';
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:?\/\//, '')
      .replace(/\/.*$/, '');
  };

  const goToStep = async (nextStep) => {
    setError('');
    try {
      await savePending(storeData, nextStep);
      setStep(nextStep);
    } catch (err) {
      setError(err.message || 'Could not save your details. Please try again.');
    }
  };

  const handleConnectGoogle = async () => {
    setError('');
    setGoogleError('');
    try {
      await savePending(storeData, 3);
      window.location.href = '/api/auth/google-ads/login';
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in. Please try again.');
    }
  };

  const handleRetryGoogle = async () => {
    setError('');
    setGoogleError('');
    setRetrying(true);

    try {
      const res = await fetch('/api/onboarding/pending/discover', { method: 'POST' });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not load Google Ads accounts');
      }

      const accounts = Array.isArray(result.data?.googleAccounts) ? result.data.googleAccounts : [];
      setGoogleAccounts(accounts);
      setGoogleStatus('connected');
      setGoogleError('');
    } catch (err) {
      const message = err.message || 'Could not load Google Ads accounts';
      setGoogleError(message);
      setError(message);
    } finally {
      setRetrying(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (step < 3) {
      await goToStep(step + 1);
      return;
    }

    if (!onboardingId) {
      setError('Your onboarding session expired. Please reconnect your Google Ads account.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingId,
          selectedCustomerId,
          name: storeData.name,
          platform: storeData.platform,
          ...(storeData.platform === 'woocommerce' && {
            wooUrl: storeData.wooUrl,
            wooCk: storeData.wooCk,
            wooCs: storeData.wooCs,
          }),
          ...(storeData.platform === 'shopify' && {
            shopifyShopDomain: storeData.shopifyShopDomain,
          }),
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not complete onboarding');
      }

      setSuccessMessage('Google Ads connected successfully');
      window.setTimeout(() => {
        window.location.assign(`/dashboard?storeId=${result.data.id}`);
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to complete onboarding. Please check your details and try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl border border-slate-200">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                  <Store size={16} />
                  Store Onboarding
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">Connect your first store</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Complete the guided onboarding to connect WooCommerce and Google Ads for your first store. Once your first store is created, you&apos;ll be taken straight into the dashboard.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-900 px-5 py-4 text-sm text-slate-100 shadow-lg">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-400">Step {step} of 3</p>
                <p className="mt-2 text-base font-bold">{activeStep.title}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_2fr]">
              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                {steps.map((item) => (
                  <div key={item.id} className={`rounded-3xl border p-4 ${item.id === step ? 'border-blue-500 bg-white shadow-sm' : 'border-transparent bg-transparent'}`}>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Step {item.id}</p>
                    <p className="mt-2 font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                {step === 1 && (
                  <>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Store Name</span>
                      <input
                        value={storeData.name}
                        onChange={handleChange('name')}
                        placeholder="E.g. Brighton Bikes"
                        className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">E-commerce Platform</span>
                      <select
                        value={storeData.platform}
                        onChange={handleChange('platform')}
                        className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        <option value="woocommerce">WooCommerce</option>
                        <option value="shopify">Shopify</option>
                      </select>
                    </label>

                    {storeData.platform === 'woocommerce' && (
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">WooCommerce Store URL</span>
                        <input
                          value={storeData.wooUrl}
                          onChange={handleChange('wooUrl')}
                          type="url"
                          placeholder="https://your-store.com"
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          required
                        />
                      </label>
                    )}

                    {storeData.platform === 'shopify' && (
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Shopify Store Domain</span>
                        <input
                          value={storeData.shopifyShopDomain}
                          onChange={handleChange('shopifyShopDomain')}
                          type="text"
                          inputMode="url"
                          autoCapitalize="none"
                          placeholder="your-store.myshopify.com"
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          required
                        />
                      </label>
                    )}
                  </>
                )}

                {step === 2 && (
                  <>
                    {storeData.platform === 'woocommerce' && (
                      <>
                        <label className="block">
                          <span className="text-sm font-semibold text-slate-700">WooCommerce API Key</span>
                          <input
                            value={storeData.wooCk}
                            onChange={handleChange('wooCk')}
                            placeholder="Consumer Key"
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-semibold text-slate-700">WooCommerce API Secret</span>
                          <input
                            value={storeData.wooCs}
                            onChange={handleChange('wooCs')}
                            placeholder="Consumer Secret"
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </label>
                      </>
                    )}

                    {storeData.platform === 'shopify' && (
                      <div className="space-y-4">
                        {!isShopifyConnected ? (
                          <>
                            <p className="text-sm text-slate-600">
                              Connect your Shopify store by clicking the button below. You will be redirected to Shopify to authorize the connection.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const shopDomain = normalizeShopifyDomain(storeData.shopifyShopDomain);
                                if (shopDomain) {
                                  setStoreData((current) => ({ ...current, shopifyShopDomain: shopDomain }));
                                  window.location.href = `/api/auth/shopify/login?shop=${encodeURIComponent(shopDomain)}`;
                                } else {
                                  setError('Please enter your Shopify store domain (e.g. your-store.myshopify.com).');
                                }
                              }}
                              className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              Connect Shopify Store
                            </button>
                          </>
                        ) : (
                          <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                            <p className="text-sm font-semibold text-green-900">
                              ✓ Shopify Store Connected Successfully!
                            </p>
                            <p className="text-xs text-green-700">
                              Shop domain: {storeData.shopifyShopDomain}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    {googleStatus !== 'connected' ? (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                          Connect your Google Ads account to enable tracking and optimization features.
                        </p>
                        <button
                          type="button"
                          onClick={handleConnectGoogle}
                          className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          Connect Google Ads
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-sm font-semibold text-blue-900">
                            Google sign-in complete. Confirm your Google Ads account.
                          </p>
                        </div>

                        {googleError ? (
                          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-semibold text-red-900">{googleError}</p>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={handleRetryGoogle}
                                disabled={retrying}
                                className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {retrying ? 'Retrying...' : 'Retry'}
                              </button>
                              <button
                                type="button"
                                onClick={handleConnectGoogle}
                                className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Connect another Google account
                              </button>
                            </div>
                          </div>
                        ) : eligibleAccounts.length === 0 ? (
                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm text-slate-700">
                              No eligible Google Ads advertising accounts were found for this Google account.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={handleRetryGoogle}
                                disabled={retrying}
                                className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {retrying ? 'Retrying...' : 'Retry'}
                              </button>
                              <button
                                type="button"
                                onClick={handleConnectGoogle}
                                className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Connect another Google account
                              </button>
                            </div>
                          </div>
                        ) : eligibleAccounts.length === 1 ? (
                          <div className="space-y-1 rounded-2xl border border-green-200 bg-green-50 p-4">
                            <p className="text-sm font-semibold text-green-900">
                              {eligibleAccounts[0].descriptiveName || 'Google Ads account'}
                            </p>
                            <p className="text-xs text-green-700">
                              Customer ID: {formatCustomerId(eligibleAccounts[0].customerId)}
                            </p>
                          </div>
                        ) : (
                          <label className="block">
                            <span className="text-sm font-semibold text-slate-700">Select your Google Ads account</span>
                            <select
                              value={selectedCustomerId}
                              onChange={(event) => setSelectedCustomerId(event.target.value)}
                              className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            >
                              <option value="">Select an account</option>
                              {eligibleAccounts.map((account) => (
                                <option key={account.customerId} value={account.customerId}>
                                  {account.descriptiveName || 'Google Ads account'} ({formatCustomerId(account.customerId)})
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => goToStep(step - 1)}
                    disabled={step === 1}
                    className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition ${step === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={!canAdvance || loading}
                    className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition ${!canAdvance || loading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="ml-2">Processing...</span>
                      </div>
                    ) : (
                      step === 3 ? (
                        <>
                          <CheckCircle2 size={16} className="mr-2" />
                          Complete Setup
                        </>
                      ) : (
                        'Next'
                      )
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Error and success messages */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-3xl border border-red-200 bg-red-50 px-6 py-4 shadow-lg">
          <p className="text-sm font-semibold text-red-900">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-3xl border border-green-200 bg-green-50 px-6 py-4 shadow-lg">
          <p className="text-sm font-semibold text-green-900">{successMessage}</p>
        </div>
      )}
    </>
  );
}
