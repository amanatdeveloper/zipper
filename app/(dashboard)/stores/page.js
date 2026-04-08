'use client';
export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function StoresRedirectContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.user.role === 'SUPER_ADMIN') {
      router.replace('/admin');
      return;
    }

    router.replace('/dashboard');
  }, [router, session, status]);

  return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting...</div>;
}

export default function StoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <StoresRedirectContent />
    </Suspense>
  );
}
