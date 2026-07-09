import { CheckIcon, FlameIcon } from "./icons";

function NodePill({ label, align }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
      {label}
    </div>
  );
}

export default function PricingBand({ content }) {
  return (
    <section className="bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-6">
            {content.headline.map((line) => (
              <span key={line.text} className={`block ${line.accent ? "text-orange-500" : ""}`}>
                {line.text}
              </span>
            ))}
          </h2>
          <p className="text-slate-400 max-w-md mb-8">{content.subtext}</p>
          <ul className="space-y-3">
            {content.checklist.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-200">
                <CheckIcon className="w-4 h-4 text-orange-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="space-y-3">
            {content.inputs.map((label) => (
              <NodePill key={label} label={label} />
            ))}
          </div>

          <div className="w-16 h-16 rounded-full bg-slate-900 border border-orange-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(251,146,60,0.35)]">
            <FlameIcon className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            {content.outputs.map((label) => (
              <NodePill key={label} label={label} align="right" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
