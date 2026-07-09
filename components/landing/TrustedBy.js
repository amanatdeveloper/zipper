export default function TrustedBy({ content }) {
  return (
    <section className="bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-xs font-medium tracking-wide text-slate-500 mb-6">{content.label}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 grayscale opacity-70">
          {content.logos.map((logo) => (
            <span key={logo} className="text-lg font-bold text-slate-700 tracking-tight">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
