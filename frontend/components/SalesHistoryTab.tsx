import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface SaleHeader {
  id: number;
  invoiceNumber: string;
  customerName: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
}

interface SaleDetail {
  id: number;
  invoiceNumber: string;
  customerName: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
  items: {
    productId: number;
    productName: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export default function SalesHistoryTab() {
  const [sales, setSales] = useState<SaleHeader[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSales = async () => {
    const queryParams = new URLSearchParams();
    if (invoiceSearch) queryParams.set('invoiceNumber', invoiceSearch);
    if (paymentFilter) queryParams.set('paymentMethod', paymentFilter);

    const res = await fetchWithAuth(`/sales?${queryParams.toString()}`);
    if (res.ok) {
      setSales(await res.json());
    }
  };

  useEffect(() => {
    loadSales();
  }, [invoiceSearch, paymentFilter]);

  const handleOpenDetail = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/sales/${id}`);
      if (res.ok) {
        setSelectedSale(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="Search Invoice Number..." className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
          <option value="">All Payment Methods</option>
          <option value="CASH">CASH</option>
          <option value="CARD">CARD</option>
          <option value="MOBILE">MOBILE</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 overflow-x-auto">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Completed Sales Invoices</h2>
        {sales.length === 0 ? (
          <p className="text-slate-500 text-sm">No invoice transactions found.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-2">Invoice #</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Customer</th>
                <th className="py-3 px-2">Method</th>
                <th className="py-3 px-2 text-right">Total Amount</th>
                <th className="py-3 px-2 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="py-3 px-2 font-mono font-semibold">{sale.invoiceNumber}</td>
                  <td className="py-3 px-2 text-slate-400">{new Date(sale.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-2">{sale.customerName}</td>
                  <td className="py-3 px-2">
                    <span className="inline-block rounded bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-400 border border-slate-800">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-emerald-400">Rs. {sale.total.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => handleOpenDetail(sale.id)} className="text-xs text-sky-400 hover:underline">
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-lg font-bold text-slate-100">Invoice: {selectedSale.invoiceNumber}</h3>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="text-sm space-y-1">
              <p><strong>Customer Name:</strong> {selectedSale.customerName}</p>
              <p><strong>Payment Method:</strong> {selectedSale.paymentMethod}</p>
              <p><strong>Created At:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
            </div>

            {/* Line Items */}
            <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr className="border-b border-slate-800 font-medium">
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {selectedSale.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3">{item.productName}</td>
                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">Rs. {item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 border-t border-slate-800 pt-3 text-sm text-right">
              <p>Subtotal: Rs. {selectedSale.subtotal.toFixed(2)}</p>
              {selectedSale.discount > 0 && <p>Discount: -Rs. {selectedSale.discount.toFixed(2)}</p>}
              {selectedSale.tax > 0 && <p>Tax: +Rs. {selectedSale.tax.toFixed(2)}</p>}
              <p className="text-base font-bold text-emerald-400 pt-1">
                Total: Rs. {selectedSale.total.toFixed(2)}
              </p>
            </div>

            {/* Print friendly block hidden in screen mode but active in media print */}
            <div className="hidden">
              <div id="receipt-print-area" className="bg-white text-black p-4 font-mono text-xs w-[80mm] max-w-full mx-auto border border-slate-300 rounded">
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
                  <h4 className="text-sm font-bold uppercase">Speciality shop</h4>
                  <p>Bhera service Area North side</p>
                  <p>Ph no: +92 300 1113821</p>
                </div>
                <div className="space-y-1 py-2 border-b border-dashed border-gray-400">
                  <p><strong>Invoice:</strong> {selectedSale.invoiceNumber}</p>
                  <p><strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
                  <p><strong>Customer:</strong> {selectedSale.customerName}</p>
                  <p><strong>Payment:</strong> {selectedSale.paymentMethod}</p>
                </div>
                <table className="w-full text-left my-2 divide-y divide-dashed divide-gray-400">
                  <thead>
                    <tr className="font-bold border-b border-dashed border-gray-400">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-gray-300">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1">{item.productName}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">Rs. {item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1 border-t border-dashed border-gray-400 pt-2 text-right">
                  <p>Subtotal: Rs. {selectedSale.subtotal.toFixed(2)}</p>
                  {selectedSale.discount > 0 && <p>Discount: -Rs. {selectedSale.discount.toFixed(2)}</p>}
                  {selectedSale.tax > 0 && <p>Tax: +Rs. {selectedSale.tax.toFixed(2)}</p>}
                  <p className="text-sm font-bold border-t border-dashed border-gray-400 pt-1">
                    Total: Rs. {selectedSale.total.toFixed(2)}
                  </p>
                </div>
                <div className="text-center mt-4 pt-2 border-t border-dashed border-gray-400 space-y-1">
                  <p className="font-bold">Thank You For Your Purchase!</p>
                  <p className="text-[10px]">Reprinted Invoice Document.</p>
                  <div className="text-[9px] text-gray-500 border-t border-dotted border-gray-300 pt-1 mt-1">
                    <p>Developed by Saad Qazi</p>
                    <p>+92 320 7480116</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handlePrint} className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-500 py-2 font-semibold text-slate-100 transition-colors">
                Reprint Invoice
              </button>
              <button onClick={() => setSelectedSale(null)} className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 font-semibold text-slate-100 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS Styles for media print printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
