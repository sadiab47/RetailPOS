import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalCategories: number;
  totalSuppliers: number;
}

export default function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    totalCategories: 0,
    totalSuppliers: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Fetch products, categories, suppliers, low stock, history
        const [prodRes, catRes, supRes, lowRes, histRes] = await Promise.all([
          fetchWithAuth('/products'),
          fetchWithAuth('/categories'),
          fetchWithAuth('/suppliers'),
          fetchWithAuth('/inventory/low-stock'),
          fetchWithAuth('/inventory/history'),
        ]);

        const prods = prodRes.ok ? await prodRes.json() : [];
        const cats = catRes.ok ? await catRes.json() : [];
        const sups = supRes.ok ? await supRes.json() : [];
        const lowStock = lowRes.ok ? await lowRes.json() : [];
        const history = histRes.ok ? await histRes.json() : [];

        setStats({
          totalProducts: prods.length,
          lowStockCount: lowStock.length,
          totalCategories: cats.length,
          totalSuppliers: sups.length,
        });

        setLowStockItems(lowStock.slice(0, 5));
        setRecentTransactions(history.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-400">Loading dashboard metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
          <p className="text-sm font-medium text-slate-400">Total Products</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{stats.totalProducts}</p>
        </div>

        {/* Low Stock Alerts */}
        <div className={`rounded-2xl border p-6 shadow-xl ${stats.lowStockCount > 0 ? 'border-amber-900/50 bg-amber-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
          <p className="text-sm font-medium text-slate-400">Low Stock Alerts</p>
          <p className={`mt-2 text-3xl font-semibold ${stats.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{stats.lowStockCount}</p>
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
          <p className="text-sm font-medium text-slate-400">Categories</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{stats.totalCategories}</p>
        </div>

        {/* Suppliers */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
          <p className="text-sm font-medium text-slate-400">Active Suppliers</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{stats.totalSuppliers}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Watchlist */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Low Stock Warning List</h2>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-emerald-400">🟢 All products are sufficiently stocked.</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div>
                    <p className="font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-400">SKU: {item.sku || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded px-2 py-1 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/40">
                      {item.stock} / {item.lowStockThreshold} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Ledger Transactions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Recent Stock Movements</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-500">No stock movements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div>
                    <p className="font-medium text-slate-200">{tx.productName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        tx.transactionType === 'PURCHASE' ? 'bg-emerald-950 text-emerald-400' :
                        tx.transactionType === 'SALE' ? 'bg-sky-950 text-sky-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {tx.transactionType}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right font-semibold">
                    <span className={tx.quantityChange > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
