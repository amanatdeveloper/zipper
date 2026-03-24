'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Pencil, Shield, Store, UserPlus } from 'lucide-react';
import { DEFAULT_AUDIT_PROMPT } from '../../lib/page-audit.js';

const initialStoreForm = {
  name: '',
  userId: '',
  auditPrompt: DEFAULT_AUDIT_PROMPT,
  googleClientId: '',
  googleClientSecret: '',
  googleDeveloperToken: '',
  googleRefreshToken: '',
  googleCustomerId: '',
  googleLoginCustomerId: '',
  wooUrl: '',
  wooCk: '',
  wooCs: '',
};

const initialUserForm = {
  email: '',
  password: '',
  role: 'STORE_USER',
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeForm, setStoreForm] = useState(initialStoreForm);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [editingStoreId, setEditingStoreId] = useState('');
  const [editingUserId, setEditingUserId] = useState('');
  const [editingStoreForm, setEditingStoreForm] = useState(initialStoreForm);
  const [editingUserForm, setEditingUserForm] = useState(initialUserForm);
  const [savingStore, setSavingStore] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [updatingStore, setUpdatingStore] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }

    fetchAdminData();
  }, [session, status, router]);

  const fetchAdminData = async () => {
    try {
      const [usersRes, storesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/stores'),
      ]);

      const [usersResult, storesResult] = await Promise.all([usersRes.json(), storesRes.json()]);

      if (usersResult.success) setUsers(usersResult.data);
      if (storesResult.success) setStores(storesResult.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to create user');
        return;
      }

      setUsers((current) => [result.data, ...current]);
      setUserForm(initialUserForm);
      fetchAdminData();
    } catch (error) {
      console.error(error);
      alert('Unable to create user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setSavingStore(true);

    try {
      const payload = {
        ...storeForm,
        userId: storeForm.userId || null,
      };

      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to create store');
        return;
      }

      setStores((current) => [result.data, ...current]);
      setStoreForm(initialStoreForm);
      fetchAdminData();
    } catch (error) {
      console.error(error);
      alert('Unable to create store');
    } finally {
      setSavingStore(false);
    }
  };

  const startEditingStore = async (storeId) => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to load store');
        return;
      }

      setEditingStoreId(storeId);
      setEditingStoreForm({
        name: result.data.name || '',
        userId: result.data.userId || '',
        auditPrompt: result.data.auditPrompt || DEFAULT_AUDIT_PROMPT,
        googleClientId: result.data.googleClientId || '',
        googleClientSecret: result.data.googleClientSecret || '',
        googleDeveloperToken: result.data.googleDeveloperToken || '',
        googleRefreshToken: result.data.googleRefreshToken || '',
        googleCustomerId: result.data.googleCustomerId || '',
        googleLoginCustomerId: result.data.googleLoginCustomerId || '',
        wooUrl: result.data.wooUrl || '',
        wooCk: result.data.wooCk || '',
        wooCs: result.data.wooCs || '',
      });
    } catch (error) {
      console.error(error);
      alert('Unable to load store');
    }
  };

  const startEditingUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to load user');
        return;
      }

      setEditingUserId(userId);
      setEditingUserForm({
        email: result.data.email || '',
        password: '',
        role: result.data.role || 'STORE_USER',
      });
    } catch (error) {
      console.error(error);
      alert('Unable to load user');
    }
  };

  const handleUpdateStore = async (e) => {
    e.preventDefault();
    if (!editingStoreId) return;
    setUpdatingStore(true);

    try {
      const res = await fetch(`/api/stores/${editingStoreId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingStoreForm,
          userId: editingStoreForm.userId || null,
        }),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to update store');
        return;
      }

      setEditingStoreId('');
      setEditingStoreForm(initialStoreForm);
      fetchAdminData();
    } catch (error) {
      console.error(error);
      alert('Unable to update store');
    } finally {
      setUpdatingStore(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUserId) return;
    setUpdatingUser(true);

    try {
      const res = await fetch(`/api/admin/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUserForm),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Unable to update user');
        return;
      }

      setEditingUserId('');
      setEditingUserForm(initialUserForm);
      fetchAdminData();
    } catch (error) {
      console.error(error);
      alert('Unable to update user');
    } finally {
      setUpdatingUser(false);
    }
  };

  const renderStoreFields = (form, setForm) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-2">AI Audit Prompt</label>
        <textarea
          value={form.auditPrompt}
          onChange={(e) => setForm({ ...form, auditPrompt: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          placeholder={DEFAULT_AUDIT_PROMPT}
        />
        <p className="mt-2 text-xs text-slate-500">
          Super admins can tailor the CRO instructions used when the AI audits live product pages.
        </p>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-2">Assign to User ID</label>
        <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email} ({user.id})
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2 pt-2">
        <h4 className="text-sm font-black text-slate-900">Google Ads Credentials</h4>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Google Client ID</label>
        <input type="text" value={form.googleClientId} onChange={(e) => setForm({ ...form, googleClientId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Google Client Secret</label>
        <input type="text" value={form.googleClientSecret} onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Google Developer Token</label>
        <input type="text" value={form.googleDeveloperToken} onChange={(e) => setForm({ ...form, googleDeveloperToken: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Google Refresh Token</label>
        <input type="text" value={form.googleRefreshToken} onChange={(e) => setForm({ ...form, googleRefreshToken: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Google Customer ID</label>
        <input type="text" value={form.googleCustomerId} onChange={(e) => setForm({ ...form, googleCustomerId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Google Login Customer ID</label>
        <input type="text" value={form.googleLoginCustomerId} onChange={(e) => setForm({ ...form, googleLoginCustomerId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div className="md:col-span-2 pt-2">
        <h4 className="text-sm font-black text-slate-900">WooCommerce Credentials</h4>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">WooCommerce URL</label>
        <input type="url" value={form.wooUrl} onChange={(e) => setForm({ ...form, wooUrl: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">WooCommerce Consumer Key</label>
        <input type="text" value={form.wooCk} onChange={(e) => setForm({ ...form, wooCk: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-2">WooCommerce Consumer Secret</label>
        <input type="text" value={form.wooCs} onChange={(e) => setForm({ ...form, wooCs: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
      </div>
    </div>
  );

  if (status === 'loading') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
          <Shield size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Super Admin</h1>
          <p className="text-slate-600">Create users, create stores, assign stores, and edit any saved credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="text-blue-600" size={18} />
            <h2 className="text-lg font-black text-slate-900">Create User</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                <option value="STORE_USER">STORE_USER</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
            <button type="submit" disabled={savingUser} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg disabled:opacity-60">
              {savingUser ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Store className="text-blue-600" size={18} />
            <h2 className="text-lg font-black text-slate-900">Add Store</h2>
          </div>

          <form onSubmit={handleCreateStore} className="space-y-4">
            {renderStoreFields(storeForm, setStoreForm)}
            <button type="submit" disabled={savingStore} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg disabled:opacity-60">
              {savingStore ? 'Creating...' : 'Create Store'}
            </button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900">Users</h2>
            {editingUserId ? <span className="text-xs font-bold text-blue-600">Editing user</span> : null}
          </div>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{user.email}</div>
                    <div className="text-xs text-slate-500 mt-1">ID: {user.id}</div>
                    <div className="text-xs text-slate-600 mt-1">Role: {user.role}</div>
                    <div className="text-xs text-slate-500 mt-2">
                      Stores: {user.stores?.length ? user.stores.map((store) => store.name).join(', ') : 'None'}
                    </div>
                  </div>
                  <button onClick={() => startEditingUser(user.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingUserId ? (
            <form onSubmit={handleUpdateUser} className="mt-6 space-y-4 border-t border-slate-200 pt-6">
              <h3 className="text-base font-black text-slate-900">Edit User</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input type="email" value={editingUserForm.email} onChange={(e) => setEditingUserForm({ ...editingUserForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <input type="password" value={editingUserForm.password} onChange={(e) => setEditingUserForm({ ...editingUserForm, password: e.target.value })} placeholder="Leave blank to keep current password" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select value={editingUserForm.role} onChange={(e) => setEditingUserForm({ ...editingUserForm, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="STORE_USER">STORE_USER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={updatingUser} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg disabled:opacity-60">
                  {updatingUser ? 'Saving...' : 'Update User'}
                </button>
                <button type="button" onClick={() => { setEditingUserId(''); setEditingUserForm(initialUserForm); }} className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900">Stores</h2>
            {editingStoreId ? <span className="text-xs font-bold text-blue-600">Editing store credentials</span> : null}
          </div>
          <div className="space-y-3">
            {stores.map((store) => (
              <div key={store.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{store.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Store ID: {store.id}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Assigned User ID: {store.userId || 'Unassigned'}
                    </div>
                  </div>
                  <button onClick={() => startEditingStore(store.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingStoreId ? (
            <form onSubmit={handleUpdateStore} className="mt-6 space-y-4 border-t border-slate-200 pt-6">
              <h3 className="text-base font-black text-slate-900">Edit Store</h3>
              {renderStoreFields(editingStoreForm, setEditingStoreForm)}
              <div className="flex gap-3">
                <button type="submit" disabled={updatingStore} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg disabled:opacity-60">
                  {updatingStore ? 'Saving...' : 'Update Store'}
                </button>
                <button type="button" onClick={() => { setEditingStoreId(''); setEditingStoreForm(initialStoreForm); }} className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
