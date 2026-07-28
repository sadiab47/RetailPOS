import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuthStore } from '../store/auth.store';

interface KPIStats {
  sales: {
    todaySales: number;
    todayTransactions: number;
    yesterdaySales: number;
    mtdSales: number;
    avgSaleValue: number;
    totalTransactions: number;
    refundPercentage: number;
    profit: number;
    profitMarginPct: number;
  };
  inventory: {
    lowStockCount: number;
    outOfStockCount: number;
  };
  customers: {
    newCustomersToday: number;
    loyaltyMembers: number;
    outstandingCredit: number;
  };
  cash: {
    activeShifts: number;
  };
}

interface InventoryValuation {
  costVal: number;
  retailVal: number;
  marginPotential: number;
  marginPotentialPct: number;
  fastMoving: { name: string; barcode: string; qtySold: number; revenue: number }[];
  slowMoving: { name: string; barcode: string; stock: number; qtySold: number }[];
}

interface SalesReportRow {
  label: string;
  transactions: number;
  revenue: number;
  profit: number;
  marginPct: number;
}

interface AuditLogRow {
  id: number;
  requestId: string;
  entityType: string;
  entityId: number;
  action: string;
  module: string;
  oldValues: any;
  newValues: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  userName: string;
  userEmail: string;
}

export default function ReportsTab() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'inventory' | 'audit'>('dashboard');

  // KPI States
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  // Sales report States
  const [salesReport, setSalesReport] = useState<SalesReportRow[]>([]);
  const [groupBy, setGroupBy] = useState('day');
  const [salesStart, setSalesStart] = useState('');
  const [salesEnd, setSalesEnd] = useState('');

  // Inventory valuation states
  const [valuation, setValuation] = useState<InventoryValuation | null>(null);

  // Audit Log states
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditAction, setAuditAction] = useState('');
  const [auditModule, setAuditModule] = useState('');
  const [auditStart, setAuditStart] = useState('');
  const [auditEnd, setAuditEnd] = useState('');

  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isAuthorized = isAdmin || isManager;

  const loadDashboardStats = async () => {
    try {
      const res = await fetchWithAuth('/reports/dashboard');
      if (res.ok) {
        setKpis(await res.json());
      }
      const lowStockRes = await fetchWithAuth('/inventory/low-stock');
      if (lowStockRes.ok) {
        setLowStockProducts(await lowStockRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInventoryValuation = async () => {
    try {
      const res = await fetchWithAuth('/reports/inventory');
      if (res.ok) {
        setValuation(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSalesReport = async () => {
    try {
      let url = `/reports/sales?groupBy=${groupBy}`;
      if (salesStart) url += `&startDate=${salesStart}`;
      if (salesEnd) url += `&endDate=${salesEnd}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        setSalesReport(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      let url = '/reports/audit-logs?';
      if (auditAction) url += `&action=${auditAction}`;
      if (auditModule) url += `&module=${auditModule}`;
      if (auditStart) url += `&startDate=${auditStart}`;
      if (auditEnd) url += `&endDate=${auditEnd}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      if (activeTab === 'dashboard') loadDashboardStats();
      else if (activeTab === 'inventory') loadInventoryValuation();
      else if (activeTab === 'sales') loadSalesReport();
      else if (activeTab === 'audit' && isAdmin) loadAuditLogs();
    }
  }, [activeTab, groupBy, salesStart, salesEnd, auditAction, auditModule, auditStart, auditEnd]);

  // Export Sales Report to CSV
  const handleExportCSV = () => {
    if (salesReport.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Group Label,Transactions,Revenue (Rs.),Profit (Rs.),Gross Margin (%)\n';

    salesReport.forEach((row) => {
      const label = `"${row.label.replace(/"/g, '""')}"`;
      csvContent += `${label},${row.transactions},${row.revenue.toFixed(2)},${row.profit.toFixed(2)},${row.marginPct.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_Group_By_${groupBy}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    return (
      <div className="rounded-2xl border border-red-900 bg-red-950/20 p-6 text-center text-red-400">
        <p className="text-sm font-semibold">Access Denied. You do not have permission to view Reports & Analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher Headers */}
      <div className="flex border-b border-slate-800 pb-px text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 transition-colors border-b-2 ${
            activeTab === 'dashboard' ? 'border-emerald-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Dashboard Overview
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 transition-colors border-b-2 ${
            activeTab === 'sales' ? 'border-emerald-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Sales reports
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 transition-colors border-b-2 ${
            activeTab === 'inventory' ? 'border-emerald-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Inventory Valuation
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 transition-colors border-b-2 ${
              activeTab === 'audit' ? 'border-emerald-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Audit Log Viewer
          </button>
        )}
      </div>

      {/* TABS VIEW CONTROLLERS */}
      {activeTab === 'dashboard' && kpis && (
        <div className="grid gap-6">
          {/* Overview Stat Widgets */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Today's Sales</p>
              <p className="text-xl font-bold text-slate-100 mt-1">Rs. {kpis.sales.todaySales.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{kpis.sales.todayTransactions} Cash transactions</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Today's Gross Profit</p>
              <p className="text-xl font-bold text-emerald-450 mt-1">Rs. {kpis.sales.profit.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Margin: {kpis.sales.profitMarginPct.toFixed(1)}%</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">MTD Total Sales</p>
              <p className="text-xl font-bold text-slate-100 mt-1">Rs. {kpis.sales.mtdSales.toFixed(2)}</p>
              <p className="text-[10px] text-slate-550 mt-1">Avg Basket: Rs. {kpis.sales.avgSaleValue.toFixed(2)}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Outstanding store Credit</p>
              <p className="text-xl font-bold text-amber-450 mt-1">Rs. {kpis.customers.outstandingCredit.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{kpis.customers.loyaltyMembers} Loyalty members</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Low stock Alerts */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-red-400">⚠️ Low Stock Alerts ({kpis.inventory.lowStockCount})</h3>
              <div className="overflow-x-auto text-xs max-h-56">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800">
                      <th className="py-2">Product</th>
                      <th className="py-2">Barcode</th>
                      <th className="py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 text-slate-300 font-semibold">{p.name}</td>
                        <td className="py-2 text-slate-500">{p.barcode}</td>
                        <td className="py-2 text-right text-red-400 font-bold">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operational details panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-200">Register Operations Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Active Register shifts:</span>
                  <span className="font-bold text-slate-200">{kpis.cash.activeShifts} Shifts currently OPEN</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">New loyalty sign-ups today:</span>
                  <span className="font-bold text-slate-200">{kpis.customers.newCustomersToday} Members</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Refunds ratio:</span>
                  <span className="font-bold text-red-400">{kpis.sales.refundPercentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALES REPORTS TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-end gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="cashier">Cashier</option>
                <option value="register">Register</option>
                <option value="payment_method">Payment Method</option>
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={salesStart}
                onChange={(e) => setSalesStart(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={salesEnd}
                onChange={(e) => setSalesEnd(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-slate-200 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="ml-auto rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 font-semibold text-slate-100 transition-colors"
            >
              Export Report to CSV
            </button>
          </div>

          {/* Report Summary Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-450 border-b border-slate-800 text-[10px] uppercase font-bold">
                  <th className="py-2">Group Label</th>
                  <th className="py-2">Transactions</th>
                  <th className="py-2 text-right">Revenue (Rs.)</th>
                  <th className="py-2 text-right">Gross Profit (Rs.)</th>
                  <th className="py-2 text-right">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {salesReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/20">
                    <td className="py-2.5 font-semibold text-slate-200">{row.label}</td>
                    <td className="py-2.5 text-slate-400">{row.transactions}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-300">Rs. {row.revenue.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-450">Rs. {row.profit.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-400">{row.marginPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVENTORY VALUATION TAB */}
      {activeTab === 'inventory' && valuation && (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Inventory Value (Cost)</p>
              <p className="text-lg font-bold text-slate-200 mt-1">Rs. {valuation.costVal.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Inventory Value (Retail)</p>
              <p className="text-lg font-bold text-slate-200 mt-1">Rs. {valuation.retailVal.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gross Margin Potential</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">Rs. {valuation.marginPotential.toFixed(2)}</p>
              <p className="text-[10px] text-slate-550 mt-1">Margin Pct: {valuation.marginPotentialPct.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Fast moving */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-250">🔥 Fast-Moving Products (Last 30 days)</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase">
                      <th className="py-2">Product</th>
                      <th className="py-2">Barcode</th>
                      <th className="py-2 text-right">Sold</th>
                      <th className="py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {valuation.fastMoving.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-350 font-semibold">{p.name}</td>
                        <td className="py-2 text-slate-500">{p.barcode}</td>
                        <td className="py-2 text-right text-slate-300 font-bold">{p.qtySold}</td>
                        <td className="py-2 text-right text-emerald-450 font-semibold">Rs. {p.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Slow moving */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-250">⌛ Slow-Moving / Dead Stock Products</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase">
                      <th className="py-2">Product</th>
                      <th className="py-2">Barcode</th>
                      <th className="py-2 text-right">In Stock</th>
                      <th className="py-2 text-right">Qty Sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {valuation.slowMoving.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-350 font-semibold">{p.name}</td>
                        <td className="py-2 text-slate-500">{p.barcode}</td>
                        <td className="py-2 text-right text-slate-300 font-bold">{p.stock}</td>
                        <td className="py-2 text-right text-red-400 font-bold">{p.qtySold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG VIEWER TAB */}
      {activeTab === 'audit' && isAdmin && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Action</label>
              <select
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Module</label>
              <select
                value={auditModule}
                onChange={(e) => setAuditModule(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="">All Modules</option>
                <option value="AUTH">AUTH</option>
                <option value="INVENTORY">INVENTORY</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="REGISTER">REGISTER</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={auditStart}
                onChange={(e) => setAuditStart(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={auditEnd}
                onChange={(e) => setAuditEnd(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-450 border-b border-slate-800 text-[10px] uppercase font-bold">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Module / Action</th>
                  <th className="py-2">IP & Agent</th>
                  <th className="py-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/20">
                    <td className="py-2.5 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2.5">
                      <p className="font-semibold text-slate-200">{log.userName}</p>
                      <p className="text-[10px] text-slate-500">{log.userEmail}</p>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        {log.module}
                      </span>
                      <span className="ml-1.5 text-[10px] font-bold text-emerald-400">{log.action}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 max-w-[200px] truncate">
                      <p className="text-[10px]">{log.ipAddress}</p>
                      <p className="text-[8px] truncate">{log.userAgent}</p>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="text-xs text-sky-400 hover:text-sky-350"
                      >
                        {expandedLogId === log.id ? 'Hide Detail' : 'View Payload'}
                      </button>
                      {expandedLogId === log.id && (
                        <div className="text-left mt-2 p-3 bg-slate-950 rounded-lg max-w-lg border border-slate-800 overflow-x-auto text-[9px] font-mono whitespace-pre-wrap">
                          <p className="text-slate-400 font-bold mb-1">Old Values:</p>
                          <p className="text-red-400 mb-2">{log.oldValues ? JSON.stringify(log.oldValues, null, 2) : 'None'}</p>
                          <p className="text-slate-400 font-bold mb-1">New Values:</p>
                          <p className="text-emerald-450">{log.newValues ? JSON.stringify(log.newValues, null, 2) : 'None'}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
