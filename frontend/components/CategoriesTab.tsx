import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { categorySchema } from '../lib/validation';
import { useAuthStore } from '../store/auth.store';

interface Category {
  id: number;
  name: string;
  description: string | null;
}

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const loadCategories = async () => {
    const res = await fetchWithAuth('/categories');
    if (res.ok) {
      setCategories(await res.json());
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate using Zod
    const validation = categorySchema.safeParse({ name, description });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const url = editingId ? `/categories/${editingId}` : '/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save category');
      }

      setName('');
      setDescription('');
      setEditingId(null);
      loadCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description || '');
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetchWithAuth(`/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete category');
      }
      loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      {/* Category Editor (Admin/Manager only) */}
      <div>
        {isAdminOrManager ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-slate-100">{editingId ? 'Edit Category' : 'Create New Category'}</h2>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Category name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Short details" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors py-2 font-semibold text-slate-950">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setName(''); setDescription(''); setError(null); }} className="rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors px-4 py-2 font-semibold text-slate-100">
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

      {/* Category List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Categories List</h2>
        {categories.length === 0 ? (
          <p className="text-slate-500">No categories found.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <h3 className="font-semibold text-slate-200">{cat.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{cat.description || 'No description provided'}</p>
                </div>
                {isAdminOrManager && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleEdit(cat)} className="text-xs text-sky-400 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
