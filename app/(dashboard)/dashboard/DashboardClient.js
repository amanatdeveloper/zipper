'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Edit2, RefreshCw, Search, Settings, Sparkles, Archive, AlertCircle, ToggleLeft, ToggleRight, History } from 'lucide-react';
import PageAuditModal from '../../../components/PageAuditModal.js';

const LEARNING_PERIOD_DAYS = 14;
const PRODUCT_META_SAVE_DELAY_MS = 700;

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return `GBP ${Number(value).toFixed(2)}`;
}

function formatDays(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(1)}d`;
}

function getScoreBadgeTone(score) {
  const numericScore = toNumber(score);
  if (numericScore >= 90) return 'border border-emerald-200 bg-emerald-100 text-emerald-700';
  if (numericScore >= 75) return 'border border-blue-200 bg-blue-100 text-blue-700';
  if (numericScore >= 60) return 'border border-amber-200 bg-amber-100 text-amber-700';
  if (numericScore > 0) return 'border border-red-200 bg-red-100 text-red-700';
  return 'border border-slate-200 bg-slate-100 text-slate-500';
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStoreId = searchParams.get('storeId');

  const [store, setStore] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optimizingSkus, setOptimizingSkus] = useState({});
  const [metaSaveState, setMetaSaveState] = useState({});
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [activeAuditProduct, setActiveAuditProduct] = useState(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalTargets, setGlobalTargets] = useState({ sales: 5, acos: 15, conv: 1.0 });
  const [productTargets, setProductTargets] = useState({});
  const [hasLinkedStores, setHasLinkedStores] = useState(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivingSkus, setArchivingSkus] = useState({});
  const [unarchivingSkus, setUnarchivingSkus] = useState({});
  const [toast, setToast] = useState(null);
  const [optimizeModalOpen, setOptimizeModalOpen] = useState(false);
  const [optimizeModalSku, setOptimizeModalSku] = useState('');
  const [optimizationNotes, setOptimizationNotes] = useState('');
  const [selectedRowForOptimize, setSelectedRowForOptimize] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historySku, setHistorySku] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const metaSaveTimeoutsRef = useRef({});
  const metaDraftVersionsRef = useRef({});
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (!activeStoreId) {
      setStore(null);
      setData([]);
      return;
    }
    fetchStore(activeStoreId);
  }, [activeStoreId, router]);

  useEffect(() => {
    if (hasLinkedStores !== null) return;

    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores?scope=linked', { cache: 'no-store' });
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setHasLinkedStores(result.data.length);
        } else {
          setHasLinkedStores(0);
        }
      } catch (error) {
        console.error(error);
        setHasLinkedStores(0);
      }
    };

    fetchStores();
  }, [hasLinkedStores]);

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

  useEffect(() => {
    return () => {
      Object.values(metaSaveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const fetchStore = async (storeId) => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const result = await res.json();
      if (result.success) setStore(result.data);
      else router.push('/dashboard');
    } catch (error) {
      console.error(error);
      router.push('/dashboard');
    }
  };

  const fetchData = useCallback(async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/report?storeId=${activeStoreId}&start=${startDate}&end=${endDate}&showAll=${showAllProducts}&showArchived=${showArchived}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, endDate, startDate, showAllProducts, showArchived]);

  useEffect(() => {
    if (store) fetchData();
  }, [fetchData, store]);

  const getTarget = (sku, type) => {
    const skuKey = sku.toLowerCase();
    return productTargets[skuKey]?.[type] || globalTargets[type];
  };

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const getSalesTarget = (row) => {
    const productLevelTarget = Math.round(toNumber(row.minSalesTarget));
    return productLevelTarget > 0 ? productLevelTarget : toNumber(globalTargets.sales);
  };

  const getAdCostPerSale = (row) => {
    const salesCount = toNumber(row.salesCount);
    if (salesCount <= 0) return null;
    return toNumber(row.adCost) / salesCount;
  };

  const getProfitPerSale = (row) => {
    const adCostPerSale = getAdCostPerSale(row);
    if (adCostPerSale === null) return null;
    return toNumber(row.price) - (toNumber(row.costPrice) + adCostPerSale);
  };

  const getTotalProfit = (row) => {
    const totalRevenue = toNumber(row.revenue);
    const totalAdCost = toNumber(row.adCost);
    const costPrice = toNumber(row.costPrice);
    const salesCount = toNumber(row.salesCount);
    return totalRevenue - totalAdCost - (costPrice * salesCount);
  };

  const isCostPriceMissing = (row) => {
    return toNumber(row.costPrice) === 0 && toNumber(row.salesCount) > 0;
  };

  const getStockDaysRemaining = (row) => {
    const stockQuantity = toNumber(row.stock_quantity);
    const salesLast30 = toNumber(row.salesLast30);
    if (stockQuantity <= 0) return 0;
    if (salesLast30 <= 0) return null;
    return stockQuantity / (salesLast30 / 30);
  };

  const getAuditStrategyNote = (row) => {
    if (toNumber(row.auditScore) >= 90 || !Array.isArray(row.auditMissingElements) || row.auditMissingElements.length === 0) {
      return '';
    }
    return `AI Audit (${row.auditScore}%): ${row.auditMissingElements.join(', ')}`;
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
    const targetSales = getSalesTarget(row);
    const leadTime = Math.round(toNumber(row.leadTime));
    const profitPerSale = getProfitPerSale(row);
    const stockDaysRemaining = getStockDaysRemaining(row);
    let suggestion = 'Scale Bids (Healthy)';

    if (row.stock_status === 'outofstock') {
      suggestion = 'Out of Stock: Stop ads immediately.';
    } else if (parseFloat(row.acos) > targetACOS && parseInt(row.stock_quantity, 10) <= 10) {
      suggestion = 'High ACOS and low stock: Reduce bids to preserve remaining inventory.';
    } else if (parseInt(row.clicks, 10) >= 100 && parseFloat(row.convRate) < targetConv) {
      suggestion = row.learningPhase
        ? `Learning Phase: Optimized on ${formatOptimizedDate(row.optimizedAt)}. Holding price-change suggestions for now.`
        : 'Reduce Price (Low Conv)';
    } else if (parseFloat(row.acos) > targetACOS && parseFloat(row.convRate) < targetConv) {
      suggestion = row.learningPhase
        ? `Learning Phase: Optimized on ${formatOptimizedDate(row.optimizedAt)}. Holding bid-change suggestions for now.`
        : 'Reduce Bid (High ACOS)';
    } else if (row.learningPhase) {
      suggestion = `Learning Phase: Monitoring results since ${formatOptimizedDate(row.optimizedAt)}.`;
    } else if (parseFloat(row.acos) <= targetACOS && parseInt(row.salesCount, 10) >= targetSales) {
      suggestion = 'Optimal Performance';
    }

    if (suggestion === 'Reduce Price (Low Conv)' && profitPerSale !== null && profitPerSale < 0) {
      suggestion = 'Critical: Low Margin. Discontinue or Optimize Supply Cost.';
    }

    if (row.stock_status !== 'outofstock' && leadTime > 0 && stockDaysRemaining !== null && stockDaysRemaining < leadTime) {
      suggestion = 'Restock needed based on Lead Time';
    }

    if (toNumber(row.salesCount) < targetSales) {
      suggestion = 'Sales below target. Consider increasing bids or checking AI Audit.';
    }

    const auditStrategyNote = getAuditStrategyNote(row);
    return auditStrategyNote ? `${suggestion}\n${auditStrategyNote}` : suggestion;
  };

  const getShortRecommendation = (row) => {
    const fullRecommendation = getDynamicRec(row);
    if (fullRecommendation.startsWith('Out of Stock')) return 'Pause ads until stock returns.';
    if (fullRecommendation.includes('Restock needed based on Lead Time')) return 'Restock needed based on Lead Time.';
    if (fullRecommendation.includes('Sales below target. Consider increasing bids or checking AI Audit.')) return 'Sales below target. Consider increasing bids or checking AI Audit.';
    if (fullRecommendation.includes('Critical: Low Margin')) return 'Fix margin before discounting.';
    if (fullRecommendation.startsWith('Reduce Price')) return 'Test a sharper price to lift conversion.';
    if (fullRecommendation.startsWith('Reduce Bid')) return 'Trim bids to control ACOS.';
    if (fullRecommendation.startsWith('High ACOS and low stock')) return 'Protect stock and reduce bid pressure.';
    if (fullRecommendation.startsWith('Optimal Performance')) return 'Hold steady and scale carefully.';
    if (fullRecommendation.startsWith('Learning Phase')) return 'Let the current change finish learning.';
    return 'Scale gradually while metrics stay healthy.';
  };

  const saveProductMeta = useCallback(async (row, draftVersion) => {
    if (!activeStoreId || !row?.sku) return;
    setMetaSaveState((current) => ({
      ...current,
      [row.sku]: { status: 'saving', message: 'Saving business fields...' },
    }));

    try {
      const res = await fetch('/api/product-meta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeStoreId,
          sku: row.sku,
          costPrice: row.costPrice,
          leadTime: row.leadTime,
          minSalesTarget: row.minSalesTarget,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Unable to save product business data');
      if (metaDraftVersionsRef.current[row.sku] !== draftVersion) return;

      setData((current) =>
        current.map((currentRow) =>
          currentRow.sku === row.sku
            ? {
                ...currentRow,
                costPrice: Number(result.data.costPrice || 0).toFixed(2),
                leadTime: result.data.leadTime || 0,
                minSalesTarget: result.data.minSalesTarget || 0,
              }
            : currentRow
        )
      );
      setMetaSaveState((current) => ({
        ...current,
        [row.sku]: { status: 'saved', message: 'Business fields saved' },
      }));
    } catch (error) {
      console.error(error);
      setMetaSaveState((current) => ({
        ...current,
        [row.sku]: { status: 'error', message: error.message || 'Unable to save business fields' },
      }));
    }
  }, [activeStoreId]);

  const scheduleProductMetaSave = useCallback((row) => {
    const nextVersion = (metaDraftVersionsRef.current[row.sku] || 0) + 1;
    metaDraftVersionsRef.current[row.sku] = nextVersion;
    if (metaSaveTimeoutsRef.current[row.sku]) clearTimeout(metaSaveTimeoutsRef.current[row.sku]);
    setMetaSaveState((current) => ({
      ...current,
      [row.sku]: { status: 'pending', message: 'Saving soon...' },
    }));
    metaSaveTimeoutsRef.current[row.sku] = setTimeout(() => {
      saveProductMeta(row, nextVersion);
    }, PRODUCT_META_SAVE_DELAY_MS);
  }, [saveProductMeta]);

  const handleBusinessFieldChange = (sku, field, value) => {
    let updatedRow = null;
    setData((current) =>
      current.map((row) => {
        if (row.sku !== sku) return row;
        updatedRow = { ...row, [field]: value };
        return updatedRow;
      })
    );
    if (updatedRow) scheduleProductMetaSave(updatedRow);
  };

  const handleMarkOptimized = async (sku, row, notes) => {
    if (!activeStoreId || !sku) return;
    setOptimizingSkus((current) => ({ ...current, [sku]: true }));

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          storeId: activeStoreId,
          actionTaken: 'Marked as optimized from dashboard',
          optimizationNotes: notes,
          acos: toNumber(row?.acos),
          convRate: toNumber(row?.convRate),
          price: toNumber(row?.price),
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to mark product as optimized');

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
      showToast(error.message || 'Failed to mark optimized', 'error');
    } finally {
      setOptimizingSkus((current) => ({ ...current, [sku]: false }));
    }
  };

  const openOptimizeModal = (row) => {
    setOptimizeModalSku(row?.sku || '');
    setOptimizationNotes('');
    setSelectedRowForOptimize(row || null);
    setOptimizeModalOpen(true);
  };

  const closeOptimizeModal = () => {
    setOptimizeModalOpen(false);
    setOptimizeModalSku('');
    setOptimizationNotes('');
    setSelectedRowForOptimize(null);
  };

  const handleSaveOptimizeNote = async () => {
    if (!optimizeModalSku || !selectedRowForOptimize) return;
    await handleMarkOptimized(optimizeModalSku, selectedRowForOptimize, optimizationNotes);
    closeOptimizeModal();
  };

  const handleOpenHistory = async (sku) => {
    if (!activeStoreId || !sku) return;
    setHistorySku(sku);
    setHistoryLoading(true);
    setHistoryModalOpen(true);
    try {
      const res = await fetch(`/api/optimize?storeId=${activeStoreId}&sku=${encodeURIComponent(sku)}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Unable to load history');
      setHistoryRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error(error);
      setHistoryRows([]);
      showToast(error.message || 'Unable to load history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenAudit = (product) => {
    if (!product?.productUrl) return;
    setActiveAuditProduct(product);
    setAuditModalOpen(true);
  };

  const handleCloseAudit = () => {
    setAuditModalOpen(false);
    setActiveAuditProduct(null);
  };

  const handleArchiveProduct = async (sku) => {
    if (!activeStoreId || !sku) return;
    setArchivingSkus((current) => ({ ...current, [sku]: true }));

    try {
      const res = await fetch('/api/product-meta/archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeStoreId,
          sku,
          isHidden: true,
        }),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to archive product');
        return;
      }

      // Remove product from the data
      setData((current) => current.filter((row) => row.sku !== sku));
    } catch (error) {
      console.error(error);
      alert('Unable to archive product');
    } finally {
      setArchivingSkus((current) => ({ ...current, [sku]: false }));
    }
  };

  const handleUnarchiveProduct = async (sku) => {
    if (!activeStoreId || !sku) return;
    setUnarchivingSkus((current) => ({ ...current, [sku]: true }));

    try {
      const res = await fetch('/api/product-meta/archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeStoreId,
          sku,
          isHidden: false,
        }),
      });
      const result = await res.json();

      if (!result.success) {
        showToast(result.error || 'Unable to restore product', 'error');
        return;
      }

      // Remove product from the data when unarchiving (it will reappear on the normal view)
      setData((current) => current.filter((row) => row.sku !== sku));
      showToast('Product restored successfully. Switch to active products view to see it.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Unable to restore product', 'error');
    } finally {
      setUnarchivingSkus((current) => ({ ...current, [sku]: false }));
    }
  };

  const getSaveMessage = (sku) => metaSaveState[sku]?.message || '';
  const dashboardTotalProfit = data.reduce((sum, row) => sum + getTotalProfit(row), 0);

  if (!activeStoreId) {
    const isReady = hasLinkedStores !== null;

    return (
      <div className="font-sans text-slate-900 pb-24 text-[13px]">
        <main className="max-w-[1600px] mx-auto p-4 md:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
            {isReady && hasLinkedStores === 0 ? (
              <>
                <h1 className="text-3xl font-black text-slate-900">Welcome to Scalefire</h1>
                <p className="mt-3 text-slate-600 max-w-2xl">
                  Your workspace is ready. Connect your first store to start seeing performance insights, optimization recommendations, and Google Ads setup guidance.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href="/onboarding"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Connect Your First Store
                  </a>
                  <p className="text-sm text-slate-500">
                    This guided onboarding will collect your WooCommerce and Google Ads credentials for the first store.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-xl font-black text-slate-900">Select a Store</h1>
                <p className="text-slate-600 mt-2">Choose a store from the dropdown in the top navigation to view dashboard data.</p>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 pb-24 text-[13px]">
      <main className="max-w-[1800px] mx-auto p-4 md:p-6 space-y-6">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
              title={showArchived ? 'Showing archived products' : 'Showing active products'}
            >
              {showArchived ? (
                <ToggleRight size={16} className="text-amber-600" />
              ) : (
                <ToggleLeft size={16} className="text-slate-400" />
              )}
              <span className="text-[11px] font-bold text-slate-700">
                {showArchived ? 'Archived' : 'Active'}
              </span>
            </button>
            <button
              onClick={() => setShowAllProducts(!showAllProducts)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
              title={showAllProducts ? 'Showing products with and without ad spend' : 'Showing only products with ad spend'}
            >
              {showAllProducts ? (
                <ToggleRight size={16} className="text-blue-600" />
              ) : (
                <ToggleLeft size={16} className="text-slate-400" />
              )}
              <span className="text-[11px] font-bold text-slate-700">
                {showAllProducts ? 'Show All' : 'Ad Spend Only'}
              </span>
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
              { label: 'Default Min Sales Target', key: 'sales', step: '1' },
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

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total Profit</div>
          <div className={`mt-1 text-2xl font-black ${dashboardTotalProfit < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatCurrency(dashboardTotalProfit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Formula: Revenue - Ad Spend - (Unit Cost x Quantity Sold)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-[0.15em] font-black">
                  <th className="border-r border-slate-800 px-3 py-3 min-w-[320px]">SKU & Targets</th>
                  <th className="px-2 py-3 text-center">Clicks</th>
                  <th className="px-2 py-3 text-center">Ad Cost</th>
                  <th className="px-2 py-3 text-center">Sales / Revenue</th>
                  <th className="px-2 py-3 text-center">ACOS / Conv</th>
                  <th className="px-2 py-3 text-center min-w-[88px]">Cost</th>
                  <th className="px-2 py-3 text-center min-w-[74px]">Lead</th>
                  <th className="px-2 py-3 text-center min-w-[86px]">Target</th>
                  <th className="px-2 py-3 text-center">Total Profit</th>
                  <th className="px-2 py-3 text-center">Stock Days</th>
                  <th className="px-2 py-3 text-center">Stock</th>
                  <th className="px-2 py-3 text-center min-w-[60px]">{showArchived ? 'Restore' : 'Archive'}</th>
                  <th className="px-3 py-3 min-w-[250px]">AI Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => {
                  const profitPerSale = getProfitPerSale(row);
                  const rowTotalProfit = getTotalProfit(row);
                  const stockDaysRemaining = getStockDaysRemaining(row);
                  const saveState = metaSaveState[row.sku]?.status;
                  const auditStrategyNote = getAuditStrategyNote(row);
                  const shortRecommendation = getShortRecommendation(row);
                  const scoreBadgeTone = getScoreBadgeTone(row.auditScore);

                  return (
                    <tr key={row.sku} className="group align-top transition-all hover:bg-slate-50/80">
                      <td className="border-r border-slate-50 px-3 py-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-black tracking-tight text-slate-900">{row.sku}</div>
                            {row.productName ? (
                              <div className="mt-1 max-w-[180px] text-[11px] font-medium leading-snug text-slate-500">{row.productName}</div>
                            ) : null}
                            {getSaveMessage(row.sku) ? (
                              <div
                                className={`mt-1.5 text-[9px] font-black uppercase tracking-wider ${
                                  saveState === 'error'
                                    ? 'text-red-600'
                                    : saveState === 'saved'
                                      ? 'text-emerald-600'
                                      : 'text-blue-600'
                                }`}
                              >
                                {getSaveMessage(row.sku)}
                              </div>
                            ) : null}
                            {row.learningPhase ? (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800">
                                <Sparkles size={10} />
                                Learning Phase
                                <span className="font-bold normal-case tracking-normal text-amber-700">
                                  {formatOptimizedDate(row.optimizedAt)}
                                </span>
                              </div>
                            ) : null}
                            {toNumber(row.leadTime) > 0 && stockDaysRemaining !== null && stockDaysRemaining < toNumber(row.leadTime) ? (
                              <div className="mt-1.5 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-700">
                                Restock needed based on Lead Time
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => openOptimizeModal(row)}
                              disabled={Boolean(optimizingSkus[row.sku])}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Sparkles size={10} className={optimizingSkus[row.sku] ? 'animate-pulse' : ''} />
                              {optimizingSkus[row.sku] ? 'Saving...' : 'Mark Optimized'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(row.sku)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
                            >
                              <History size={10} />
                              History
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAudit(row)}
                              disabled={!row.productUrl}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                              title={row.productUrl ? 'Audit product page' : 'No product URL available for this SKU'}
                            >
                              <Search size={10} />
                              {row.productUrl ? 'Audit' : 'No URL'}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <span className="mb-1 block text-[8px] font-black uppercase text-slate-400">
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
                              className="w-full border-b border-slate-200 bg-transparent px-1 pb-1 text-[11px] font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <span className="mb-1 block text-[8px] font-black uppercase text-slate-400">
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
                              className="w-full border-b border-slate-200 bg-transparent px-1 pb-1 text-[11px] font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-slate-500">{row.clicks}</td>
                      <td className="px-2 py-3 text-center font-bold text-red-500">{formatCurrency(row.adCost)}</td>
                      <td className="px-2 py-3 text-center">
                        <div className="font-black text-blue-600">{row.salesCount}</div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">{formatCurrency(row.revenue)}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div
                          className={`inline-block rounded-full px-2 py-1 text-[9px] font-black ${
                            parseFloat(row.acos) <= getTarget(row.sku, 'acos')
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.acos}%
                        </div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">{row.convRate}% conv</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.costPrice}
                          onChange={(e) => handleBusinessFieldChange(row.sku, 'costPrice', e.target.value)}
                          className="w-full min-w-[64px] border-b border-slate-300 bg-transparent px-1 pb-1 text-center text-[11px] font-black text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.leadTime}
                          onChange={(e) => handleBusinessFieldChange(row.sku, 'leadTime', e.target.value)}
                          className="w-full min-w-[52px] border-b border-slate-300 bg-transparent px-1 pb-1 text-center text-[11px] font-black text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.minSalesTarget}
                          onChange={(e) => handleBusinessFieldChange(row.sku, 'minSalesTarget', e.target.value)}
                          className="w-full min-w-[60px] border-b border-slate-300 bg-transparent px-1 pb-1 text-center text-[11px] font-black text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        {toNumber(row.costPrice) === 0 ? (
                          <div className="text-[11px] font-black text-amber-700">N/A (Set Cost)</div>
                        ) : (
                          <div
                            className={`text-[11px] font-black flex items-center justify-center gap-1 ${
                              toNumber(rowTotalProfit) < 0 ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {formatCurrency(rowTotalProfit)}
                            {isCostPriceMissing(row) && (
                              <AlertCircle size={14} className="text-amber-500" title="Cost price not set - profit may be inaccurate" />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center font-black text-slate-700">
                        {formatDays(stockDaysRemaining)}
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          30d sales: {row.salesLast30 || 0}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {row.stock_quantity !== undefined ? (
                          <div
                            className={`inline-block rounded-full px-2 py-1.5 text-[9px] font-black ${
                              row.stock_status === 'outofstock' || row.stock_quantity === 0
                                ? 'border-2 border-red-400 bg-red-100 text-red-700'
                                : row.stock_quantity <= 10
                                  ? 'border-2 border-yellow-400 bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300'
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
                          <span className="font-medium text-slate-500">Unknown</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {showArchived && row.isHidden ? (
                          <button
                            onClick={() => handleUnarchiveProduct(row.sku)}
                            disabled={unarchivingSkus[row.sku]}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Restore this product to active products"
                          >
                            <Archive size={12} />
                            {unarchivingSkus[row.sku] ? 'Restoring...' : 'Restore'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveProduct(row.sku)}
                            disabled={archivingSkus[row.sku]}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Archive this product (hide from dashboard)"
                          >
                            <Archive size={12} />
                            {archivingSkus[row.sku] ? 'Archiving...' : 'Archive'}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
                          <div className="flex items-start gap-2">
                            <div
                              className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${scoreBadgeTone}`}
                            >
                              {row.auditScore ? `Score ${row.auditScore}%` : 'No Audit'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-black leading-snug text-slate-800">
                                {shortRecommendation}
                              </div>
                              <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {row.learningPhase
                                  ? `Learning window: ${LEARNING_PERIOD_DAYS} days`
                                  : `${getTarget(row.sku, 'acos')}% ACOS / ${getTarget(row.sku, 'conv')}% Conv / ${getSalesTarget(row)} Sales`}
                              </div>
                            </div>
                          </div>
                          <details className="group mt-2">
                            <summary className="cursor-pointer list-none text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-slate-600">
                              Audit Breakdown
                            </summary>
                            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-600">
                              <div className="whitespace-pre-line font-semibold text-slate-700">
                                {getDynamicRec(row)}
                              </div>
                              <div className="mt-2 text-slate-500">
                                {auditStrategyNote || 'No urgent missing AI audit elements were flagged for this SKU.'}
                              </div>
                              {Array.isArray(row.auditMissingElements) && row.auditMissingElements.length > 0 ? (
                                <div className="mt-2 text-[10px] text-slate-500">
                                  Missing: {row.auditMissingElements.join(', ')}
                                </div>
                              ) : null}
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <PageAuditModal
          isOpen={auditModalOpen}
          product={activeAuditProduct}
          storeId={activeStoreId}
          onClose={handleCloseAudit}
        />
        {optimizeModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-black text-slate-900">Mark Optimized: {optimizeModalSku}</h3>
              <p className="mt-1 text-sm text-slate-600">Add optimization notes and save a metric snapshot.</p>
              <textarea
                value={optimizationNotes}
                onChange={(e) => setOptimizationNotes(e.target.value)}
                placeholder="Example: Decreased bid by 0.20"
                rows={4}
                className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeOptimizeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOptimizeNote}
                  disabled={!optimizationNotes.trim() || Boolean(optimizingSkus[optimizeModalSku])}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {optimizingSkus[optimizeModalSku] ? 'Saving...' : 'Save Note & Snapshot'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {historyModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Optimization History: {historySku}</h3>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                {historyLoading ? (
                  <div className="p-4 text-sm text-slate-500">Loading history...</div>
                ) : historyRows.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No optimization history found.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {historyRows.map((item) => (
                      <li key={item.id} className="p-4">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                          {new Date(item.snapshotDate).toLocaleDateString('en-GB')}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{item.optimizationNotes}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          ACOS: {toNumber(item.acos).toFixed(2)}% | Conv%: {toNumber(item.convRate).toFixed(2)}% | Price: {formatCurrency(item.price)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
        {toast && (
          <div className={`fixed bottom-6 right-6 rounded-xl shadow-lg px-5 py-4 text-sm font-bold z-50 animate-in slide-in-from-bottom-4 fade-in transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {toast.message}
          </div>
        )}
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
