import Nav from "../../../components/landing/Nav";
import Footer from "../../../components/landing/Footer";
import { landingContent } from "../../../content/landing-content";
import Link from "next/link"; // Add this line

export default function ProductPage() {
  return (
    <main className="bg-white">
      <Nav content={landingContent.nav} />
      <section className="max-w-7xl mx-auto py-16 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-6">Our Product</h1>
        <p className="text-lg text-slate-600 mb-8">
          Discover how our product can revolutionize your business. We offer a suite of features designed to help you succeed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Feature One</h2>
            <p className="text-slate-600">
              Description of feature one. Highlighting its benefits and how it solves a problem.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Feature Two</h2>
            <p className="text-slate-600">
              Description of feature two. Explaining its impact and advantages for users.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Feature Three</h2>
            <p className="text-slate-600">
              Description of feature three. Detailing its capabilities and value proposition.
            </p>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/start-free-trial"
            className="inline-flex items-center rounded-lg bg-orange-500 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>
      <Footer content={landingContent.footer} />
    </main>
  );
}
