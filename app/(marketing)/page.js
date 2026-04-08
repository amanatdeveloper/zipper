import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { ArrowRight, CheckCircle2, Cpu, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { authOptions } from '@/app/api/auth/[...nextauth]/route.js'

const features = [
  {
    icon: Cpu,
    title: 'Smart Inventory Sync',
    description: 'Turn off ads automatically when products are out of stock to prevent wasted spend.',
  },
  {
    icon: Sparkles,
    title: 'AI Page Auditor',
    description: 'Scan product pages for conversion optimization recommendations and action items.',
  },
  {
    icon: CheckCircle2,
    title: 'Profit Tracking',
    description: 'Calculate real profit after ad spend and cost of goods for every product.',
  },
]

export default async function MarketingPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-900 via-slate-950 to-transparent opacity-90" />
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 lg:px-10">
            <Link href="/" className="text-2xl font-black tracking-tight text-white">
              Zipper
            </Link>

            <nav className="hidden items-center gap-10 md:flex">
              <Link
                href="#features"
                className="group relative text-base font-semibold text-slate-200 transition hover:text-white"
              >
                Features
                <span className="absolute left-0 -bottom-1 h-0.5 w-0 rounded-full bg-indigo-400 transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link
                href="#pricing"
                className="group relative text-base font-semibold text-slate-200 transition hover:text-white"
              >
                Pricing
                <span className="absolute left-0 -bottom-1 h-0.5 w-0 rounded-full bg-indigo-400 transition-all duration-300 group-hover:w-full" />
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:brightness-110"
              >
                Get Started Free
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </header>

        <section className="relative mx-auto flex max-w-7xl flex-col gap-16 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 shadow-sm shadow-indigo-500/10">
              <TrendingUp size={18} className="text-indigo-300" />
              Premium ads intelligence for modern stores
            </div>

            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl">
                Stop Wasting Ad Spend. Synchronize Your Ads with Real-Time Inventory & AI Insights.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
                Zipper gives store owners a unified growth control center for WooCommerce and Shopify. Connect inventory, optimize campaigns, and protect margin with one intelligent platform.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:brightness-110"
              >
                Start Free Trial
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 px-8 py-4 text-base font-semibold text-slate-100 transition hover:border-slate-500"
              >
                View Pricing
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 px-6 py-6 shadow-2xl shadow-slate-900/30">
              <div className="mb-5 flex items-center justify-between rounded-3xl bg-slate-950/90 px-5 py-4 text-sm text-slate-400">
                <span>Live dashboard preview</span>
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">
                  Beta
                </span>
              </div>
              <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/50">
                <div className="mb-6 flex items-center justify-between rounded-3xl bg-slate-900/90 px-4 py-3 text-sm text-slate-400">
                  <span className="font-semibold text-slate-100">Zipper Analytics</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">Connected</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {['Growth', 'Impressions', 'Conversions', 'Profit'].map((item) => (
                    <div key={item} className="rounded-3xl bg-slate-900/90 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item}</p>
                      <p className="mt-3 text-2xl font-black text-white">{item === 'Profit' ? '£12.4k' : item === 'Growth' ? '+18%' : item === 'Impressions' ? '128k' : '1.9k'}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-44 rounded-[1.5rem] bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-5 text-slate-200">
                  <div className="h-full rounded-[1.25rem] border border-slate-700 bg-slate-950/70 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      Performance score
                    </div>
                    <div className="mt-6 flex items-end gap-3">
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-center text-3xl font-black leading-[5.5rem] text-white shadow-xl shadow-indigo-500/30">
                        91
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-300">Dashboard health</p>
                        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                          Auto-sync inventory, audit pages, and keep ads aligned with live stock levels.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden h-[720px] flex-1 rounded-[2.5rem] border border-slate-800 bg-slate-900/80 p-8 shadow-[0_35px_120px_-50px_rgba(15,23,42,0.9)] lg:block">
            <div className="absolute left-6 top-6 h-12 w-12 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-500/80 blur-2xl opacity-70" />
            <div className="absolute right-6 bottom-6 h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 blur-2xl opacity-50" />
            <div className="relative h-full rounded-[2rem] border border-slate-800 bg-slate-950 p-6">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300/80">Zipper</p>
                  <h2 className="mt-2 text-3xl font-black text-white">Campaign console</h2>
                </div>
                <span className="rounded-2xl bg-slate-800 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-400">Live</span>
              </div>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {['Active', 'Paused', 'Budget'].map((label, idx) => (
                    <div key={label} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {label === 'Active' ? '24' : label === 'Paused' ? '3' : '£4.2k'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Inventory sync status</span>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">Healthy</span>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Projected savings</p>
                    <p className="mt-3 text-2xl font-semibold text-white">£8.7k</p>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI recommendations</p>
                    <p className="mt-3 text-2xl font-semibold text-white">32</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[2rem] border border-slate-800/80 bg-slate-900/95 p-8 shadow-xl shadow-slate-950/40">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-300">
                <feature.icon size={28} />
              </div>
              <h3 className="text-2xl font-black text-white">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="flex flex-col gap-4 text-center sm:gap-6">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">Pricing plans</p>
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Pick the plan that matches your store growth.
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-400">
            Start for free and upgrade when you need unlimited products, AI auditing, and advanced ecommerce integrations.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/95 p-8 shadow-xl shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Free Tier</p>
            <h3 className="mt-4 text-3xl font-black text-white">Free</h3>
            <p className="mt-4 text-slate-400">Perfect for validating the product and connecting your first store.</p>
            <ul className="mt-8 space-y-4 text-slate-300">
              <li>5 Products</li>
              <li>Basic Dashboard</li>
              <li>Email support</li>
            </ul>
            <Link
              href="/register"
              className="mt-10 inline-flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Start Free
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-transparent bg-gradient-to-br from-indigo-500 via-slate-800 to-blue-600 p-1 shadow-xl shadow-slate-950/30">
            <div className="rounded-[1.75rem] bg-slate-950/95 p-8">
              <div className="mb-4 inline-flex items-center rounded-full bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200">
                Most Popular
              </div>
              <p className="text-sm uppercase tracking-[0.28em] text-indigo-300">Pro Tier</p>
              <h3 className="mt-4 text-3xl font-black text-white">Pro</h3>
              <p className="mt-4 text-slate-400">Unlimited products with AI auditing, WooCommerce + Shopify support, and priority service.</p>
              <ul className="mt-8 space-y-4 text-slate-300">
                <li>Unlimited Products</li>
                <li>AI Page Auditor</li>
                <li>Shopify & WooCommerce support</li>
                <li>Priority Support</li>
              </ul>
              <Link
                href="/register"
                className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:brightness-110"
              >
                Start Pro Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 bg-slate-950/95 px-6 py-10 text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </div>
          <p>Powered by Amanat Developers</p>
        </div>
      </footer>
    </main>
  )
}
