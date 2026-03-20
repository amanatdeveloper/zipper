'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Settings, Edit2, Sparkles } from 'lucide-react';

const LEARNING_PERIOD_DAYS = 14;

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [store, setStore] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optimizingSkus, setOptimizingSkus] = useState({});
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [globalTargets, setGlobalTargets] = useState({ sales: 5, acos: 15, conv: 1.0 });
  const [productTargets, setProductTargets] = useState({});

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    const storeId = searchParams.get('storeId');
    if (!storeId) {
      setStore(null);
      setData([]);
      return;
    }

    fetchStore(storeId);
  }, [session, status, router, searchParams]);

  const fetchStore = async (storeId) => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const result = await res.json();
      if (result.success) {
        setStore(result.data);
      } else {
        router.push('/');
      }
    } catch (e) {
      console.error(e);
      router.push('/');
    }
  };

  useEffect(() => {
    const savedGlobal = localStorage.getItem('zipper_global_targets');
    const savedProduct = localStorage.getItem('zipper_product_targets');
    if (savedGlobal) setGlobalTargets(JSON.parse(savedGlobal));
    if (savedProduct) setProductTargets(JSON.parse(savedProduct));
  }, []);

  useEffect(() => {
    localStorage.setItem('zipper_global_targets', JSON.stringify(globalTargets));
    localStorage.setItem('zipper_product_targets', JSON.stringify(productTargets));
  }, [globalTargets, productTargets]);

  const fetchData = useCallback(async () => {
    const storeId = searchParams.get('storeId');
    if (!storeId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/report?storeId=${storeId}&start=${startDate}&end=${endDate}`);
      const result = await res.json();
      if (result.success) {
        const filteredData = result.data.filter((item) => parseInt(item.clicks, 10) > 0);
        setData(filteredData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchParams, startDate, endDate]);

  useEffect(() => {
    if (store) fetchData();
  }, [fetchData, store]);

  const getTarget = (sku, type) => {
    const skuKey = sku.toLowerCase();
    return productTargets[skuKey]?.[type] || globalTargets[type];
  };

  const formatOptimizedDate = (dateValue) => {
    if (!dateValue) return 'recently';
    return new Date(dateValue).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDynamicRec = (row) => {
    const targetACOS = parseFloat(getTarget(row.sku, 'acos'));
    const targetConv = parseFloat(getTarget(row.sku, 'conv'));
    const targetSales = parseFloat(getTarget(row.sku, 'sales'));

    if (row.stock_status === 'outofstock') {
      return 'Out of Stock: Stop ads immediately.';
    }

    if (parseFloat(row.acos) > targetACOS && parseInt(row.stock_quantity, 10) <= 10) {
      return 'High ACOS and low stock: Reduce bids to preserve remaining inventory.';
    }

    if (parseInt(row.clicks, 10) >= 100 && parseFloat(row.convRate) < targetConv) {
      if (row.learningPhase) {
        return `Learning Phase: Optimized on ${formatOptimizedDate(row.optimizedAt)}. Holding price-change suggestions for now.`;
      }
      return 'Reduce Price (Low Conv)';
    }
    if (parseFloat(row.acos) > targetACOS && parseFloat(row.convRate) < targetConv) {
      if (row.learningPhase) {
        return `Learning Phase: Optimized on ${formatOptimizedDate(row.optimizedAt)}. Holding bid-change suggestions for now.`;
      }
      return 'Reduce Bid (High ACOS)';
    }
    if (row.learningPhase) {
      return `Learning Phase: Monitoring results since ${formatOptimizedDate(row.optimizedAt)}.`;
    }
    if (parseFloat(row.acos) <= targetACOS && parseInt(row.salesCount, 10) >= targetSales) {
      return 'Optimal Performance';
    }
    return 'Scale Bids (Healthy)';
  };

  const handleMarkOptimized = async (sku) => {
    const storeId = searchParams.get('storeId');
    if (!storeId || !sku) return;

    setOptimizingSkus((current) => ({ ...current, [sku]: true }));

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku,
          storeId,
          actionTaken: 'Marked as optimized from dashboard',
        }),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark product as optimized');
      }

      setData((current) =>
        current.map((row) =>
          row.sku === sku
            ? {
                ...row,
                learningPhase: true,
                optimizedAt: result.data.appliedAt,
                actionTaken: result.data.actionTaken,
              }
            : row
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setOptimizingSkus((current) => ({ ...current, [sku]: false }));
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  if (!searchParams.get('storeId')) {
    return (
      <div className="font-sans text-slate-900 pb-24 text-[13px]">
        <main className="max-w-[1600px] mx-auto p-4 md:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
            <h1 className="text-xl font-black text-slate-900">Select a Store</h1>
            <p className="text-slate-600 mt-2">Choose a store from the dropdown in the top navigation to view dashboard data.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 pb-24 text-[13px]">
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] p-1 outline-none border-none font-bold"
              />
              <span className="text-slate-400 self-center px-1">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] p-1 outline-none border-none font-bold"
              />
            </div>
            <button
              onClick={fetchData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">Sync Now</span>
            </button>
          </div>
        </div>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
          <div className="flex items-center gap-2 mb-5">
            <Settings className="text-slate-400" size={18} />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Global Strategy Configuration
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { label: 'Target ACOS %', key: 'acos', step: '1' },
              { label: 'Min Conv Rate %', key: 'conv', step: '0.1' },
              { label: 'Min Sales Target', key: 'sales', step: '1' },
            ].map((field) => (
              <div key={field.key} className="group">
                <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                  {field.label}
                </label>
                <div className="relative border-b-2 border-slate-100 group-hover:border-blue-200 transition-colors">
                  <input
                    type="number"
                    step={field.step}
                    value={globalTargets[field.key]}
                    onChange={(e) => setGlobalTargets({ ...globalTargets, [field.key]: e.target.value })}
                    className="w-full text-4xl font-black text-slate-800 bg-transparent outline-none py-1 pr-10"
                  />
                  <Edit2
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-200 group-hover:text-blue-500 transition-colors"
                    size={18}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-[0.15em] font-black">
                  <th className="p-4 border-r border-slate-800">SKU & Performance Targets</th>
                  <th className="p-4 text-center">Clicks</th>
                  <th className="p-4 text-center">Ad Cost</th>
                  <th className="p-4 text-center">Sales</th>
                  <th className="p-4 text-center">Revenue</th>
                  <th className="p-4 text-center">ACOS %</th>
                  <th className="p-4 text-center">Conv %</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4">AI Strategy & Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.sku} className="group hover:bg-slate-50/80 transition-all">
                    <td className="p-4 border-r border-slate-50">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900 text-base tracking-tight">{row.sku}</div>
                          {row.learningPhase ? (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
                              <Sparkles size={12} />
                              Learning Phase
                              <span className="font-bold normal-case tracking-normal text-amber-700">
                                {formatOptimizedDate(row.optimizedAt)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMarkOptimized(row.sku)}
                          disabled={Boolean(optimizingSkus[row.sku])}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Sparkles size={12} className={optimizingSkus[row.sku] ? 'animate-pulse' : ''} />
                          {optimizingSkus[row.sku] ? 'Saving...' : 'Mark Optimized'}
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                            Target ACOS
                          </span>
                          <input
                            type="number"
                            placeholder={`${globalTargets.acos}%`}
                            value={productTargets[row.sku.toLowerCase()]?.acos || ''}
                            onChange={(e) =>
                              setProductTargets({
                                ...productTargets,
                                [row.sku.toLowerCase()]: {
                                  ...(productTargets[row.sku.toLowerCase()] || {}),
                                  acos: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                            Min Conv %
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            placeholder={`${globalTargets.conv}%`}
                            value={productTargets[row.sku.toLowerCase()]?.conv || ''}
                            onChange={(e) =>
                              setProductTargets({
                                ...productTargets,
                                [row.sku.toLowerCase()]: {
                                  ...(productTargets[row.sku.toLowerCase()] || {}),
                                  conv: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-500">{row.clicks}</td>
                    <td className="p-4 text-center font-bold text-red-500">£{row.adCost}</td>
                    <td className="p-4 text-center font-black text-blue-600 bg-blue-50/30">{row.salesCount}</td>
                    <td className="p-4 text-center font-black text-slate-900 text-sm">£{row.revenue}</td>
                    <td className="p-4 text-center">
                      <div
                        className={`inline-block px-3 py-1 rounded-full font-black text-[10px] ${
                          parseFloat(row.acos) <= getTarget(row.sku, 'acos')
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.acos}%
                      </div>
                    </td>
                    <td className="p-4 text-center font-black text-slate-700">{row.convRate}%</td>
                    <td className="p-4 text-center">
                      {row.stock_quantity !== undefined ? (
                        <div
                          className={`inline-block px-3 py-2 rounded-full font-black text-[10px] ${
                            row.stock_status === 'outofstock' || row.stock_quantity === 0
                              ? 'bg-red-100 text-red-700 border-2 border-red-400'
                              : row.stock_quantity <= 10
                                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400 ring-2 ring-yellow-300'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {row.stock_status === 'outofstock' || row.stock_quantity === 0
                            ? 'Out of Stock'
                            : row.stock_quantity <= 10
                              ? `Low Stock (${row.stock_quantity})`
                              : `In Stock (${row.stock_quantity})`}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-medium">Unknown</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="font-black text-slate-800 text-xs mb-1">
                          {getDynamicRec(row)}
                        </div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">
                          {row.learningPhase
                            ? `Learning window: ${LEARNING_PERIOD_DAYS} days from ${formatOptimizedDate(row.optimizedAt)}`
                            : `Threshold: ${getTarget(row.sku, 'acos')}% ACOS / ${getTarget(row.sku, 'conv')}% Conv`}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
