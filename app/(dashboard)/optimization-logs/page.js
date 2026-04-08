'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { History, RefreshCw, Trash2 } from 'lucide-react';

const LEARNING_PHASE_DAYS = 14;

function OptimizationLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removingIds, setRemovingIds] = useState({});

  useEffect(() => {
    if (!storeId) {
      setLogs([]);
      setError('');
      return;
    }

    fetchLogs(storeId);
  }, [router, storeId]);

  const fetchLogs = async (activeStoreId) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/optimize?storeId=${activeStoreId}`);
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Unable to load optimization logs');
      }

      setLogs(result.data);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.message || 'Unable to load optimization logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) =>
    new Date(dateValue).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const getStatusMeta = (appliedAt) => {
    const appliedDate = new Date(appliedAt);
    const learningEndsAt = new Date(appliedDate);
    learningEndsAt.setDate(learningEndsAt.getDate() + LEARNING_PHASE_DAYS);
    const isActive = learningEndsAt >= new Date();

    return {
      label: isActive ? 'Active Learning' : 'Completed',
      classes: isActive
        ? 'bg-amber-100 text-amber-800 border border-amber-200'
        : 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  };

  const handleRemoveLog = async (id) => {
    if (!storeId || !id) return;

    setRemovingIds((current) => ({ ...current, [id]: true }));

    try {
      const res = await fetch('/api/optimize', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          storeId,
        }),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Unable to remove optimization log');
      }

      setLogs((current) => current.filter((log) => log.id !== id));
    } catch (removeError) {
      console.error(removeError);
      alert(removeError.message || 'Unable to remove optimization log');
    } finally {
      setRemovingIds((current) => ({ ...current, [id]: false }));
    }
  };

  if (!storeId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <History className="text-blue-600" size={24} />
            <h1 className="text-2xl font-black text-slate-900">Optimization Logs</h1>
          </div>
          <p className="text-slate-600">Choose a store from the dropdown in the top navigation to view its logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <History className="text-blue-600" size={24} />
            <h1 className="text-2xl font-black text-slate-900">Optimization Logs</h1>
          </div>
          <p className="text-slate-600">Review optimization history for the selected store and manage active learning windows.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs(storeId)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
          <span className="font-bold text-xs uppercase tracking-wider">Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : null}

        {!error ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-[0.15em] font-black">
                  <th className="p-4">SKU</th>
                  <th className="p-4">Optimization Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action Taken</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const statusMeta = getStatusMeta(log.appliedAt);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-black text-slate-900">{log.sku}</td>
                      <td className="p-4 text-slate-700">{formatDate(log.appliedAt)}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusMeta.classes}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{log.actionTaken || 'Marked as optimized'}</td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLog(log.id)}
                          disabled={Boolean(removingIds[log.id])}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          {removingIds[log.id] ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && logs.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No optimization logs found for this store yet.
          </div>
        ) : null}

        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading optimization logs...</div>
        ) : null}
      </div>
    </div>
  );
}

export default function OptimizationLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <OptimizationLogsContent />
    </Suspense>
  );
}
