import Image from "next/image";
import Link from "next/link";
import { ChevronDownIcon } from "./icons";

export default function Nav({ content }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/sclaefire-logo.png" alt="" width={35} height={35} className="rounded-sm" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            {content.logoText}
            <span className="text-orange-500">{content.logoSuffix}</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {content.links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {link.label}
              {link.hasDropdown && <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />}
            </Link>
          ))}
        </div>

        <Link
          href={content.cta.href}
          className="hidden md:inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          {content.cta.label}
        </Link>
      </nav>
    </header>
  );
}
