import Nav from "../../../components/landing/Nav";
import Footer from "../../../components/landing/Footer";
import { landingContent } from "../../../content/landing-content";
import Link from "next/link";

export default function SolutionPage() {
  return (
    <main className="bg-white">
      <Nav content={landingContent.nav} />
      <section className="max-w-7xl mx-auto py-16 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-6">Our Solutions</h1>
        <p className="text-lg text-slate-600 mb-8">
          We provide tailored solutions to meet your unique business challenges. Explore our offerings below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Solution A: E-commerce Optimization</h2>
            <p className="text-slate-600">
              Optimize your online store for maximum conversions and customer satisfaction with our advanced e-commerce tools.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Solution B: Marketing Automation</h2>
            <p className="text-slate-600">
              Automate your marketing efforts to reach a wider audience and engage with your customers effectively.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Solution C: Data Analytics</h2>
            <p className="text-slate-600">
              Gain actionable insights from your data to make informed decisions and drive business growth.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Solution D: Inventory Management</h2>
            <p className="text-slate-600">
              Streamline your inventory processes, reduce costs, and ensure products are always in stock.
            </p>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/start-free-trial"
            className="inline-flex items-center rounded-lg bg-orange-500 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Get a Custom Solution
          </Link>
        </div>
      </section>
      <Footer content={landingContent.footer} />
    </main>
  );
}
