'use client';
import { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [range, setRange] = useState('30');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to fetch data - wrapped in useCallback to prevent unnecessary re-renders
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      console.log(`Requesting: /api/report?start=${startDate}&end=${endDate}`);
      const res = await fetch(`/api/report?start=${startDate}&end=${endDate}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]); // Jab bhi dates badleingi, ye function update ho jayega

  // Dropdown change handle karne ka function
  const handleRangeChange = (value) => {
    setRange(value);
    const end = new Date();
    let start = new Date();

    if (value === '7') {
      start.setDate(start.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (value === '30') {
      start.setDate(start.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
    // Custom range mein hum dates ko nahi cherenge, user khud change karega
  };

  // Jab bhi dates badlein, data fetch karo
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
           <TrendingUp className="text-blue-600 w-6 h-6" />
           <h1 className="text-xl font-bold text-slate-800">Zippper Ads Profit Engine</h1>
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border">
            <select 
              value={range} 
              onChange={(e) => handleRangeChange(e.target.value)} 
              className="bg-transparent p-2 text-sm font-medium outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {range === 'custom' && (
            <div className="flex gap-2 items-center animate-in fade-in slide-in-from-right-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="border p-2 rounded text-sm shadow-sm" 
              />
              <span className="text-slate-400">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="border p-2 rounded text-sm shadow-sm" 
              />
            </div>
          )}

          <button 
            onClick={fetchData} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex gap-2 items-center transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>
      </header>
      
      <main className="p-4 md:p-8">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                <tr>
                  <th className="p-4">Product SKU</th>
                  <th className="p-4 text-right">Ad Cost</th>
                  <th className="p-4 text-right">Revenue</th>
                  <th className="p-4 text-right">Sales</th>
                  <th className="p-4 text-right">ACOS%</th>
                  <th className="p-4 text-left">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.length > 0 ? (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-700">{row.sku}</td>
                      <td className="p-4 text-right text-slate-600">£{row.adCost}</td>
                      <td className="p-4 text-right font-bold text-emerald-600">£{row.revenue}</td>
                      <td className="p-4 text-right font-medium">{row.salesCount}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-1 rounded ${parseFloat(row.acos) < 15 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {row.acos}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-700 italic">{row.recommendation}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400">
                      {loading ? 'Loading live data...' : 'No data found for this period.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center border-t bg-white text-slate-500">
        Developed by: <span className="text-blue-600 font-bold hover:underline cursor-pointer">Amanat Developers</span>
      </footer>
    </div>
  );
}