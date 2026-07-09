import { StarIcon } from "./icons";

export default function Testimonials({ content }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-wide text-orange-500 uppercase mb-3">
        {content.eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">{content.title}</h2>
      <p className="text-slate-600 max-w-xl mx-auto mb-14">{content.subtitle}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {content.items.map((item) => (
          <div key={item.name} className="rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex gap-0.5 text-orange-500 mb-4">
              {Array.from({ length: item.rating }).map((_, i) => (
                <StarIcon key={i} />
              ))}
            </div>
            <p className="text-sm text-slate-700 mb-6">&ldquo;{item.quote}&rdquo;</p>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-slate-200 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
