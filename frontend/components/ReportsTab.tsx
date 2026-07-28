import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

export default function ReportsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await fetchWithAuth('/products');
        if (res.ok) {
          setProducts(await res.json());
        }
      } catch (err) {
        console.error('Failed to load report', err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-400">Compiling report analytics...</div>;
  }

  // Calculate metrics
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  const totalPotentialSales = products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0);
  const potentialProfit = totalPotentialSales - totalValue;

  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;
  const activeCount = products.filter(p => p.isActive).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-2">Inventory Valuation Report</h2>
        <p className="text-xs text-slate-400">Auditing asset valuation based on current cost prices and potential selling margins.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Cost Value */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
          <p className="text-sm font-medium text-slate-400">Total Asset Cost (Valuation)</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">Rs. {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        {/* Total Retail Value */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
          <p className="text-sm font-medium text-slate-400">Total Potential Sales (Retail)</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">Rs. {totalPotentialSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        {/* Projected Margin */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
          <p className="text-sm font-medium text-slate-400">Projected Margin (Profit)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">Rs. {potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Stock Breakdown Status</h2>
        <table className="w-full border-collapse text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-3 px-2">Metric</th>
              <th className="py-3 px-2 text-right">Value</th>
              <th className="py-3 px-2">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            <tr>
              <td className="py-3 px-2 font-medium">Total Products cataloged</td>
              <td className="py-3 px-2 text-right font-semibold">{products.length}</td>
              <td className="py-3 px-2 text-slate-400 text-xs">Total items entered in system database</td>
            </tr>
            <tr>
              <td className="py-3 px-2 font-medium">Active items online</td>
              <td className="py-3 px-2 text-right font-semibold text-emerald-400">{activeCount}</td>
              <td className="py-3 px-2 text-slate-400 text-xs">Products enabled for checkout transactions</td>
            </tr>
            <tr>
              <td className="py-3 px-2 font-medium">Low stock alerts</td>
              <td className="py-3 px-2 text-right font-semibold text-amber-400">{lowStockCount}</td>
              <td className="py-3 px-2 text-slate-400 text-xs">Items requiring replenishment orders</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
