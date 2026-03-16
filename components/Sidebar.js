'use client';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Package, Brain, Settings, LogOut, User } from 'lucide-react';

const Sidebar = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');

  const menuItems = [
    { name: 'Dashboard', href: `/?storeId=${storeId}`, icon: BarChart3 },
    { name: 'Inventory Manager', href: `/inventory?storeId=${storeId}`, icon: Package },
    { name: 'AI Auditor', href: '#', icon: Brain, disabled: true },
    { name: 'Settings', href: '/stores', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 z-50 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">Zipper Ads Engine</h1>
        <p className="text-sm text-slate-400">Phase 2</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <a
                href={item.disabled ? '#' : item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.href.split('?')[0] && !item.disabled
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <div>
            <p className="text-sm font-medium">{session?.user?.email}</p>
            <p className="text-xs text-slate-400">Logged in</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;