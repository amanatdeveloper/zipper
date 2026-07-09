import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "./icons";

// Turns an array of { x, revenue, profit } points into SVG path strings,
// scaled to fit inside the given width/height.
function buildLinePaths(points, width, height, padding = 8) {
  const values = points.flatMap((p) => [p.revenue, p.profit]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  const toXY = (value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y];
  };

  const toPath = (key) =>
    points
      .map((p, i) => {
        const [x, y] = toXY(p[key], i);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return {
    revenuePath: toPath("revenue"),
    profitPath: toPath("profit"),
  };
}

function DashboardPreview({ data }) {
  const width = 460;
  const height = 160;
  const { revenuePath, profitPath } = buildLinePaths(data.chart.points, width, height);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{data.title}</h3>
        <span className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1">
          {data.rangeLabel}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {data.stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500 mb-1">{stat.label}</p>
            <p className="text-sm font-bold text-slate-900">{stat.value}</p>
            <p className={`text-[11px] font-medium ${stat.positive ? "text-emerald-600" : "text-red-500"}`}>
              {stat.positive ? "↑" : "↓"} {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-100 p-3 mb-4">
        <div className="flex items-center gap-4 mb-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: data.chart.seriesA.color }}
            />
            {data.chart.seriesA.label}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: data.chart.seriesB.color }}
            />
            {data.chart.seriesB.label}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <path d={revenuePath} fill="none" stroke={data.chart.seriesA.color} strokeWidth="2" />
          <path d={profitPath} fill="none" stroke={data.chart.seriesB.color} strokeWidth="2" />
        </svg>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          {data.chart.points.map((p) => (
            <span key={p.x}>{p.x}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-700">{data.recommendationsLabel}</h4>
        <button type="button" className="text-[11px] font-medium text-slate-500 hover:text-slate-700">
          {data.recommendationsCta}
        </button>
      </div>

      <div className="space-y-2">
        {data.recommendations.map((rec) => (
          <div
            key={rec.name}
            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-md bg-slate-100 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{rec.name}</p>
                <p className="text-[11px] text-slate-500">{rec.action}</p>
              </div>
            </div>
            <div className="hidden sm:block text-right px-2">
              <p className="text-xs font-medium text-emerald-600">{rec.impact}</p>
            </div>
            <div className="hidden md:flex items-center gap-1 w-20">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${rec.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">{rec.confidence}%</span>
            </div>
            <button
              type="button"
              className="text-[11px] font-semibold text-orange-600 border border-orange-200 rounded-md px-2.5 py-1 hover:bg-orange-50 shrink-0"
            >
              {rec.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero({ content }) {
  return (
    <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {content.headline.map((line) => (
            <span key={line.text} className={`block ${line.accent ? "text-orange-500" : ""}`}>
              {line.text}
            </span>
          ))}
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-md">{content.subtext}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={content.primaryCta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            {content.primaryCta.label}
            <ArrowRightIcon />
          </Link>
          <Link
            href={content.secondaryCta.href}
            className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:border-slate-400 transition-colors"
          >
            {content.secondaryCta.label}
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          {content.reassurance.map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-sm text-slate-500">
              <CheckIcon className="w-4 h-4 text-emerald-500" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <DashboardPreview data={content.dashboardPreview} />
    </section>
  );
}
