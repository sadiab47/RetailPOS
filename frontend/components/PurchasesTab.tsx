import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { purchaseOrderSchema } from '../lib/validation';
import { useAuthStore } from '../store/auth.store';

interface Supplier {
  id: number;
  companyName: string;
}

interface Product {
  id: number;
  name: string;
  barcode: string;
  costPrice: number;
}

interface PurchaseItemInput {
  productId: number;
  quantity: number;
  unitCost: number;
}

export default function PurchasesTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<PurchaseItemInput[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const loadData = async () => {
    const [sRes, pRes] = await Promise.all([
      fetchWithAuth('/suppliers'),
      fetchWithAuth('/products'),
    ]);
    if (sRes.ok) setSuppliers(await sRes.json());
    if (pRes.ok) setProducts(await pRes.json());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: 0, quantity: 1, unitCost: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemInput, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Auto-fill cost price from selected product
        if (field === 'productId') {
          const matchedProduct = products.find((p) => p.id === value);
          if (matchedProduct) {
            updated.unitCost = matchedProduct.costPrice;
          }
        }
        return updated;
      })
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedData = {
      supplierId: Number(supplierId),
      items: items.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      })),
    };

    const validation = purchaseOrderSchema.safeParse(parsedData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const res = await fetchWithAuth('/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to book purchase order');
      }

      alert('Purchase Order posted successfully! Stock levels updated.');
      setSupplierId('');
      setItems([]);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {isAdminOrManager ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">Create Purchase Order</h2>
          <p className="text-xs text-slate-400">Books incoming inventory, updates cost pricing, and logs transaction audits.</p>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Select Supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required>
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.companyName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-slate-200">Order Items</h3>
              <button type="button" onClick={handleAddItem} className="rounded-lg bg-sky-600 hover:bg-sky-500 text-xs px-3 py-1.5 font-semibold text-slate-100">
                + Add Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid gap-3 grid-cols-[2fr_1fr_1fr_auto] items-end bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Product</label>
                  <select value={item.productId || ''} onChange={(e) => handleItemChange(index, 'productId', Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100 text-sm" required>
                    <option value="">-- Choose --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit Cost</label>
                  <input type="number" step="0.01" min="0.01" value={item.unitCost} onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100 text-sm" required />
                </div>
                <button type="button" onClick={() => handleRemoveItem(index)} className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs text-slate-100">
                  Delete
                </button>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="flex justify-between items-center rounded-xl bg-slate-950/70 p-4 border border-slate-800/80">
              <span className="font-semibold text-slate-300">Total Purchase Cost:</span>
              <span className="text-xl font-bold text-emerald-400">Rs. {calculateTotal().toFixed(2)}</span>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={items.length === 0} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 py-2 font-semibold text-slate-950">
            Book Purchase Order & Receive Stock
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">
          Purchase orders require Administrative privileges.
        </div>
      )}
    </div>
  );
}
