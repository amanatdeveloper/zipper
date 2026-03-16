'use client';
export const revalidate = 0;

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Store, Plus, ArrowLeft } from 'lucide-react';

export default function Stores() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    googleClientId: '',
    googleClientSecret: '',
    googleDeveloperToken: '',
    googleRefreshToken: '',
    googleCustomerId: '',
    googleLoginCustomerId: '',
    wooUrl: '',
    wooCk: '',
    wooCs: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchStores();
  }, [session, status, router]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const result = await res.json();
      if (result.success) {
        setStores(result.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setStores([...stores, result.data]);
        setShowForm(false);
        setFormData({
          name: '',
          googleClientId: '',
          googleClientSecret: '',
          googleDeveloperToken: '',
          googleRefreshToken: '',
          googleCustomerId: '',
          googleLoginCustomerId: '',
          wooUrl: '',
          wooCk: '',
          wooCs: '',
        });
      } else {
        alert(result.error);
      }
    } catch (e) {
      console.error(e);
      alert('Error creating store');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 p-3 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600 w-7 h-7" />
            <h1 className="text-lg font-black tracking-tight uppercase">Zipper <span className="text-blue-600">Ads Engine</span></h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Store Management</h2>
            <p className="text-slate-600">Manage your connected stores and API credentials</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={16} />
            Add Store
          </button>
        </div>

        {/* Stores List */}
        <div className="grid gap-4 mb-8">
          {stores.map(store => (
            <a
              key={store.id}
              href={`/?storeId=${store.id}`}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow block"
            >
              <div className="flex items-center gap-3">
                <Store className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{store.name}</h3>
                  <p className="text-sm text-slate-500">Created {new Date(store.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </a>
          ))}
          {stores.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-lg text-center">
              <Store className="text-slate-300 mx-auto mb-4" size={48} />
              <h3 className="font-bold text-lg text-slate-900 mb-2">No stores yet</h3>
              <p className="text-slate-600 mb-4">Add your first store to start tracking performance</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Add Store
              </button>
            </div>
          )}
        </div>

        {/* Add Store Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Add New Store</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Google Ads Fields */}
                <div className="md:col-span-2">
                  <h4 className="font-bold text-slate-900 mb-4">Google Ads API Credentials</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client ID</label>
                  <input
                    type="text"
                    value={formData.googleClientId}
                    onChange={(e) => setFormData({...formData, googleClientId: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client Secret</label>
                  <input
                    type="text"
                    value={formData.googleClientSecret}
                    onChange={(e) => setFormData({...formData, googleClientSecret: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Developer Token</label>
                  <input
                    type="text"
                    value={formData.googleDeveloperToken}
                    onChange={(e) => setFormData({...formData, googleDeveloperToken: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Refresh Token</label>
                  <input
                    type="text"
                    value={formData.googleRefreshToken}
                    onChange={(e) => setFormData({...formData, googleRefreshToken: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer ID</label>
                  <input
                    type="text"
                    value={formData.googleCustomerId}
                    onChange={(e) => setFormData({...formData, googleCustomerId: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Login Customer ID</label>
                  <input
                    type="text"
                    value={formData.googleLoginCustomerId}
                    onChange={(e) => setFormData({...formData, googleLoginCustomerId: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* WooCommerce Fields */}
                <div className="md:col-span-2">
                  <h4 className="font-bold text-slate-900 mb-4">WooCommerce API Credentials</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Store URL</label>
                  <input
                    type="url"
                    value={formData.wooUrl}
                    onChange={(e) => setFormData({...formData, wooUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Consumer Key</label>
                  <input
                    type="text"
                    value={formData.wooCk}
                    onChange={(e) => setFormData({...formData, wooCk: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Consumer Secret</label>
                  <input
                    type="text"
                    value={formData.wooCs}
                    onChange={(e) => setFormData({...formData, wooCs: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Store'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}