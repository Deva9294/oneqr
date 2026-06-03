'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, User, Mail, Phone, Lock, CreditCard, Droplets } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    documentPin: '',
    upiId: '',
    bloodGroup: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.documentPin.length !== 4 || !/^\d{4}$/.test(form.documentPin)) {
      toast.error('Document PIN must be exactly 4 digits');
      return;
    }
    if (!form.upiId.includes('@')) {
      toast.error('Please enter a valid UPI ID');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.user, data.token);
      toast.success('Account created! Welcome to OneQR.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Create Account</h2>
        <p className="text-slate-400 text-center mb-8">Get your permanent OneQR code</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="9876543210" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">UPI ID</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input type="text" required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} className={inputClass} placeholder="yourname@upi" />
            </div>
            <p className="text-xs text-slate-500 mt-1">This will be linked to your QR for payments</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Document PIN (4 digits)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input type="password" required maxLength={4} value={form.documentPin} onChange={(e) => setForm({ ...form, documentPin: e.target.value.replace(/\D/g, '') })} className={inputClass} placeholder="1234" />
              </div>
              <p className="text-xs text-slate-500 mt-1">Used to protect document downloads</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Blood Group (Optional)</label>
            <div className="relative">
              <Droplets className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className={inputClass}>
                <option value="">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Creating Account...' : 'Create Account & Get QR'}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
