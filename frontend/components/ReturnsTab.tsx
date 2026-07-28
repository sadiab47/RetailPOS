import { useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface ReturnItem {
  productId: number;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ReturnRecord {
  id: number;
  returnNumber: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
  reasonCode: string;
  reasonNotes?: string;
  refundAmount: number;
  refundMethod: string;
  createdAt: string;
  cashierName?: string;
  items?: ReturnItem[];
}

export default function ReturnsTab() {
  const [returnHistory, setReturnHistory] = useState<ReturnRecord[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);

  // New Return Form States
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundSale, setFoundSale] = useState<any | null>(null);
  const [prevReturnedQtyMap, setPrevReturnedQtyMap] = useState<Record<number, number>>({});

  // Item return quantities mapping: saleItemId -> returnQty
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [reasonCode, setReasonCode] = useState<string>('CUSTOMER_CHANGED_MIND');
  const [reasonNotes, setReasonNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'STORE_CREDIT' | 'ORIGINAL_PAYMENT'>('CASH');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadReturnHistory = async () => {
    try {
      const res = await fetchWithAuth('/returns');
      if (res.ok) {
        setReturnHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReturnHistory();
  }, []);

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setFoundSale(null);
    setReturnQuantities({});
    setSubmitSuccess(false);

    if (!invoiceQuery.trim()) {
      setSearchError('Please enter an invoice number');
      return;
    }

    try {
      // Find sale header
      const resList = await fetchWithAuth(`/sales?invoiceNumber=${invoiceQuery.trim()}`);
      if (!resList.ok) {
        setSearchError('Search failed');
        return;
      }
      const sales = await resList.json();
      const exactMatch = sales.find((s: any) => s.invoiceNumber === invoiceQuery.trim());

      if (!exactMatch) {
        setSearchError('Invoice number not found');
        return;
      }

      // Fetch full details
      const resDetail = await fetchWithAuth(`/sales/${exactMatch.id}`);
      if (!resDetail.ok) {
        setSearchError('Failed to fetch sale details');
        return;
      }

      const saleDetail = await resDetail.json();
      setFoundSale(saleDetail);

      // Fetch outstanding previously returned quantities for items
      const returnedMap: Record<number, number> = {};
      const allReturnsRes = await fetchWithAuth('/returns');
      if (allReturnsRes.ok) {
        const history: ReturnRecord[] = await allReturnsRes.json();
        const saleReturns = history.filter((r) => r.invoiceNumber === saleDetail.invoiceNumber && r.status !== 'VOIDED');

        for (const sr of saleReturns) {
          const detailRes = await fetchWithAuth(`/returns/${sr.id}`);
          if (detailRes.ok) {
            const detail: ReturnRecord = await detailRes.json();
            detail.items?.forEach((i: any) => {
              // We match items using productId since we didn't have saleItemId in returned list mapping, but matching by productId works since sale items are unique per product!
              returnedMap[i.productId] = (returnedMap[i.productId] || 0) + i.quantity;
            });
          }
        }
      }
      setPrevReturnedQtyMap(returnedMap);
    } catch (err: any) {
      setSearchError(err.message || 'An error occurred during lookup');
    }
  };

  const handleQtyChange = (saleItemId: number, productId: number, maxQty: number, val: string) => {
    const qty = Number(val);
    if (isNaN(qty) || qty < 0) return;
    if (qty > maxQty) {
      setReturnQuantities((prev) => ({ ...prev, [saleItemId]: maxQty }));
    } else {
      setReturnQuantities((prev) => ({ ...prev, [saleItemId]: qty }));
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const itemsToSubmit = Object.entries(returnQuantities)
      .map(([saleItemId, qty]) => {
        const item = foundSale.items.find((i: any) => i.productId === Number(saleItemId) || i.id === Number(saleItemId));
        return {
          saleItemId: Number(saleItemId),
          productId: item ? item.productId : 0,
          quantity: qty,
        };
      })
      .filter((i) => i.quantity > 0);

    if (itemsToSubmit.length === 0) {
      setSubmitError('Please select at least 1 item to return with quantity greater than zero');
      return;
    }

    try {
      const payload = {
        saleId: foundSale.id,
        reasonCode,
        reasonNotes,
        refundMethod,
        items: itemsToSubmit,
      };

      const res = await fetchWithAuth('/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Return processing failed');
      }

      const returnRecord = await res.json();
      setSubmitSuccess(true);
      setFoundSale(null);
      setReturnQuantities({});
      setInvoiceQuery('');
      loadReturnHistory();
      // Auto select the new return for receipt reprint preview
      setSelectedReturn(returnRecord);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed');
    }
  };

  const handleFetchReturnDetail = async (record: ReturnRecord) => {
    try {
      const res = await fetchWithAuth(`/returns/${record.id}`);
      if (res.ok) {
        setSelectedReturn(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      {/* LEFT: Returns History list */}
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-4">Returns History</h2>
        <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2">
          {returnHistory.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">No return transactions logged.</p>
          ) : (
            returnHistory.map((r) => (
              <div
                key={r.id}
                onClick={() => handleFetchReturnDetail(r)}
                className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${
                  selectedReturn?.id === r.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-200">{r.returnNumber}</p>
                  <p className="text-[10px] text-slate-400">
                    Invoice: {r.invoiceNumber} | Customer: {r.customerName}
                  </p>
                  <span className="inline-block mt-1 text-[8px] uppercase tracking-wider font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    {r.reasonCode}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-400">-Rs. {r.refundAmount.toFixed(2)}</p>
                  <p className="text-[9px] text-slate-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Processing Form or Receipt Preview */}
      <div className="flex flex-col gap-6">
        {/* Process Return Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-2">Process Returns / Exchanges</h3>
          <form onSubmit={handleSearchInvoice} className="flex gap-2">
            <input
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="Search original invoice (e.g. INV-178514...)"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors"
            >
              Lookup Invoice
            </button>
          </form>
          {searchError && <p className="text-xs text-red-400">{searchError}</p>}

          {foundSale && (
            <form onSubmit={handleReturnSubmit} className="space-y-4 border-t border-slate-800 pt-4 text-xs">
              <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>Customer: {foundSale.customerName}</span>
                <span>Original Total: Rs. {Number(foundSale.total).toFixed(2)}</span>
              </div>

              {/* Items List to Return */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                <p className="font-semibold text-slate-350">Select items to return:</p>
                {foundSale.items.map((item: any) => {
                  const returnedQty = prevReturnedQtyMap[item.productId] || 0;
                  const availableReturnQty = item.quantity - returnedQty;

                  return (
                    <div key={item.id} className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <div className="max-w-[180px]">
                        <p className="font-semibold text-slate-200 truncate">{item.productName}</p>
                        <p className="text-[10px] text-slate-500">
                          Price: Rs. {item.unitPrice.toFixed(2)} | Bought: {item.quantity} (Returned: {returnedQty})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-400">Qty:</label>
                        <input
                          type="number"
                          min="0"
                          max={availableReturnQty}
                          value={returnQuantities[item.id] || ''}
                          onChange={(e) => handleQtyChange(item.id, item.productId, availableReturnQty, e.target.value)}
                          placeholder="0"
                          disabled={availableReturnQty <= 0}
                          className="w-12 text-center rounded border border-slate-700 bg-slate-900 py-1 text-slate-200 disabled:opacity-40"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reason Codes */}
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Return Reason Code</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-750 bg-slate-950 px-2.5 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="CUSTOMER_CHANGED_MIND">Customer Changed Mind</option>
                    <option value="DAMAGED">Damaged Product</option>
                    <option value="WRONG_ITEM">Wrong Item Received</option>
                    <option value="EXPIRED">Expired Product</option>
                    <option value="DEFECTIVE">Defective / Non-working</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Refund Return Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-750 bg-slate-950 px-2.5 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="CASH">Refund Cash (CASH)</option>
                    <option value="STORE_CREDIT">Store Credit (STORE_CREDIT)</option>
                    <option value="ORIGINAL_PAYMENT">Original Payment Method</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Return Reason Notes / Details</label>
                <textarea
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes about return..."
                  className="w-full rounded-lg border border-slate-750 bg-slate-950 px-3 py-1.5 text-slate-200 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {submitError && <p className="text-xs text-red-400">{submitError}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors py-2.5 font-bold"
              >
                Submit Return Transaction
              </button>
            </form>
          )}
        </div>

        {/* Selected Return / Reprint Receipt Preview */}
        {selectedReturn && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100">Return confirmation Receipt</h3>
              <button
                onClick={handlePrint}
                className="rounded bg-sky-600 hover:bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-100 transition-colors"
              >
                Print Return Slip
              </button>
            </div>

            {/* Print Slip Layout */}
            <div
              ref={printAreaRef}
              id="receipt-print-area"
              className="bg-white text-black p-4 font-mono text-xs w-[80mm] max-w-full mx-auto border border-slate-350 rounded shadow-md"
            >
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
                <h4 className="text-sm font-bold uppercase">Speciality shop</h4>
                <p>Bhera service Area North side</p>
                <p>Returns & Refund Voucher</p>
              </div>

              <div className="space-y-1 py-2 border-b border-dashed border-gray-400 text-[10px]">
                <p><strong>Return No:</strong> {selectedReturn.returnNumber}</p>
                <p><strong>Original Invoice:</strong> {selectedReturn.invoiceNumber}</p>
                <p><strong>Date:</strong> {new Date(selectedReturn.createdAt).toLocaleString()}</p>
                <p><strong>Cashier:</strong> {selectedReturn.cashierName || 'System'}</p>
                <p><strong>Customer:</strong> {selectedReturn.customerName}</p>
                <p><strong>Refund Method:</strong> {selectedReturn.refundMethod}</p>
                <p><strong>Reason Code:</strong> {selectedReturn.reasonCode}</p>
              </div>

              <table className="w-full text-left my-2 divide-y divide-dashed divide-gray-400 text-[10px]">
                <thead>
                  <tr className="font-bold border-b border-dashed border-gray-400">
                    <th className="py-1">Returned Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-gray-400">
                  {selectedReturn.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 max-w-[120px] truncate">{item.productName}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">Rs. {(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-right text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>Refunded Total:</span>
                  <span>Rs. {selectedReturn.refundAmount.toFixed(2)}</span>
                </div>
              </div>

              {selectedReturn.reasonNotes && (
                <div className="border-t border-dashed border-gray-400 mt-2 pt-2 text-[9px] italic">
                  <p><strong>Notes:</strong> {selectedReturn.reasonNotes}</p>
                </div>
              )}

              <div className="text-center text-[8px] text-gray-500 border-t border-dashed border-gray-400 mt-4 pt-2">
                <p>Developed by Saad Qazi</p>
                <p>+92 320 7480116</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
