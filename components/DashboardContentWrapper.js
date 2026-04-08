'use client';

import { usePathname } from 'next/navigation';

export default function DashboardContentWrapper({ children }) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding';

  return (
    <div className={isOnboarding ? 'flex-1' : 'ml-64 flex-1'}>
      {children}
    </div>
  );
}
