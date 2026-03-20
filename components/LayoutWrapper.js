'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Code, ShieldCheck } from 'lucide-react';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAuthPage = pathname === '/login';
  const isStoreUser = session?.user?.role === 'STORE_USER';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Suspense fallback={<div className="w-64 bg-slate-900 border-r border-slate-800 flex items-center justify-center">Loading...</div>}>
          <Sidebar userRole={session?.user?.role} />
        </Suspense>
        <div className="flex-1 ml-64">
          <Suspense fallback={<div className="h-16 bg-white border-b border-slate-200 flex items-center px-6">Loading...</div>}>
            <Header />
          </Suspense>
          <main className="pt-16 min-h-screen bg-slate-50 pb-16">
            {children}
          </main>
        </div>
      </div>
      
      {/* Global Footer */}
      <footer className={`fixed bottom-0 right-0 left-0 bg-slate-900 border-t border-slate-800 p-4 flex justify-between px-8 text-[9px] font-black uppercase tracking-[0.2em] z-40 ${isStoreUser ? 'ml-64' : 'ml-64'}`}>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-500"><ShieldCheck size={12}/> System Live</span>
          <span className="text-slate-500 border-l border-slate-800 pl-6">Zipper Dashboard &copy; 2026</span>
        </div>
        <div className="flex items-center gap-2">
          <Code size={12} className="text-blue-500"/>
          <span className="text-slate-500">Built by <span className="text-white">Amanat Developers</span></span>
        </div>
      </footer>
    </div>
  );
}
