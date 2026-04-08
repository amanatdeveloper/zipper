'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Store, Zap } from 'lucide-react';

const steps = [
  { id: 1, title: 'Store details', description: 'Name your store and enter your WooCommerce site URL.' },
  { id: 2, title: 'WooCommerce credentials', description: 'Add the API key and secret that your store will use.' },
  { id: 3, title: 'Google Ads', description: 'Provide the Google Ads customer ID for reporting and optimization.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [storeData, setStoreData] = useState({
    name: '',
    wooUrl: '',
    wooCk: '',
    wooCs: '',
    googleCustomerId: '',
  });
  const [linkedStoreCount, setLinkedStoreCount] = useState(null);

  const activeStep = useMemo(() => steps.find((item) => item.id === step) || steps[0], [step]);

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
      return Boolean(storeData.name.trim() && storeData.wooUrl.trim());
    }
    if (step === 2) {
      return Boolean(storeData.wooCk.trim() && storeData.wooCs.trim());
    }
    if (step === 3) {
      return Boolean(storeData.googleCustomerId.trim());
    }
    return false;
  }, [step, storeData]);

  const handleChange = (field) => (event) => {
    setStoreData((current) => ({ ...current, [field]: event.target.value }));
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
          wooUrl: storeData.wooUrl,
          wooCk: storeData.wooCk,
          wooCs: storeData.wooCs,
          googleCustomerId: storeData.googleCustomerId,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not complete onboarding');
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
                </>
              )}

              {step === 2 && (
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

              {step === 3 && (
                <>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Google Ads Customer ID</span>
                    <input
                      value={storeData.googleCustomerId}
                      onChange={handleChange('googleCustomerId')}
                      placeholder="123-456-7890"
                      className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </label>
                  <p className="text-sm text-slate-500">
                    This ID helps Zipper connect your Google Ads account for reporting and recommendation workflows.
                  </p>
                </>
              )}

              {error ? <div className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              {successMessage ? <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <button
                  type="button"
                  onClick={() => setStep(Math.max(1, step - 1))}
                  disabled={step === 1 || loading}
                  className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={16} className="mr-2" /> Back
                </button>

                <button
                  type="submit"
                  disabled={!canAdvance || loading}
                  className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Connecting…' : step === 3 ? 'Finish Onboarding' : 'Continue'}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-blue-600 p-3 text-white">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Secure Setup</p>
                <p className="mt-1 text-sm text-slate-200">We store credentials securely and only use them for your connected store.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-blue-600 p-3 text-white">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Fast setup</p>
                <p className="mt-1 text-sm text-slate-200">Complete your first store onboarding in three easy steps.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-blue-600 p-3 text-white">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Ready to launch</p>
                <p className="mt-1 text-sm text-slate-200">Once connected, your dashboard will populate with store insights automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
