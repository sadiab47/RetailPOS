import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { supplierSchema } from '../lib/validation';
import { useAuthStore } from '../store/auth.store';

interface Supplier {
  id: number;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const loadSuppliers = async () => {
    const res = await fetchWithAuth('/suppliers');
    if (res.ok) {
      setSuppliers(await res.json());
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = supplierSchema.safeParse({ companyName, contactPerson, phone, email, address, isActive });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const url = editingId ? `/suppliers/${editingId}` : '/suppliers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, contactPerson, phone, email, address, isActive }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save supplier');
      }

      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsActive(true);
      setEditingId(null);
      loadSuppliers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setCompanyName(supplier.companyName);
    setContactPerson(supplier.contactPerson || '');
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setAddress(supplier.address || '');
    setIsActive(supplier.isActive);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const res = await fetchWithAuth(`/suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete supplier');
      }
      loadSuppliers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      {/* Editor Panel */}
      <div>
        {isAdminOrManager ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-slate-100">{editingId ? 'Edit Supplier' : 'Register Supplier'}</h2>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Contact Person</label>
              <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="isActive" className="rounded bg-slate-950 border-slate-700 h-4 w-4" />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-300">Active Vendor</label>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors py-2 font-semibold text-slate-950">
                {editingId ? 'Update' : 'Register'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setCompanyName(''); setContactPerson(''); setPhone(''); setEmail(''); setAddress(''); setIsActive(true); setError(null); }} className="rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors px-4 py-2 font-semibold text-slate-100">
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">
            CRUD adjustments require Administrative privileges.
          </div>
        )}
      </div>

      {/* List Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Registered Suppliers</h2>
        {suppliers.length === 0 ? (
          <p className="text-slate-500">No suppliers registered.</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((sup) => (
              <div key={sup.id} className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-200">{sup.companyName}</h3>
                    <span className={`inline-block rounded-full h-2 w-2 ${sup.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  {sup.contactPerson && <p className="text-sm text-slate-300">Contact: {sup.contactPerson}</p>}
                  <p className="text-xs text-slate-400">
                    {sup.phone && `📞 ${sup.phone}`} {sup.email && ` | ✉️ ${sup.email}`}
                  </p>
                  {sup.address && <p className="text-xs text-slate-400 italic">{sup.address}</p>}
                </div>
                {isAdminOrManager && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleEdit(sup)} className="text-xs text-sky-400 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(sup.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
