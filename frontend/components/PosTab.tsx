import { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface Product {
  id: number;
  barcode: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  sku: string | null;
  isActive: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface InvoiceDetail {
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

export default function PosTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountInput, setDiscountInput] = useState('0');
  const [taxInput, setTaxInput] = useState('0');
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customer Selection
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustSuggestions, setShowCustSuggestions] = useState(false);
  const custSuggestionsRef = useRef<HTMLDivElement>(null);

  // Search and Suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadProducts = async () => {
    const res = await fetchWithAuth('/products');
    if (res.ok) {
      setProducts(await res.json());
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadCustomers = async () => {
    if (customerSearch.trim() === '') {
      setCustomers([]);
      return;
    }
    const res = await fetchWithAuth(`/customers?search=${encodeURIComponent(customerSearch)}`);
    if (res.ok) {
      setCustomers(await res.json());
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);

  // Click outside listener for customer suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (custSuggestionsRef.current && !custSuggestionsRef.current.contains(event.target as Node)) {
        setShowCustSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Click outside suggestions dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on search query
  const filteredProducts = searchQuery.trim() === ''
    ? []
    : products.filter((p) =>
        p.isActive && (
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode.includes(searchQuery) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exactMatch = products.find((p) => p.barcode === searchQuery.trim() && p.isActive);
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
        setShowSuggestions(false);
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchQuery('');
        setShowSuggestions(false);
      }
    }
  };

  // USB Barcode Scanner Keyboard Emulation Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input field (so user can type manually without trigger)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 50) {
        buffer = ''; // reset buffer if typed slowly
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 3) {
          e.preventDefault();
          handleBarcodeScan(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode && p.isActive);
    if (!product) {
      alert(`Product with barcode "${barcode}" not found or inactive.`);
      return;
    }
    addToCart(product);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Insufficient stock. Only ${product.stock} available.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.stock < 1) {
        alert('Product is out of stock.');
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + change;
          if (newQty > item.product.stock) {
            alert(`Insufficient stock. Only ${item.product.stock} available.`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };


  // Calculations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.quantity * item.product.sellingPrice, 0);
  };
  const subtotal = calculateSubtotal();
  const discount = Number(discountInput) || 0;
  const tax = Number(taxInput) || 0;
  const grandTotal = Math.max(0, subtotal - discount + tax);

  const handleCheckout = async () => {
    setError(null);
    if (cart.length === 0) {
      setError('Shopping cart is empty');
      return;
    }

    const payload = {
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName || ''}`.trim() : customerName,
      paymentMethod,
      discount,
      tax,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await fetchWithAuth('/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Checkout failed');
      }

      const invoice: InvoiceDetail = await res.json();
      setCompletedInvoice(invoice);
      setCart([]);
      setDiscountInput('0');
      setTaxInput('0');
      setCustomerName('Walk-in Customer');
      setSelectedCustomer(null);
      setCustomerSearch('');
      loadProducts(); // refresh stock numbers
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {/* LEFT: Cart Terminal */}
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-100">Checkout Cart</h2>
          <button onClick={() => setCart([])} className="text-xs text-red-400 hover:underline">Clear Cart</button>
        </div>

        {/* Product Search Autosuggest Input */}
        <div className="relative" ref={suggestionsRef}>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search by product name, SKU, or scan barcode..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          {showSuggestions && filteredProducts.length > 0 && (
            <div className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 shadow-2xl divide-y divide-slate-800">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    addToCart(prod);
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-slate-900 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{prod.name}</p>
                    <p className="text-[10px] text-slate-400">Barcode: {prod.barcode} {prod.sku ? `| SKU: ${prod.sku}` : ''}</p>
                  </div>
                  <span className="text-emerald-400 font-bold">Rs. {prod.sellingPrice}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <p className="text-sm">Scan an item or enter barcode to begin checkout.</p>
              <p className="text-[10px] mt-1 text-slate-600">(USB scanner emulation is active on this page)</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100 truncate">{item.product.name}</p>
                  <p className="text-xs text-slate-400">Rs. {item.product.sellingPrice} | Barcode: {item.product.barcode}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 p-1">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2 py-0.5 text-slate-400 hover:text-slate-100 font-bold">-</button>
                    <span className="text-sm text-slate-200 px-1">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2 py-0.5 text-slate-400 hover:text-slate-100 font-bold">+</button>
                  </div>
                  <span className="text-sm font-bold text-slate-200 min-w-[70px] text-right">Rs. {(item.quantity * item.product.sellingPrice).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-300">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations Breakdown */}
        <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-slate-200 font-semibold">Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="grid gap-3 grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Discount (Flat Rs.)</label>
              <input value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} type="number" min="0" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 text-xs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Tax (Flat Rs.)</label>
              <input value={taxInput} onChange={(e) => setTaxInput(e.target.value)} type="number" min="0" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 text-xs" />
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-3 text-lg font-bold">
            <span className="text-slate-200">Grand Total</span>
            <span className="text-emerald-400">Rs. {grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Customer & Payment Checkout Panel */}
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-2">Checkout Details</h3>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Customer Selection</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500 bg-emerald-500/10 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {selectedCustomer.firstName} {selectedCustomer.lastName || ''}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Code: {selectedCustomer.customerCode} | Loyalty Pts: {selectedCustomer.loyaltyPoints}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="relative" ref={custSuggestionsRef}>
                <input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustSuggestions(true);
                  }}
                  onFocus={() => setShowCustSuggestions(true)}
                  placeholder="Search customer by name, phone, code..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                {showCustSuggestions && customers.length > 0 && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 shadow-2xl divide-y divide-slate-800">
                    {customers.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setCustomerSearch('');
                          setShowCustSuggestions(false);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-900 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">
                            {cust.firstName} {cust.lastName || ''}
                          </p>
                          <p className="text-[10px] text-slate-400">Phone: {cust.phone} | Code: {cust.customerCode}</p>
                        </div>
                        <span className="text-emerald-400 text-[10px]">Pts: {cust.loyaltyPoints}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Fallback Manual Name */}
                <div className="mt-3">
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Manual Walk-in Customer Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1 text-slate-300 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Payment Method</label>
            <div className="grid gap-2 grid-cols-3">
              {['CASH', 'CARD', 'MOBILE'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    paymentMethod === method
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={handleCheckout} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors py-3 font-bold text-slate-950">
            Complete checkout
          </button>
        </div>

        {/* Dynamic Thermal Receipt Printer Preview */}
        {completedInvoice && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-md font-bold text-slate-100">Thermal Receipt</h3>
              <button onClick={handlePrint} className="rounded bg-sky-600 hover:bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-100 transition-colors">
                Print Receipt
              </button>
            </div>

            {/* Receipt Content container optimized for 80mm roll printer output */}
            <div ref={printAreaRef} id="receipt-print-area" className="bg-white text-black p-4 font-mono text-xs w-[80mm] max-w-full mx-auto border border-slate-300 rounded shadow-md">
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
                <h4 className="text-sm font-bold uppercase">Speciality shop</h4>
                <p>Bhera service Area North side</p>
                <p>Ph no: +92 300 1113821</p>
              </div>

              <div className="space-y-1 py-2 border-b border-dashed border-gray-400">
                <p><strong>Invoice:</strong> {completedInvoice.invoiceNumber}</p>
                <p><strong>Date:</strong> {new Date(completedInvoice.createdAt).toLocaleString()}</p>
                <p><strong>Customer:</strong> {completedInvoice.customerName}</p>
                <p><strong>Payment:</strong> {completedInvoice.paymentMethod}</p>
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
                  {completedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{item.productName}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">Rs. {item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 border-t border-dashed border-gray-400 pt-2 text-right">
                <p>Subtotal: Rs. {completedInvoice.subtotal.toFixed(2)}</p>
                {completedInvoice.discount > 0 && <p>Discount: -Rs. {completedInvoice.discount.toFixed(2)}</p>}
                {completedInvoice.tax > 0 && <p>Tax: +Rs. {completedInvoice.tax.toFixed(2)}</p>}
                <p className="text-sm font-bold border-t border-dashed border-gray-400 pt-1">
                  Total: Rs. {completedInvoice.total.toFixed(2)}
                </p>
              </div>

              <div className="text-center mt-4 pt-2 border-t border-dashed border-gray-400 space-y-1">
                <p className="font-bold">Thank You For Your Purchase!</p>
                <p className="text-[10px]">Please visit us again.</p>
                <div className="text-[9px] text-gray-500 border-t border-dotted border-gray-300 pt-1 mt-1">
                  <p>Developed by Saad Qazi</p>
                  <p>+92 320 7480116</p>
                </div>
              </div>
            </div>
            <button onClick={() => setCompletedInvoice(null)} className="w-full text-center text-xs text-slate-400 hover:underline">Close Preview</button>
          </div>
        )}
      </div>

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
