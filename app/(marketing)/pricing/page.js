import Nav from "../../../components/landing/Nav";
import Footer from "../../../components/landing/Footer";
import { landingContent } from "../../../content/landing-content";
import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="bg-white">
      <Nav content={landingContent.nav} />
      <section className="max-w-7xl mx-auto py-16 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-6 text-center">Our Flexible Pricing</h1>
        <p className="text-lg text-slate-600 mb-12 text-center max-w-2xl mx-auto">
          Choose the plan that best fits your needs. All plans include essential features and dedicated support.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Basic Plan */}
          <div className="bg-slate-50 p-8 rounded-lg shadow flex flex-col items-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Basic</h2>
            <p className="text-slate-600 mb-6 text-center">
              Perfect for individuals and small teams getting started.
            </p>
            <p className="text-5xl font-bold text-slate-900 mb-2">$29<span className="text-xl font-medium text-slate-500">/month</span></p>
            <ul className="text-slate-700 space-y-2 mb-8 text-center">
              <li>✓ 5 Users</li>
              <li>✓ 100 GB Storage</li>
              <li>✓ Basic Analytics</li>
              <li>✓ Email Support</li>
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors mt-auto"
            >
              Choose Basic
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-white p-8 rounded-lg shadow-lg ring-2 ring-orange-500 flex flex-col items-center transform scale-105">
            <h2 className="text-2xl font-bold text-orange-500 mb-4">Pro</h2>
            <p className="text-slate-700 mb-6 text-center">
              Ideal for growing businesses requiring more power and features.
            </p>
            <p className="text-5xl font-bold text-slate-900 mb-2">$79<span className="text-xl font-medium text-slate-500">/month</span></p>
            <ul className="text-slate-700 space-y-2 mb-8 text-center">
              <li>✓ 20 Users</li>
              <li>✓ 500 GB Storage</li>
              <li>✓ Advanced Analytics</li>
              <li>✓ Priority Support</li>
              <li>✓ Custom Integrations</li>
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors mt-auto"
            >
              Choose Pro
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-slate-50 p-8 rounded-lg shadow flex flex-col items-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Enterprise</h2>
            <p className="text-slate-600 mb-6 text-center">
              For large organizations needing custom solutions and dedicated service.
            </p>
            <p className="text-5xl font-bold text-slate-900 mb-2">$199<span className="text-xl font-medium text-slate-500">/month</span></p>
            <ul className="text-slate-700 space-y-2 mb-8 text-center">
              <li>✓ Unlimited Users</li>
              <li>✓ Unlimited Storage</li>
              <li>✓ Custom Analytics</li>
              <li>✓ 24/7 Phone Support</li>
              <li>✓ Dedicated Account Manager</li>
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors mt-auto"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
      <Footer content={landingContent.footer} />
    </main>
  );
}
