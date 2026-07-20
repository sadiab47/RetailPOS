"use client";

import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  barcode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
};

type CartItem = Product & { quantity: number };

const initialProducts = [
  { id: 1, barcode: '890123456789', name: 'Pepsi 500ml', price: 120, stock: 50, category: 'Beverages' },
  { id: 2, barcode: '890123456790', name: 'Coke 500ml', price: 150, stock: 32, category: 'Beverages' },
  { id: 3, barcode: '890123456791', name: 'Lays Chips', price: 80, stock: 12, category: 'Snacks' },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:4000/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts(initialProducts));
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const tax = subtotal * 0.17;
  const total = subtotal - discount + tax;

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setBarcodeInput('');
  };

  const handleBarcodeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = products.find((product) => product.barcode === barcodeInput.trim());
    if (found) {
      addToCart(found);
    } else {
      alert('Product not found for that barcode.');
    }
  };

  const checkout = async () => {
    const response = await fetch('http://localhost:4000/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((item) => ({ barcode: item.barcode, quantity: item.quantity })),
        customerName,
        paymentMethod,
        discount,
      }),
    });
    const data = await response.json();
    setReceipt(data);
    setCart([]);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Retail POS</p>
            <h1 className="mt-2 text-3xl font-semibold">Barcode-driven checkout</h1>
            <p className="mt-2 text-slate-400">Scan a product, add it to the cart, and generate an invoice instantly.</p>
          </header>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Barcode Scanner</h2>
            <form onSubmit={handleBarcodeSubmit} className="mt-4 flex gap-3">
              <input
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                placeholder="Scan or type barcode"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              />
              <button type="submit" className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950">Add to Cart</button>
            </form>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {products.map((product) => (
                <button key={product.id} onClick={() => addToCart(product)} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-slate-400">{product.barcode}</p>
                  <p className="mt-2 text-emerald-400">Rs. {product.price}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Shopping Cart</h2>
            <div className="mt-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400">No items yet. Scan a barcode to begin.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-400">x{item.quantity}</p>
                    </div>
                    <p className="font-semibold">Rs. {item.price * item.quantity}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>Rs. {discount}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>Rs. {tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-semibold text-emerald-400"><span>Grand Total</span><span>Rs. {total.toFixed(2)}</span></div>
            </div>

            <div className="mt-4 space-y-3">
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Customer name" />
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                <option>Cash</option>
                <option>Card</option>
                <option>Mobile Wallet</option>
              </select>
              <input type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Discount" />
              <button onClick={checkout} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950">Generate Bill</button>
            </div>
          </div>

          {receipt ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm">
              <p className="text-emerald-400">Invoice generated</p>
              <p className="mt-2 text-lg font-semibold">{receipt.invoiceNumber}</p>
              <p className="mt-2">Customer: {receipt.customerName}</p>
              <p>Payment: {receipt.paymentMethod}</p>
              <p className="mt-2">Subtotal: Rs. {receipt.subtotal}</p>
              <p>Tax: Rs. {receipt.tax.toFixed(2)}</p>
              <p>Discount: Rs. {receipt.discount}</p>
              <p className="mt-2 text-lg font-semibold">Total: Rs. {receipt.total.toFixed(2)}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
