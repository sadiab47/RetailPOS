"use client";

import { useEffect, useState } from 'react';

type Product = {
  id: number;
  barcode: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  sku: string;
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [authState, setAuthState] = useState<{ email: string; role: string } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });
  const [productForm, setProductForm] = useState({ barcode: '', name: '', category: '', purchasePrice: '', sellingPrice: '', stock: '', sku: '' });

  useEffect(() => {
    fetch('http://localhost:4000/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]));
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });
    const data = await res.json();
    if (data.success) {
      setAuthState({ email: data.user.email, role: data.user.role });
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }),
    });
    const data = await res.json();
    if (data.success) {
      setAuthState({ email: data.user.email, role: data.user.role });
    }
  };

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch('http://localhost:4000/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcode: productForm.barcode,
        name: productForm.name,
        category: productForm.category,
        purchasePrice: Number(productForm.purchasePrice),
        sellingPrice: Number(productForm.sellingPrice),
        stock: Number(productForm.stock),
        sku: productForm.sku,
      }),
    });
    const created = await res.json();
    setProducts((current) => [...current, created]);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">RetailPOS</p>
          <h1 className="mt-2 text-3xl font-semibold">Authentication and product management</h1>
          <p className="mt-3 text-slate-400">This milestone adds login, user registration, and a simple product creation flow.</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Access</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <form onSubmit={handleLogin} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="font-medium">Login</h3>
                <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" />
                <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" />
                <button className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-950">Login</button>
              </form>

              <form onSubmit={handleRegister} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="font-medium">Register</h3>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" />
                <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" />
                <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" />
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="w-full rounded-lg bg-sky-500 px-3 py-2 font-semibold text-slate-950">Register</button>
              </form>
            </div>

            {authState ? <p className="mt-4 text-sm text-emerald-400">Signed in as {authState.email} ({authState.role})</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Product Management</h2>
            <form onSubmit={handleCreateProduct} className="mt-4 space-y-3">
              <input value={productForm.barcode} onChange={(event) => setProductForm({ ...productForm, barcode: event.target.value })} placeholder="Barcode" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Product name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} placeholder="Category" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <div className="grid gap-3 md:grid-cols-3">
                <input value={productForm.purchasePrice} onChange={(event) => setProductForm({ ...productForm, purchasePrice: event.target.value })} placeholder="Purchase" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                <input value={productForm.sellingPrice} onChange={(event) => setProductForm({ ...productForm, sellingPrice: event.target.value })} placeholder="Selling" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                <input value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} placeholder="Stock" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              </div>
              <input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} placeholder="SKU" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <button className="w-full rounded-lg bg-amber-500 px-3 py-2 font-semibold text-slate-950">Create Product</button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">Product Catalog</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-slate-400">{product.barcode}</p>
                <p className="mt-2 text-sm">Category: {product.category}</p>
                <p className="text-sm">Selling: Rs. {product.sellingPrice}</p>
                <p className="text-sm">Stock: {product.stock}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
