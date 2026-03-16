'use client';
export const revalidate = 0;

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, ExternalLink, Package } from 'lucide-react';

function InventoryContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    const storeId = searchParams.get('storeId');
    if (!storeId) {
      router.push('/stores');
      return;
    }

    fetchStore(storeId);
    fetchProducts(storeId);
  }, [session, status, router, searchParams]);

  const fetchStore = async (storeId) => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const result = await res.json();
      if (result.success) {
        setStore(result.data);
      } else {
        router.push('/stores');
      }
    } catch (e) {
      console.error(e);
      router.push('/stores');
    }
  };

  const fetchProducts = async (storeId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?storeId=${storeId}`);
      const result = await res.json();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStockBadge = (product) => {
    if (product.stock_status === 'outofstock' || product.stock_quantity === 0) {
      return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Out of Stock</span>;
    } else if (product.stock_quantity <= 10) {
      return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">Low Stock ({product.stock_quantity})</span>;
    } else {
      return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">In Stock ({product.stock_quantity})</span>;
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="font-sans text-slate-900 text-[13px]">
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="text-blue-600" size={24} />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Inventory Manager</h1>
                <p className="text-sm text-slate-600">Manage your store products and stock levels</p>
              </div>
            </div>
            <button
              onClick={() => fetchProducts(searchParams.get('storeId'))}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">Refresh</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-[0.15em] font-black">
                  <th className="p-4">Product</th>
                  <th className="p-4 text-center">SKU</th>
                  <th className="p-4 text-center">Stock Status</th>
                  <th className="p-4 text-center">Price</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.images && product.images[0] && (
                          <img
                            src={product.images[0].src}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                          <div className="text-xs text-slate-500">{product.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono text-sm">{product.sku || 'N/A'}</td>
                    <td className="p-4 text-center">
                      {getStockBadge(product)}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-900">
                      £{parseFloat(product.price).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <a
                        href={`${store?.wooUrl}/wp-admin/post.php?post=${product.id}&action=edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        <ExternalLink size={14} />
                        Edit in WooCommerce
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-500">
              No products found. Make sure your WooCommerce store is properly connected.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Inventory() {
  return <InventoryContent />;
}