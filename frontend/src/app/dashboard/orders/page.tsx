'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ShoppingBag, Truck, CreditCard, MapPin, Package, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const router = useRouter();
  const [step, setStep] = useState<'product' | 'address' | 'payment'>('product');
  const [product, setProduct] = useState({ type: 'pvc_card', qty: 1 });
  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [placing, setPlacing] = useState(false);

  const prices: Record<string, number> = { pvc_card: 50, keychain: 10, premium_sticker: 30 };
  const total = prices[product.type] * product.qty;

  const handlePlaceOrder = async () => {
    if (!address.fullName || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      toast.error('Please fill all shipping details');
      return;
    }
    setPlacing(true);
    try {
      await api.post('/orders', {
        orderType: product.type,
        quantity: product.qty,
        shippingAddress: address,\n        paymentMethod: 'cod',
      });
      toast.success('Order placed successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-1 mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-amber-400" /> Order QR Products
        </h2>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['product', 'address', 'payment'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-amber-500 text-slate-900' :
                ['product', 'address', 'payment'].indexOf(step) > i ? 'bg-emerald-500 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {['product', 'address', 'payment'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`h-0.5 flex-1 ${['product', 'address', 'payment'].indexOf(step) > i ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Product Selection */}
        {step === 'product' && (
          <div className="space-y-4">
            {[
              { type: 'pvc_card', name: 'Premium PVC QR Card', price: 50, desc: 'Durable, waterproof card' },
              { type: 'keychain', name: 'QR Keychain', price: 10, desc: 'Metal keychain with QR' },
              { type: 'premium_sticker', name: 'Premium Sticker', price: 30, desc: 'Waterproof vinyl sticker' },
            ].map((p) => (
              <button
                key={p.type}
                onClick={() => setProduct({ ...product, type: p.type })}
                className={`w-full text-left p-5 rounded-2xl border transition-colors flex items-center justify-between ${
                  product.type === p.type ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div>
                  <h4 className="text-white font-semibold">{p.name}</h4>
                  <p className="text-slate-400 text-sm">{p.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-bold text-lg">₹{p.price}</p>
                </div>
              </button>
            ))}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <label className="text-slate-300 text-sm">Quantity</label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setProduct({ ...product, qty: Math.max(1, product.qty - 1) })}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white"
                >
                  -
                </button>
                <span className="text-white font-bold w-8 text-center">{product.qty}</span>
                <button
                  onClick={() => setProduct({ ...product, qty: product.qty + 1 })}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <span className="text-amber-400 font-semibold">Total</span>
              <span className="text-amber-400 font-bold text-xl">₹{total}</span>
            </div>

            <button onClick={() => setStep('address')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl">
              Continue to Shipping
            </button>
          </div>
        )}

        {/* Address */}
        {step === 'address' && (
          <div className="space-y-4">
            {[
              { key: 'fullName', label: 'Full Name', placeholder: 'John Doe' },
              { key: 'phone', label: 'Phone', placeholder: '9876543210' },
              { key: 'line1', label: 'Address Line 1', placeholder: '123 Main Street' },
              { key: 'line2', label: 'Address Line 2 (Optional)', placeholder: 'Apartment, Floor' },
              { key: 'city', label: 'City', placeholder: 'Mumbai' },
              { key: 'state', label: 'State', placeholder: 'Maharashtra' },
              { key: 'pincode', label: 'Pincode', placeholder: '400001' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={(address as any)[field.key]}
                  onChange={(e) => setAddress({ ...address, [field.key]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder={field.placeholder}
                  required={field.label !== 'Address Line 2 (Optional)'}
                />
              </div>
            ))}

            <div className="flex gap-3">
              <button onClick={() => setStep('product')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl">
                Back
              </button>
              <button onClick={() => setStep('payment')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold">
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" /> Order Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Product</span>
                  <span className="text-white">{product.type === 'pvc_card' ? 'PVC QR Card' : product.type === 'keychain' ? 'QR Keychain' : 'Premium Sticker'} x{product.qty}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Shipping</span>
                  <span className="text-emerald-400">Free</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-amber-400 font-bold text-lg">₹{total}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" /> Shipping To
              </h4>
              <p className="text-slate-300 text-sm">{address.fullName}</p>
              <p className="text-slate-400 text-sm">{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
              <p className="text-slate-400 text-sm">{address.city}, {address.state} - {address.pincode}</p>
              <p className="text-slate-400 text-sm">{address.phone}</p>
            </div>

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4">
              <p className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Payment Method
              </p>
              <p className="text-slate-400 text-xs">Cash on Delivery is currently available. Online payment is not enabled for QR product orders yet.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('address')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl">
                Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-900 font-bold py-3 rounded-xl"
              >
                {placing ? 'Placing Order...' : `Place COD Order · ₹${total}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
