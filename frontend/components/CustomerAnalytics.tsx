import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface CustomerAnalyticsProps {
  customerId: number;
  onRefreshParent: () => void;
}

interface AnalyticsData {
  profile: {
    id: number;
    customerCode: string;
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
    address?: string;
    dateOfBirth?: string;
    isActive: boolean;
    createdAt: string;
  };
  summary: {
    totalSpent: number;
    totalPurchases: number;
    lastPurchaseDate: string | null;
    loyaltyPoints: number;
    creditLimit: number;
    outstandingBalance: number;
    availableCredit: number;
  };
  spending: { month: string; visits: number; spent: number }[];
  loyalty: {
    id: number;
    pointsChange: number;
    transactionType: string;
    referenceType?: string;
    referenceId?: number;
    remarks?: string;
    createdAt: string;
  }[];
  credit: {
    id: number;
    amountChange: number;
    transactionType: string;
    referenceType?: string;
    referenceId?: number;
    remarks?: string;
    createdAt: string;
    createdByName: string;
  }[];
  favoriteProducts: { productName: string; quantity: number; orders: number }[];
}

export default function CustomerAnalytics({ customerId, onRefreshParent }: CustomerAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/customers/${customerId}/analytics`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [customerId]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);
    setPaySuccess(false);

    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid payment amount greater than zero');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetchWithAuth(`/customers/${customerId}/pay-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, remarks: payRemarks }),
      });

      if (res.ok) {
        setPaySuccess(true);
        setPayAmount('');
        setPayRemarks('');
        loadAnalytics();
        onRefreshParent();
      } else {
        const errData = await res.json();
        setPayError(errData.message || 'Payment submission failed');
      }
    } catch (err: any) {
      setPayError(err.message || 'An error occurred');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
        <span className="ml-3 text-sm text-slate-400">Computing analytics datasets...</span>
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-red-400 text-xs py-4">Failed to load analytics data.</p>;
  }

  const { summary, spending, loyalty, credit, favoriteProducts } = data;

  return (
    <div className="space-y-6 text-sm">
      {/* 1. Summary Cards Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500">Total Spent</p>
          <p className="text-lg font-extrabold text-slate-100 mt-1">Rs. {summary.totalSpent.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{summary.totalPurchases} Visits</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500">Loyalty Balance</p>
          <p className="text-lg font-extrabold text-emerald-400 mt-1">{summary.loyaltyPoints} Pts</p>
          <p className="text-[10px] text-slate-400 mt-0.5">1 Pt = 1 Rs discount</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500">Outstanding Balance</p>
          <p className="text-lg font-extrabold text-red-400 mt-1">Rs. {summary.outstandingBalance.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Credit Limit: Rs. {summary.creditLimit.toFixed(2)}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-500">Available Credit</p>
          <p className="text-lg font-extrabold text-sky-400 mt-1">Rs. {summary.availableCredit.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Limit - Balance</p>
        </div>
      </div>

      {/* 2. Middle Row: Spending Trend & Favorite Products */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Spending Trends */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Spending Trend</h4>
          {spending.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No transactions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {spending.map((s) => (
                <div key={s.month} className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-400 font-mono">{s.month}</span>
                  <span className="text-slate-500">{s.visits} orders</span>
                  <span className="text-slate-200 font-semibold">Rs. {s.spent.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Favorite Products */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Purchased Products</h4>
          {favoriteProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No products purchased yet.</p>
          ) : (
            <div className="space-y-2">
              {favoriteProducts.map((fp, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-300 truncate max-w-[180px]">{fp.productName}</span>
                  <span className="text-slate-500">{fp.orders} orders</span>
                  <span className="text-emerald-400 font-semibold">{fp.quantity} units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Action Row: Receive Balance Payment */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Receive Outstanding Payment</h4>
        <form onSubmit={handlePaySubmit} className="grid gap-4 md:grid-cols-[1.5fr_2fr_1fr] items-end">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Payment Amount (Rs.) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Remarks / Note</label>
            <input
              value={payRemarks}
              onChange={(e) => setPayRemarks(e.target.value)}
              placeholder="e.g. Cash received at counter"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submittingPayment}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors py-2 font-bold text-xs disabled:opacity-50"
          >
            {submittingPayment ? 'Logging...' : 'Submit Payment'}
          </button>
        </form>

        {payError && <p className="text-xs text-red-400 mt-1">{payError}</p>}
        {paySuccess && <p className="text-xs text-emerald-400 mt-1">✓ Payment transaction logged and balance updated!</p>}
      </div>

      {/* 4. Bottom Row: Ledgers Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Loyalty Point Ledger */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Loyalty Points Ledger</h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {loyalty.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-6 text-center">No points transactions recorded.</p>
            ) : (
              loyalty.map((l) => (
                <div key={l.id} className="rounded-lg bg-slate-950 border border-slate-850 p-2.5 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className={`font-bold ${l.pointsChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {l.pointsChange >= 0 ? `+${l.pointsChange}` : l.pointsChange} Pts
                    </span>
                    <span className="rounded bg-slate-800 px-1 text-[9px] text-slate-300 font-semibold">{l.transactionType}</span>
                  </div>
                  <p className="text-slate-400">{l.remarks}</p>
                  <p className="text-[9px] text-slate-500 font-mono">{new Date(l.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Credit Ledger */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Credit & Balances Ledger</h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {credit.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-6 text-center">No credit balance changes recorded.</p>
            ) : (
              credit.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-950 border border-slate-850 p-2.5 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className={`font-bold ${c.amountChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {c.amountChange >= 0 ? `+Rs. ${c.amountChange.toFixed(2)}` : `-Rs. ${Math.abs(c.amountChange).toFixed(2)}`}
                    </span>
                    <span className="rounded bg-slate-800 px-1 text-[9px] text-slate-300 font-semibold">{c.transactionType}</span>
                  </div>
                  <p className="text-slate-400">{c.remarks}</p>
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Logged by: {c.createdByName}</span>
                    <span className="font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
