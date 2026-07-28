import { useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface Register {
  id: number;
  name: string;
  status: string;
}

interface ActiveShift {
  id: number;
  registerId: number;
  registerName: string;
  openingCash: number;
  openingTime: string;
  status: string;
}

interface Movement {
  id: number;
  amount: number;
  type: string;
  referenceType?: string;
  referenceId?: number;
  remarks?: string;
  createdAt: string;
}

interface ShiftSummary {
  id: number;
  registerName: string;
  cashierName: string;
  openingTime: string;
  closingTime: string;
  openingCash: number;
  closingCash: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  status: string;
  notes: string;
  aggregations: {
    cashSales: number;
    cashReturns: number;
    safeDrops: number;
    cashIn: number;
    cashOut: number;
    bankDeposits: number;
    adjustments: number;
    totalTransactions: number;
  };
  movements: Movement[];
}

export default function RegisterTab() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [selectedRegId, setSelectedRegId] = useState<number>(1);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [summaryData, setSummaryData] = useState<ShiftSummary | null>(null);

  // Form inputs
  const [openingCashInput, setOpeningCashInput] = useState('1000');
  const [actionAmount, setActionAmount] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionType, setActionType] = useState<'CASH_IN' | 'CASH_OUT' | 'SAFE_DROP' | 'BANK_DEPOSIT' | 'ADJUSTMENT'>('CASH_IN');

  // Modal close states
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadRegisters = async () => {
    try {
      const res = await fetchWithAuth('/shifts/registers');
      if (res.ok) {
        setRegisters(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadActiveShift = async () => {
    try {
      const res = await fetchWithAuth('/shifts/active');
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data);
        if (data) {
          loadShiftSummary(data.id);
        } else {
          setSummaryData(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadShiftSummary = async (shiftId: number) => {
    try {
      const res = await fetchWithAuth(`/shifts/${shiftId}/summary`);
      if (res.ok) {
        setSummaryData(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRegisters();
    loadActiveShift();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await fetchWithAuth('/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerId: selectedRegId,
          openingCash: Number(openingCashInput),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to open shift');
      }

      await loadActiveShift();
      setSuccessMessage('Shift opened successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
    }
  };

  const handlePostMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!actionAmount || Number(actionAmount) <= 0) {
      setErrorMessage('Please enter a valid positive amount');
      return;
    }

    try {
      const res = await fetchWithAuth('/shifts/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(actionAmount),
          type: actionType,
          remarks: actionRemarks,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Movement update failed');
      }

      setActionAmount('');
      setActionRemarks('');
      if (activeShift) {
        loadShiftSummary(activeShift.id);
      }
      setSuccessMessage(`Movement logged: ${actionType}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!actualCashInput || isNaN(Number(actualCashInput)) || Number(actualCashInput) < 0) {
      setErrorMessage('Please enter a valid drawer cash total amount');
      return;
    }

    try {
      const res = await fetchWithAuth('/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCash: Number(actualCashInput),
          notes: closeNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to close shift');
      }

      const closedSummary = await res.json();
      setSummaryData(closedSummary); // Save closed summary for receipt reprint
      setActiveShift(null);
      setShowCloseModal(false);
      setActualCashInput('');
      setCloseNotes('');
      setSuccessMessage('Shift closed successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const expectedCash = summaryData ? summaryData.expectedCash : 0;
  const variance = actualCashInput ? Number(actualCashInput) - expectedCash : 0;

  return (
    <div className="space-y-6">
      {/* 1. REGISTER STATUS HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
            💸
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {activeShift ? activeShift.registerName : 'Main Drawer Status'}
            </h2>
            <p className="text-xs text-slate-400">
              Status:{' '}
              <span className={`font-semibold ${activeShift ? 'text-emerald-400' : 'text-slate-500'}`}>
                {activeShift ? 'Shift Active (OPEN)' : 'Register Closed'}
              </span>
            </p>
          </div>
        </div>

        {errorMessage && <p className="text-xs text-red-400 bg-red-400/10 px-4 py-2 rounded-lg">{errorMessage}</p>}
        {successMessage && <p className="text-xs text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-lg">{successMessage}</p>}
      </div>

      {/* 2. OPEN SHIFT SCREEN CONTAINER */}
      {!activeShift ? (
        <div className="max-w-md mx-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 text-center">Open Active Till Shift</h3>
          <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Select Register Asset</label>
              <select
                value={selectedRegId}
                onChange={(e) => setSelectedRegId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Opening Cash Float (Rs.)</label>
              <input
                type="number"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="1000"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-3 font-bold text-slate-950 transition-colors"
            >
              Open Shift & Log Float
            </button>
          </form>

          {/* Reprint previous shift report voucher (if available) */}
          {summaryData && summaryData.status === 'CLOSED' && (
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-semibold">Latest Closed Shift summary:</p>
                <button
                  onClick={handlePrint}
                  className="rounded bg-sky-600 hover:bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-100 transition-colors"
                >
                  Print Summary
                </button>
              </div>

              {/* Thermal Summary Slip */}
              <div
                ref={printAreaRef}
                id="shift-print-area"
                className="bg-white text-black p-4 font-mono text-[10px] w-[80mm] max-w-full mx-auto border border-slate-350 rounded shadow-md"
              >
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
                  <h4 className="text-xs font-bold uppercase">Speciality shop</h4>
                  <p>Shift summary report</p>
                </div>

                <div className="space-y-1 py-2 border-b border-dashed border-gray-400">
                  <p><strong>Register:</strong> {summaryData.registerName}</p>
                  <p><strong>Operator:</strong> {summaryData.cashierName}</p>
                  <p><strong>Open:</strong> {new Date(summaryData.openingTime).toLocaleString()}</p>
                  <p><strong>Close:</strong> {new Date(summaryData.closingTime).toLocaleString()}</p>
                </div>

                <div className="space-y-1.5 py-2 border-b border-dashed border-gray-400">
                  <div className="flex justify-between">
                    <span>Opening Float:</span>
                    <span>Rs. {summaryData.openingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Sales (+):</span>
                    <span>Rs. {summaryData.aggregations.cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Returns (-):</span>
                    <span>Rs. {summaryData.aggregations.cashReturns.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Safe Drops (-):</span>
                    <span>Rs. {summaryData.aggregations.safeDrops.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual In (+):</span>
                    <span>Rs. {summaryData.aggregations.cashIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Out (-):</span>
                    <span>Rs. {summaryData.aggregations.cashOut.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 py-2 font-bold text-[11px]">
                  <div className="flex justify-between">
                    <span>Expected Cash:</span>
                    <span>Rs. {summaryData.expectedCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Counted Cash:</span>
                    <span>Rs. {summaryData.actualCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-400 pt-1.5">
                    <span>Variance:</span>
                    <span className={summaryData.variance < 0 ? 'text-red-600' : 'text-emerald-600'}>
                      Rs. {summaryData.variance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {summaryData.notes && (
                  <div className="border-t border-dashed border-gray-400 pt-2 italic">
                    <p>Notes: {summaryData.notes}</p>
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT COLUMN: Shift stats & movements list */}
          <div className="space-y-6">
            {/* Expected Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Opening Float</p>
                <p className="text-lg font-bold text-slate-200 mt-1">Rs. {summaryData?.openingCash.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Expected Cash</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">Rs. {summaryData?.expectedCash.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Transactions Logged</p>
                <p className="text-lg font-bold text-slate-200 mt-1">{summaryData?.aggregations.totalTransactions} Sales/Returns</p>
              </div>
            </div>

            {/* Movements ledger log history */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Current Shift Movements Ledger</h3>
              <div className="overflow-x-auto max-h-80 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase">
                      <th className="py-2">Type</th>
                      <th className="py-2">Remarks / Ref</th>
                      <th className="py-2">Time</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {summaryData?.movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-950/20">
                        <td className="py-2 font-semibold text-slate-300">{m.type}</td>
                        <td className="py-2 text-slate-450">
                          {m.remarks || 'N/A'}{' '}
                          {m.referenceType && (
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
                              {m.referenceType}: {m.referenceId}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-slate-500">{new Date(m.createdAt).toLocaleTimeString()}</td>
                        <td className={`py-2 text-right font-bold ${m.amount < 0 ? 'text-red-400' : 'text-emerald-450'}`}>
                          {m.amount < 0 ? '-' : '+'}Rs. {Math.abs(m.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Till Actions & Close button */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Till Operations</h3>
              <form onSubmit={handlePostMovement} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Action Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-250 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="CASH_IN">Add Till Float (CASH_IN)</option>
                    <option value="CASH_OUT">Pay Out Expense (CASH_OUT)</option>
                    <option value="SAFE_DROP">Till Safe Drop (SAFE_DROP)</option>
                    <option value="BANK_DEPOSIT">Bank Deposit (BANK_DEPOSIT)</option>
                    <option value="ADJUSTMENT">Drawer Adjustment (ADJUSTMENT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Amount (Rs.)</label>
                  <input
                    type="number"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder="500"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Remarks / Explanation</label>
                  <textarea
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    rows={2}
                    placeholder="Enter details..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2.5 font-bold text-slate-950 transition-colors"
                >
                  Log Till Movement
                </button>
              </form>
            </div>

            <button
              onClick={() => {
                setActualCashInput('');
                setCloseNotes('');
                setShowCloseModal(true);
              }}
              className="w-full rounded-2xl bg-red-500 hover:bg-red-400 py-4 font-bold text-slate-950 transition-colors shadow-lg shadow-red-500/10"
            >
              Count Drawer & Close Shift
            </button>
          </div>
        </div>
      )}

      {/* 3. CLOSE SHIFT OVERLAY RECONCILIATION MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">Count Drawer & Close Shift</h3>
            <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
              <div className="bg-slate-950/50 p-4 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Expected Cash Float in Drawer:</span>
                  <span className="font-bold text-slate-200">Rs. {expectedCash.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Counted Cash Amount (Rs.)</label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="Drawer physical cash sum..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {actualCashInput && (
                <div className="flex justify-between items-center text-sm font-semibold p-2.5 rounded-lg bg-slate-950/40 border border-slate-850">
                  <span className="text-slate-400">Variance:</span>
                  <span className={variance < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    Rs. {variance.toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Closing shift Notes</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows={2}
                  placeholder="Specify notes for any variance discrepancies..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="rounded-lg bg-slate-850 hover:bg-slate-800 px-4 py-2.5 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-500 hover:bg-red-400 px-5 py-2.5 text-slate-950 font-bold"
                >
                  Reconcile & Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
