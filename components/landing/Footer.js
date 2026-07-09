import Image from "next/image";
import Link from "next/link";

export default function Footer({ content }) {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="max-w-6xl mx-auto px-6 py-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Image src="/sclaefire-logo.png" alt="" width={35} height={35} className="rounded-sm" />
            <span className="text-base font-bold text-white">
              {content.logoText}
              <span className="text-orange-500">{content.logoSuffix}</span>
            </span>
          </div>
          <p className="text-sm max-w-xs">{content.description}</p>
        </div>

        {content.columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-white mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>{content.legal.copyright}</span>
          <div className="flex gap-4">
            {content.legal.links.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
