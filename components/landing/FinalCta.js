import Link from "next/link";
import { CheckIcon, ArrowRightIcon } from "./icons";

export default function FinalCta({ content }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="rounded-2xl bg-slate-950 text-white grid lg:grid-cols-2 gap-10 items-center p-10 lg:p-14 overflow-hidden">
        <div>
          <h2 className="text-3xl font-extrabold mb-3">{content.title}</h2>
          <p className="text-slate-400 mb-6">{content.subtitle}</p>
          <ul className="space-y-2 mb-8">
            {content.checklist.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-200">
                <CheckIcon className="w-4 h-4 text-orange-500" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={content.cta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            {content.cta.label}
            <ArrowRightIcon />
          </Link>
        </div>

        <div className="relative">
          <div className="rounded-xl bg-white text-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-700">{content.card.title}</p>
              <span className="text-xs font-medium text-emerald-600">↑ {content.card.change}</span>
            </div>
            <svg viewBox="0 0 300 90" className="w-full h-auto">
              <polyline
                points="0,60 30,50 60,55 90,35 120,45 150,25 180,32 210,15 240,22 270,8 300,18"
                fill="none"
                stroke="#FB6514"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          <div className="absolute -bottom-4 left-4 sm:left-0 bg-white text-slate-900 rounded-lg p-3 shadow-lg text-xs w-32">
            <p className="text-slate-500 mb-1">{content.card.totalProfitLabel}</p>
            <p className="font-bold text-sm">{content.card.totalProfitValue}</p>
            <p className="text-emerald-600">↑ {content.card.totalProfitChange}</p>
          </div>

          <div className="absolute -bottom-4 right-4 sm:-right-2 bg-white text-slate-900 rounded-lg p-3 shadow-lg text-xs w-28">
            <p className="text-slate-500 mb-1">{content.card.roasLabel}</p>
            <p className="font-bold text-sm">{content.card.roasValue}</p>
            <p className="text-emerald-600">↑ {content.card.roasChange}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
