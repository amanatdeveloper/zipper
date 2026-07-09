import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Code, ShieldCheck } from 'lucide-react'
import { authOptions } from '../../lib/auth-options.js'
import Header from '../../components/Header.js'
import Sidebar from '../../components/Sidebar.js'
import DashboardContentWrapper from '../../components/DashboardContentWrapper.js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <Suspense fallback={<div className="flex h-screen w-64 items-center justify-center border-r border-slate-800 bg-slate-900 text-white">Loading...</div>}>
          <Sidebar sessionUser={session.user} />
        </Suspense>
        <DashboardContentWrapper>
          <Suspense fallback={<div className="flex h-16 items-center border-b border-slate-200 bg-white px-6">Loading...</div>}>
            <Header sessionUser={session.user} />
          </Suspense>
          <main className="min-h-screen bg-slate-50 pb-16 pt-16">{children}</main>
        </DashboardContentWrapper>
      </div>

      <footer className="fixed bottom-0 left-64 right-0 z-40 flex justify-between border-t border-slate-800 bg-slate-900 p-4 px-8 text-[9px] font-black uppercase tracking-[0.2em]">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-500">
            <ShieldCheck size={12} />
            System Live
          </span>
          <span className="border-l border-slate-800 pl-6 text-slate-500">Scalefire Dashboard &copy; 2026</span>
        </div>
        <div className="flex items-center gap-2">
          <Code size={12} className="text-blue-500" />
          <span className="text-slate-500">
            Built by <span className="text-white">Amanat Developers</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
