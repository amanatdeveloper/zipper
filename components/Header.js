'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Store, ChevronDown } from 'lucide-react';

const Header = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const storeId = searchParams.get('storeId');
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const selectedStore = stores.find((item) => item.id === storeId) || null;
  const isStoreScopedPage = ['/', '/inventory', '/optimization-logs'].includes(pathname);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    fetchStores();
  }, [session?.user?.id, pathname]);

  useEffect(() => {
    if (!isStoreScopedPage || storeId || stores.length === 0) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('storeId', stores[0].id);
    router.replace(`${pathname}?${params.toString()}`);
  }, [isStoreScopedPage, pathname, router, searchParams, storeId, stores]);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetch('/api/stores');
      const result = await res.json();
      if (result.success) {
        setStores(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleStoreChange = (event) => {
    const nextStoreId = event.target.value;
    if (!nextStoreId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('storeId', nextStoreId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname === '/inventory') return 'Inventory Manager';
    if (pathname === '/optimization-logs') return 'Optimization Logs';
    if (pathname === '/stores') return 'Store Settings';
    if (pathname === '/admin') return 'Super Admin';
    return 'Zipper Ads Engine';
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-4">
        {isStoreScopedPage ? (
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
            <Store className="text-slate-600" size={16} />
            <select
              value={storeId || ''}
              onChange={handleStoreChange}
              className="bg-transparent text-sm font-medium text-slate-900 outline-none min-w-[220px]"
            >
              {loadingStores && stores.length === 0 ? (
                <option value="">Loading stores...</option>
              ) : null}
              {!loadingStores && stores.length === 0 ? (
                <option value="">No stores available</option>
              ) : null}
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
            <Store className="text-slate-600" size={16} />
            <span className="text-sm font-medium text-slate-900">
              {selectedStore?.name || session?.user?.role || 'Workspace'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {selectedStore?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'S'}
            </span>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;
