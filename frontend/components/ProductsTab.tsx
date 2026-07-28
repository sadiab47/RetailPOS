import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { productSchema } from '../lib/validation';
import { useAuthStore } from '../store/auth.store';

interface Product {
  id: number;
  barcode: string;
  name: string;
  categoryId: number | null;
  category: string | null;
  supplierId: number | null;
  supplier: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  sku: string | null;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  companyName: string;
}

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  // Form States
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const loadDependencies = async () => {
    const [catRes, supRes] = await Promise.all([
      fetchWithAuth('/categories'),
      fetchWithAuth('/suppliers'),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
    if (supRes.ok) setSuppliers(await supRes.json());
  };

  const loadProducts = async () => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.set('search', search);
    if (filterCategory) queryParams.set('categoryId', filterCategory);
    if (filterSupplier) queryParams.set('supplierId', filterSupplier);

    const res = await fetchWithAuth(`/products?${queryParams.toString()}`);
    if (res.ok) {
      setProducts(await res.json());
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, filterCategory, filterSupplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedData = {
      barcode,
      name,
      categoryId: categoryId ? Number(categoryId) : null,
      supplierId: supplierId ? Number(supplierId) : null,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      sku: sku || undefined,
      isActive,
    };

    const validation = productSchema.safeParse(parsedData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const url = editingId ? `/products/${editingId}` : '/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save product');
      }

      // Reset Form
      setBarcode('');
      setName('');
      setCategoryId('');
      setSupplierId('');
      setCostPrice('');
      setSellingPrice('');
      setStock('0');
      setLowStockThreshold('10');
      setSku('');
      setIsActive(true);
      setEditingId(null);
      loadProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setBarcode(product.barcode);
    setName(product.name);
    setCategoryId(product.categoryId ? String(product.categoryId) : '');
    setSupplierId(product.supplierId ? String(product.supplierId) : '');
    setCostPrice(String(product.costPrice));
    setSellingPrice(String(product.sellingPrice));
    setStock(String(product.stock));
    setLowStockThreshold(String(product.lowStockThreshold));
    setSku(product.sku || '');
    setIsActive(product.isActive);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetchWithAuth(`/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete product');
      }
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStockBadge = (stock: number, threshold: number) => {
    if (stock === 0) {
      return <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-red-950 text-red-400 border border-red-900/50">🔴 Out of Stock</span>;
    }
    if (stock <= threshold) {
      return <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-900/50">🟡 Low Stock</span>;
    }
    return <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900/50">🟢 In Stock ({stock})</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="grid gap-4 md:grid-cols-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, barcode, SKU..." className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.companyName}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Editor Form */}
        <div>
          {isAdminOrManager ? (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-slate-100">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-0.5">Barcode</label>
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="EAN-13, UPC, etc." required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-0.5">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required />
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">Supplier</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                    <option value="">None</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.companyName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">Cost Price</label>
                  <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} type="number" step="0.01" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">Selling Price</label>
                  <input value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} type="number" step="0.01" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">Stock</label>
                  <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" disabled={editingId !== null} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">Alert Level</label>
                  <input value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} type="number" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-0.5">SKU</label>
                  <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="productActive" className="rounded bg-slate-950 border-slate-700 h-4 w-4" />
                <label htmlFor="productActive" className="text-sm font-medium text-slate-300">Active Status</label>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2 font-semibold text-slate-950">
                  {editingId ? 'Update' : 'Save'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setBarcode(''); setName(''); setCategoryId(''); setSupplierId(''); setCostPrice(''); setSellingPrice(''); setStock('0'); setLowStockThreshold('10'); setSku(''); setIsActive(true); setError(null); }} className="rounded-lg bg-slate-700 px-4 py-2 text-slate-100">
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

        {/* Catalog Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 overflow-x-auto">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Product Catalog</h2>
          {products.length === 0 ? (
            <p className="text-slate-500">No products found matching the criteria.</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-2">Item / Barcode</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2 text-right">Cost / Sell</th>
                  <th className="py-3 px-2 text-center font-bold">Stock</th>
                  {isAdminOrManager && <th className="py-3 px-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.map((prod) => (
                  <tr key={prod.id} className={`${!prod.isActive ? 'opacity-40' : ''}`}>
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-100">{prod.name}</p>
                      <p className="text-xs text-slate-400">{prod.barcode} | {prod.sku || 'No SKU'}</p>
                    </td>
                    <td className="py-3 px-2">{prod.category || 'N/A'}</td>
                    <td className="py-3 px-2 text-right">
                      <p>Rs. {prod.sellingPrice}</p>
                      <p className="text-xs text-slate-400">Cost: Rs. {prod.costPrice}</p>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {getStockBadge(prod.stock, prod.lowStockThreshold)}
                    </td>
                    {isAdminOrManager && (
                      <td className="py-3 px-2 text-right">
                        <button onClick={() => handleEdit(prod)} className="text-xs text-sky-400 hover:underline mr-3">Edit</button>
                        <button onClick={() => handleDelete(prod.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
