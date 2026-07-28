import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import CustomerForm from './CustomerForm';
import CustomerAnalytics from './CustomerAnalytics';

interface Customer {
  id: number;
  customerCode: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
  loyaltyPoints: number;
  creditLimit: number;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: string;
  stats: {
    lastPurchaseDate: string | null;
    totalPurchases: number;
    totalSpent: number;
  };
}

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);

      const res = await fetchWithAuth(`/customers?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        // Refresh details of currently selected customer if open
        if (selectedCustomer) {
          const updated = data.find((c: Customer) => c.id === selectedCustomer.id);
          if (updated) {
            setSelectedCustomer(updated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer profile?')) return;
    try {
      const res = await fetchWithAuth(`/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedCustomer(null);
        loadCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = () => {
    setFormInitialData(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setFormInitialData(customer);
    setIsFormOpen(true);
  };

  const handleFormSubmitApi = async (formData: any) => {
    const isEdit = !!formInitialData;
    const url = isEdit ? `/customers/${formInitialData.id}` : '/customers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      return { ok: true };
    } else {
      const data = await res.json();
      return { ok: false, error: data.message || 'Action failed' };
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {/* LEFT: Customer List & Search */}
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-100">Customer Directory</h2>
          <button
            onClick={handleOpenCreate}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors"
          >
            + Register Customer
          </button>
        </div>

        {/* Search Input */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone number, email, code..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />

        {/* List Directory */}
        <div className="flex-1 overflow-y-auto max-h-[450px] space-y-2">
          {customers.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">No customer profiles found.</p>
          ) : (
            customers.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${
                  selectedCustomer?.id === c.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-100">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Code: {c.customerCode} | Phone: {c.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                    Pts: {c.loyaltyPoints}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Customer Detail Panel */}
      <div className="flex flex-col">
        {selectedCustomer ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">
                  {selectedCustomer.customerCode}
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(selectedCustomer)}
                  className="rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/40 border border-sky-600/40 px-3 py-1.5 text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedCustomer.id)}
                  className="rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-600/40 px-3 py-1.5 text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Customer Dashboard analytics and ledgers */}
            <CustomerAnalytics customerId={selectedCustomer.id} onRefreshParent={loadCustomers} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
            <p className="text-sm">Select a customer directory card to display their complete profile details and purchase summary.</p>
          </div>
        )}
      </div>

      {/* Form Overlay Modal */}
      {isFormOpen && (
        <CustomerForm
          initialData={formInitialData}
          onSave={() => {
            setIsFormOpen(false);
            loadCustomers();
          }}
          onCancel={() => setIsFormOpen(false)}
          onSubmitApi={handleFormSubmitApi}
        />
      )}
    </div>
  );
}
