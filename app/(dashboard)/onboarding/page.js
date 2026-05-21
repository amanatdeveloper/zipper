'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Store, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const steps = [
  { id: 1, title: 'Store details', description: 'Name your store and select your e-commerce platform.' },
  { id: 2, title: 'Platform credentials', description: 'Add the necessary API keys or connect your e-commerce platform.' },
  { id: 3, title: 'Google Ads', description: 'Connect your Google Ads account for reporting and optimization.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [storeData, setStoreData] = useState({
    name: '',
    platform: 'woocommerce', // new: 'woocommerce' or 'shopify'
    wooUrl: '',
    wooCk: '',
    wooCs: '',
    shopifyShopDomain: '', // new
    googleCustomerId: '',
  });
  const [googleAccounts, setGoogleAccounts] = useState([]);
  const [googleRefreshToken, setGoogleRefreshToken] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isShopifyConnected, setIsShopifyConnected] = useState(false); // new
  const [linkedStoreCount, setLinkedStoreCount] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore form data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('onboarding_form_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setStoreData(parsed);
      }
    } catch (err) {
      console.error('Failed to restore form data:', err);
    }
    setIsHydrated(true);
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem('onboarding_form_data', JSON.stringify(storeData));
      } catch (err) {
        console.error('Failed to save form data:', err);
      }
    }
  }, [storeData, isHydrated]);

  const activeStep = useMemo(() => steps.find((item) => item.id === step) || steps[0], [step]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Handle Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const accountsParam = urlParams.get('google_accounts');
    const refreshTokenParam = urlParams.get('google_refresh_token');
    const errorParam = urlParams.get('error');
    const authSuccessParam = urlParams.get('auth_success');
    const shopifyConnectedParam = urlParams.get('shopify_connected'); // new

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (authSuccessParam) {
      setIsGoogleConnected(true);
      if (refreshTokenParam) {
        setGoogleRefreshToken(decodeURIComponent(refreshTokenParam));
      }

      if (accountsParam) {
        try {
          const accounts = JSON.parse(decodeURIComponent(accountsParam));
          if (Array.isArray(accounts) && accounts.length > 0) {
            setGoogleAccounts(accounts);
            if (accounts.length === 1) {
              setStoreData(prev => ({ ...prev, googleCustomerId: accounts[0].customerId }));
            }
          }
        } catch (err) {
          console.error('Failed to parse Google Ads accounts:', err);
        }
      }
      setStep(3); // Go to step 3
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // New: Handle Shopify OAuth callback
    if (shopifyConnectedParam === 'true') {
      setIsShopifyConnected(true);
      setStep(3); // Advance to next step after Shopify connection
      setSuccessMessage('Shopify store connected successfully! Redirecting to the next step...');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores?scope=linked', { cache: 'no-store' });
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setLinkedStoreCount(result.data.length);
          if (result.data.length > 0) {
            router.replace(`/dashboard?storeId=${result.data[0].id}`);
          }
        } else {
          setLinkedStoreCount(0);
        }
      } catch (err) {
        console.error(err);
        setLinkedStoreCount(0);
      }
    };

    if (status === 'authenticated') {
      fetchStores();
    }
  }, [status, router]);

  const canAdvance = useMemo(() => {
    if (step === 1) {
      return Boolean(storeData.name.trim() && storeData.platform);
    }
    if (step === 2) {
      if (storeData.platform === 'woocommerce') {
        return Boolean(storeData.wooCk.trim() && storeData.wooCs.trim());
      } else if (storeData.platform === 'shopify') {
        // For Shopify, we only need the shopifyShopDomain to initiate connection
        // The connection success will be handled by the callback and isShopifyConnected state
        return Boolean(storeData.shopifyShopDomain.trim() && isShopifyConnected);
      }
    }
    if (step === 3) {
      return Boolean(isGoogleConnected && storeData.googleCustomerId.trim());
    }
    return false;
  }, [step, storeData, isGoogleConnected, isShopifyConnected]);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeData.name,
          platform: storeData.platform, // new
          ...(storeData.platform === 'woocommerce' && {
            wooUrl: storeData.wooUrl,
            wooCk: storeData.wooCk,
            wooCs: storeData.wooCs,
          }),
          ...(storeData.platform === 'shopify' && {
            shopifyShopDomain: storeData.shopifyShopDomain,
            // shopifyAccessToken is handled server-side during OAuth callback
          }),
          googleCustomerId: storeData.googleCustomerId,
          googleRefreshToken,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not complete onboarding');
      }

      // Clear saved form data on successful onboarding
      try {
        localStorage.removeItem('onboarding_form_data');
      } catch (err) {
        console.error('Failed to clear form data:', err);
      }

      setSuccessMessage('Your store is connected. Redirecting to your dashboard…');
      window.location.assign(`/dashboard?storeId=${result.data.id}`);
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
                Complete the guided onboarding to connect WooCommerce and Google Ads for your first store. Once your first store is created, you'll be taken straight into the dashboard.
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

                  {/* New: Platform Selection */}
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
                  {!isGoogleConnected ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Connect your Google Ads account to enable tracking and optimization features.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.href = '/api/auth/google-ads/login'}
                        className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Connect Google Ads
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                      <p className="text-sm font-semibold text-green-900">
                        ✓ Google Ads Connected Successfully!
                      </p>
                      {googleAccounts.length > 0 && (
                        <p className="text-xs text-green-700">
                          Connected account: {googleAccounts[0].accountName} ({googleAccounts[0].customerId})
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
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

