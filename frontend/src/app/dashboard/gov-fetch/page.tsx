'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Shield, CreditCard, Smartphone, ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function GovFetchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'aadhaar' | 'pan' | 'dl'>('aadhaar');
  const [form, setForm] = useState({ idNumber: '', dob: '', otp: '' });
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFetch = async () => {
    setFetching(true);
    try {
      const { data } = await api.post('/documents/government/fetch', {
        type: activeTab,
        idNumber: form.idNumber,
        dob: form.dob,
        otp: form.otp || undefined,
      });
      setResult(data.data);
      toast.success(`${activeTab.toUpperCase()} fetched successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch from government server');
    } finally {
      setFetching(false);
    }
  };

  const tabs = [
    { key: 'aadhaar', label: 'Aadhaar', icon: Shield, placeholder: '1234 5678 9012', otpLabel: 'Enter UIDAI OTP' },
    { key: 'pan', label: 'PAN', icon: CreditCard, placeholder: 'ABCDE1234F', otpLabel: undefined },
    { key: 'dl', label: 'Driving License', icon: Smartphone, placeholder: 'MH01 2023 0012345', otpLabel: undefined },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-1 mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h2 className="text-2xl font-bold text-white mb-2">Fetch Government Documents</h2>
        <p className="text-slate-400 text-sm mb-6">Directly fetch verified documents from official government APIs.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); setResult(null); setForm({ idNumber: '', dob: '', otp: '' }); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {result ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Document Fetched Successfully!</h3>
            <p className="text-slate-400 text-sm mb-4">Your {currentTab.label} has been saved to your vault.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {currentTab.label} Number
              </label>
              <div className="relative">
                <currentTab.icon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={form.idNumber}
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder={currentTab.placeholder}
                />
              </div>
            </div>

            {(activeTab === 'pan' || activeTab === 'dl') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {activeTab === 'aadhaar' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">UIDAI OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter 6-digit OTP"
                />
                <p className="text-slate-500 text-xs mt-1">UIDAI OTP integration is not connected yet. Do not enter an OTP here until the authorized provider is enabled.</p>
              </div>
            )}

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-3">
              <p className="text-blue-400 text-xs">
                <strong>Note:</strong> Government API fetching is currently disabled. OneQR will not show demo identity data as verified. Upload your document manually until an authorized provider integration is configured.
              </p>
            </div>

            <button
              onClick={handleFetch}
              disabled={fetching || !form.idNumber}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {fetching && <Loader2 className="w-4 h-4 animate-spin" />}
              {fetching ? 'Fetching...' : `Fetch ${currentTab.label}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
