import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { adjustmentSchema } from '../lib/validation';
import { useAuthStore } from '../store/auth.store';

interface Product {
  id: number;
  name: string;
  barcode: string;
  stock: number;
}

interface Transaction {
  id: number;
  productId: number;
  productName: string;
  barcode: string;
  transactionType: string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  remarks: string | null;
  creator: string | null;
  createdAt: string;
}

export default function InventoryTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Adjustment Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transactionType, setTransactionType] = useState('ADJUSTMENT');
  const [quantityChange, setQuantityChange] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');

  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const loadData = async () => {
    const [pRes, tRes] = await Promise.all([
      fetchWithAuth('/products'),
      fetchWithAuth(`/inventory/history?productId=${filterProduct}&transactionType=${filterType}`),
    ]);
    if (pRes.ok) setProducts(await pRes.ok ? await pRes.json() : []);
    if (tRes.ok) setTransactions(await tRes.json());
  };

  useEffect(() => {
    loadData();
  }, [filterProduct, filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedData = {
      productId: Number(selectedProductId),
      transactionType,
      quantityChange: Number(quantityChange),
      remarks: remarks || undefined,
    };

    const validation = adjustmentSchema.safeParse(parsedData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const res = await fetchWithAuth('/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Adjustment execution failed');
      }

      setSelectedProductId('');
      setQuantityChange('');
      setRemarks('');
      setTransactionType('ADJUSTMENT');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Adjustment Panel */}
        <div>
          {isAdminOrManager ? (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Stock Adjustment</h2>
              <p className="text-xs text-slate-400">Creates a ledger record and directly adjusts product quantity.</p>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Select Product</label>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required>
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.barcode}) - Current: {p.stock}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Adjustment Type</label>
                  <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                    <option value="DAMAGE">DAMAGE</option>
                    <option value="RETURN">RETURN</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Quantity Change</label>
                  <input value={quantityChange} onChange={(e) => setQuantityChange(e.target.value)} type="number" placeholder="e.g. -5 or 12" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Remarks / Reason</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Reason for change..." required />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2 font-semibold text-slate-950">
                Post Adjustment
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400">
              Stock adjustments require Administrative privileges.
            </div>
          )}
        </div>

        {/* Ledger Log Filter & Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">Inventory Transaction Ledger</h2>

          {/* Table Filters */}
          <div className="grid gap-3 grid-cols-2">
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-xs">
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-xs">
              <option value="">All Transaction Types</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="SALE">SALE</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="DAMAGE">DAMAGE</option>
              <option value="RETURN">RETURN</option>
              <option value="INITIAL_STOCK">INITIAL_STOCK</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <p className="text-slate-500 text-sm">No transaction entries found.</p>
            ) : (
              <table className="w-full border-collapse text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2 px-1">Date</th>
                    <th className="py-2 px-1">Product</th>
                    <th className="py-2 px-1">Type</th>
                    <th className="py-2 px-1 text-center">Change</th>
                    <th className="py-2 px-1 text-center">Balances</th>
                    <th className="py-2 px-1">User/Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2 px-1 text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-1">
                        <p className="font-semibold">{tx.productName}</p>
                        <p className="text-[10px] text-slate-500">{tx.barcode}</p>
                      </td>
                      <td className="py-2 px-1">
                        <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-bold ${
                          tx.transactionType === 'PURCHASE' ? 'bg-emerald-950 text-emerald-400' :
                          tx.transactionType === 'SALE' ? 'bg-sky-950 text-sky-400' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className={`py-2 px-1 text-center font-bold ${tx.quantityChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400">
                        {tx.quantityBefore} → {tx.quantityAfter}
                      </td>
                      <td className="py-2 px-1 max-w-[150px] truncate">
                        <p className="text-slate-300 font-medium">{tx.creator || 'System'}</p>
                        <p className="text-[10px] text-slate-500" title={tx.remarks || ''}>{tx.remarks || 'No remarks'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
