'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession, signIn, useSession } from 'next-auth/react';
import { TrendingUp, UserPlus } from 'lucide-react';
import { getPostAuthRedirectPath } from '../../lib/post-auth-redirect.js';

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let isMounted = true;

    async function redirectAuthenticatedUser() {
      const targetPath = await getPostAuthRedirectPath(session?.user);

      if (isMounted) {
        window.location.replace(targetPath);
      }
    }

    redirectAuthenticatedUser();

    return () => {
      isMounted = false;
    };
  }, [session, status]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const registerResult = await registerRes.json();

      if (!registerRes.ok || !registerResult.success) {
        throw new Error(registerResult.error || 'Unable to create your account');
      }

      const signInResult = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (!signInResult?.ok) {
        throw new Error('Account created, but automatic sign-in failed. Please sign in manually.');
      }

      const activeSession = await getSession();
      const targetPath = await getPostAuthRedirectPath(activeSession?.user);
      window.location.assign(targetPath);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || 'Unable to create your account');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-200">
            <UserPlus size={14} />
            Start Your Store Workspace
          </div>
          <div className="mt-8 max-w-xl">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Launch your first tenant-ready growth dashboard.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Create your account, connect WooCommerce, add your Google Ads customer ID, and step straight into the onboarding flow.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              'Secure account creation with automatic sign-in',
              'Guided onboarding for your first connected store',
              'Store-specific navigation once onboarding is complete',
              'Built for self-serve SaaS growth teams',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">
                Scalefire<span className="text-orange-600">.io</span>
              </h2>
            </div>
            <p className="mt-3 text-sm text-slate-500">Create your STORE_USER account to begin onboarding.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="Amanat Ahmed"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="you@store.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
              Sign in
            </Link>
            {' | '}
            <Link href="/" className="font-semibold text-slate-600 hover:text-slate-900">
              Back to home
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
