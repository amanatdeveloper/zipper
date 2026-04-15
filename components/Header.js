'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Store, ChevronDown } from 'lucide-react';

const Header = ({ sessionUser }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const storeId = searchParams.get('storeId');
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const selectedStore = stores.find((item) => item.id === storeId) || null;
  const isStoreScopedPage = ['/dashboard', '/inventory', '/optimization-logs'].includes(pathname);

  useEffect(() => {
    if (!sessionUser?.id) {
      return;
    }

    fetchStores();
  }, [pathname, sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id) {
      return;
    }

    const refreshOnFocus = () => {
      fetchStores();
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchStores();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [sessionUser?.id]);

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
      const res = await fetch('/api/stores?scope=linked', { cache: 'no-store' });
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
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/inventory') return 'Inventory Manager';
    if (pathname === '/optimization-logs') return 'Optimization Logs';
    if (pathname === '/onboarding') return 'Store Onboarding';
    if (pathname === '/stores') return 'Store Settings';
    if (pathname === '/admin') return 'Super Admin';
    return 'Zipper Ads Engine';
  };

  const isOnboarding = pathname === '/onboarding';

  return (
    <header className={`bg-white border-b border-slate-200 h-16 fixed top-0 ${isOnboarding ? 'left-0 right-0' : 'left-64 right-0'} z-40 flex items-center justify-between px-6 shadow-sm`}>
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
              {selectedStore?.name || sessionUser?.role || 'Workspace'}
            </span>
          </div>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
              {selectedStore?.name?.charAt(0)?.toUpperCase() || sessionUser?.email?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {profileMenuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <button
                type="button"
                onClick={async () => {
                  setProfileMenuOpen(false);
                  await signOut({ redirect: false });
                  router.push('/login');
                }}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
