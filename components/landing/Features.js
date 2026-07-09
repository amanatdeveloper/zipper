import { FEATURE_ICON_MAP } from "./icons";

export default function Features({ content }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-wide text-orange-500 uppercase mb-3">
        {content.eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">{content.title}</h2>
      <p className="text-slate-600 max-w-2xl mx-auto mb-14">{content.subtitle}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
        {content.items.map((item) => {
          const Icon = FEATURE_ICON_MAP[item.icon];
          return (
            <div key={item.title}>
              <div className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
                {Icon && <Icon />}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
