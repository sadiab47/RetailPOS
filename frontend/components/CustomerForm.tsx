import { useState } from 'react';
import { customerSchema } from '../lib/validation';

interface Customer {
  id?: number;
  customerCode?: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
  creditLimit: number;
}

interface CustomerFormProps {
  initialData?: Customer | null;
  onSave: () => void;
  onCancel: () => void;
  onSubmitApi: (data: any) => Promise<{ ok: boolean; error?: string }>;
}

export default function CustomerForm({ initialData, onSave, onCancel, onSubmitApi }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    dateOfBirth: initialData?.dateOfBirth ? initialData.dateOfBirth.substring(0, 10) : '',
    notes: initialData?.notes || '',
    creditLimit: initialData?.creditLimit || 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'creditLimit' ? Number(value) : value,
    }));
    // Clear validation error on change
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFormErrors({});

    // Validate with Zod
    const validationResult = customerSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        errors[path] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmitApi(formData);
      if (res.ok) {
        onSave();
      } else {
        setSubmitError(res.error || 'Failed to submit form');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-lg font-bold text-slate-100">
            {initialData ? `Edit Customer File: ${initialData.customerCode}` : 'Register New Customer'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {submitError && (
            <div className="rounded-lg bg-red-950/40 border border-red-800 p-3 text-xs text-red-400">
              {submitError}
            </div>
          )}

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">First Name *</label>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              {formErrors.firstName && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.firstName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number *</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              {formErrors.phone && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              {formErrors.email && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.email}</p>}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth</label>
              <input
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Credit Limit (Rs.)</label>
              <input
                name="creditLimit"
                type="number"
                min="0"
                value={formData.creditLimit}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              {formErrors.creditLimit && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.creditLimit}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Comments</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 font-semibold text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
