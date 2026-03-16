'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Store, ChevronDown } from 'lucide-react';

const Header = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const storeId = searchParams.get('storeId');
  const [store, setStore] = useState(null);

  useEffect(() => {
    if (storeId) {
      fetchStore(storeId);
    }
  }, [storeId]);

  const fetchStore = async (storeId) => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const result = await res.json();
      if (result.success) {
        setStore(result.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname === '/inventory') return 'Inventory Manager';
    if (pathname === '/stores') return 'Store Settings';
    return 'Zipper Ads Engine';
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
          <Store className="text-slate-600" size={16} />
          <span className="text-sm font-medium text-slate-900">
            {store ? store.name : 'Loading...'}
          </span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {store?.name?.charAt(0)?.toUpperCase() || 'S'}
            </span>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;