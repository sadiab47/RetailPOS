"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../lib/auth';
import LogoutButton from '../components/LogoutButton';

// Tab Components
import DashboardTab from '../components/DashboardTab';
import ProductsTab from '../components/ProductsTab';
import CategoriesTab from '../components/CategoriesTab';
import SuppliersTab from '../components/SuppliersTab';
import InventoryTab from '../components/InventoryTab';
import PurchasesTab from '../components/PurchasesTab';
import PosTab from '../components/PosTab';
import SalesHistoryTab from '../components/SalesHistoryTab';
import CustomersTab from '../components/CustomersTab';
import ReturnsTab from '../components/ReturnsTab';
import ReportsTab from '../components/ReportsTab';

type Tab = 'dashboard' | 'products' | 'categories' | 'suppliers' | 'inventory' | 'purchases' | 'pos' | 'salesHistory' | 'customers' | 'returns' | 'reports';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    const res = await authService.login(loginForm);
    if (!res.success) {
      setAuthError(res.message || 'Invalid credentials');
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-500 mx-auto" />
          <p className="mt-4 text-slate-400">Loading RetailPOS...</p>
        </div>
      </main>
    );
  }

  // Render active tab view
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'products':
        return <ProductsTab />;
      case 'categories':
        return <CategoriesTab />;
      case 'suppliers':
        return <SuppliersTab />;
      case 'inventory':
        return <InventoryTab />;
      case 'purchases':
        return <PurchasesTab />;
      case 'pos':
        return <PosTab />;
      case 'salesHistory':
        return <SalesHistoryTab />;
      case 'customers':
        return <CustomersTab />;
      case 'returns':
        return <ReturnsTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <DashboardTab />;
    }
  };

  const tabsConfig: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pos', label: 'POS Terminal' },
    { id: 'salesHistory', label: 'Sales History' },
    { id: 'returns', label: 'Returns & Refunds' },
    { id: 'customers', label: 'Customers' },
    { id: 'products', label: 'Products' },
    { id: 'categories', label: 'Categories' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-6 flex flex-col gap-6">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">RetailPOS</p>
            <h1 className="mt-2 text-3xl font-semibold">Product & Inventory Management</h1>
            <p className="mt-2 text-slate-400">Configure catalog, manage categories/suppliers, record purchases, and track stock logs.</p>
          </div>
          {isAuthenticated && user && (
            <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 self-start md:self-auto">
              <div>
                <p className="font-semibold text-emerald-400">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email} ({user.role})</p>
              </div>
              <LogoutButton />
            </div>
          )}
        </header>

        {!isAuthenticated ? (
          <section className="grid gap-6 md:grid-cols-2">
            <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold">Sign In</h2>
              <p className="text-sm text-slate-400">Access your POS dashboard</p>
              <input value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" required type="email" />
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" required />
              {authError && <p className="text-sm text-red-400">{authError}</p>}
              <button className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors px-3 py-2 font-semibold text-slate-950">Login</button>
            </form>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-center text-center">
              <h2 className="text-xl font-semibold text-slate-300">RetailPOS Authentication</h2>
              <p className="mt-3 text-slate-400 max-w-md mx-auto">This system requires an administrative session to manage roles, register new cashiers, and control inventory access permissions.</p>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            {/* Sidebar Navigation */}
            <aside className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
              {tabsConfig.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors whitespace-nowrap ${
                    currentTab === tab.id
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </aside>

            {/* Active Tab Screen */}
            <section className="min-w-0">
              {renderTabContent()}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
