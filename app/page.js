'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Settings, Target, Info, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState('30');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [globalTargets, setGlobalTargets] = useState({
    sales: 5,
    acos: 15,
    conv: 1.0 // Omar's 1% target (1 sale per 100 clicks)
  });

  const [productTargets, setProductTargets] = useState({});

  useEffect(() => {
    const savedGlobal = localStorage.getItem('zippper_global_targets');
    const savedProduct = localStorage.getItem('zippper_product_targets');
    if (savedGlobal) setGlobalTargets(JSON.parse(savedGlobal));
    if (savedProduct) setProductTargets(JSON.parse(savedProduct));
  }, []);

  useEffect(() => {
    localStorage.setItem('zippper_global_targets', JSON.stringify(globalTargets));
    localStorage.setItem('zippper_product_targets', JSON.stringify(productTargets));
  }, [globalTargets, productTargets]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?start=${startDate}&end=${endDate}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTarget = (sku, type) => {
    const skuKey = sku.toLowerCase();
    return productTargets[skuKey]?.[type] || globalTargets[type];
  };

  // --- Omar's Refined Logic ---
  const getDynamicRec = (row) => {
    const targetACOS = parseFloat(getTarget(row.sku, 'acos'));
    const targetSales = parseFloat(getTarget(row.sku, 'sales'));
    const targetConv = parseFloat(getTarget(row.sku, 'conv'));

    const currentAcos = parseFloat(row.acos);
    const currentConv = parseFloat(row.convRate);
    const clicks = parseInt(row.clicks);
    const salesCount = parseInt(row.salesCount);

    // 1. High Traffic but No/Low Sales (Omar's VHE-MOB1 Example)
    // If clicks are high but conversion is below target, it's a pricing/product issue
    if (clicks >= 100 && currentConv < targetConv) {
      return '💰 Reduce Price (Price Resistance)';
    }

    // 2. High ACOS & Low Conversion
    if (currentAcos > targetACOS && currentConv < targetConv) {
      return '📉 Reduce Bid (Low Efficiency)';
    }

    // 3. Optimal Performance
    if (currentAcos <= targetACOS && salesCount >= targetSales) {
      return '✅ Optimal Performance';
    }

    // 4. Growth Opportunity
    if (currentAcos <= targetACOS && salesCount < targetSales) {
      return '🚀 Increase Bid (Growth Opp)';
    }

    return 'Analyzing Market Data...';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600 w-8 h-8" />
            <h1 className="text-xl font-bold text-slate-900 italic">Zipper Dashboard</h1>
          </div>
          <div className="flex gap-3 items-center">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded text-sm bg-slate-50" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded text-sm bg-slate-50" />
            <button onClick={fetchData} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex gap-2 items-center hover:bg-blue-700 shadow-md">
              <RefreshCw className={loading ? 'animate-spin' : ''} size={18} /> Sync Data
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Targets Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400">GLOBAL TARGET ACOS</span>
                <div className="flex items-center gap-2">
                    <input type="number" value={globalTargets.acos} onChange={(e) => setGlobalTargets({...globalTargets, acos: e.target.value})} className="text-2xl font-bold text-slate-800 w-20 outline-none" />
                    <span className="text-xl text-slate-400">%</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400">MIN. CONV. RATE</span>
                <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={globalTargets.conv} onChange={(e) => setGlobalTargets({...globalTargets, conv: e.target.value})} className="text-2xl font-bold text-slate-800 w-20 outline-none" />
                    <span className="text-xl text-slate-400">%</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400">TARGET SALES</span>
                <div className="flex items-center gap-2">
                    <input type="number" value={globalTargets.sales} onChange={(e) => setGlobalTargets({...globalTargets, sales: e.target.value})} className="text-2xl font-bold text-slate-800 w-20 outline-none" />
                    <span className="text-xl text-slate-400">Units</span>
                </div>
            </div>
        </div>

        {/* Product Table */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="p-4 text-left">SKU / LOCAL TARGETS</th>
                  <th className="p-4 text-right">CLICKS</th>
                  <th className="p-4 text-right">AD COST</th>
                  <th className="p-4 text-right">REVENUE</th>
                  <th className="p-4 text-right">SALES</th>
                  <th className="p-4 text-right">ACOS</th>
                  <th className="p-4 text-left">STRATEGY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.sku} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{row.sku}</div>
                      <div className="flex gap-2 mt-1">
                        <input 
                            type="number" 
                            placeholder={`ACOS ${globalTargets.acos}%`}
                            value={productTargets[row.sku.toLowerCase()]?.acos || ''} 
                            onChange={(e) => setProductTargets({...productTargets, [row.sku.toLowerCase()]: {...(productTargets[row.sku.toLowerCase()] || {}), acos: e.target.value}})}
                            className="w-16 border rounded px-1 text-[10px]"
                        />
                        <input 
                            type="number" 
                            placeholder={`Sales ${globalTargets.sales}`}
                            value={productTargets[row.sku.toLowerCase()]?.sales || ''} 
                            onChange={(e) => setProductTargets({...productTargets, [row.sku.toLowerCase()]: {...(productTargets[row.sku.toLowerCase()] || {}), sales: e.target.value}})}
                            className="w-16 border rounded px-1 text-[10px]"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">{row.clicks}</td>
                    <td className="p-4 text-right text-slate-500">£{row.adCost}</td>
                    <td className="p-4 text-right font-bold text-slate-800">£{row.revenue}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{row.salesCount}</td>
                    <td className="p-4 text-right">
                      <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${parseFloat(row.acos) <= getTarget(row.sku, 'acos') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {row.acos}%
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`font-bold ${getDynamicRec(row).includes('Reduce Price') ? 'text-orange-600' : 'text-slate-700'}`}>
                          {getDynamicRec(row)}
                        </span>
                        <span className="text-[10px] text-slate-400">Based on {getTarget(row.sku, 'conv')}% Conv. Target</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <footer className="text-center p-8 text-slate-400 text-xs">
        Powered by AI Logic | Property of Zipper Scooters
      </footer>
    </div>
  );
}