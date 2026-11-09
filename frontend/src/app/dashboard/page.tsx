'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  FileText, Shield, Download, Eye, Trash2, Upload, QrCode,
  CreditCard, BarChart3, ShoppingBag, LogOut, User, Smartphone,
  Lock, Clock, TrendingUp, MapPin, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Document {
  _id: string;
  title: string;
  type: string;
  category: string;
  fileUrl: string;
  fileType: string;
  downloadCount: number;
  requiresPin: boolean;
  isPublic: boolean;
  createdAt: string;
}

interface ScanStat {
  type: string;
  count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [scanStats, setScanStats] = useState({ totalScans: 0, paymentScans: 0, profileViews: 0 });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [docsRes, analyticsRes, recentRes] = await Promise.all([
        api.get('/documents'),
        api.get('/scans/analytics?period=30'),
        api.get('/scans/recent'),
      ]);
      setDocuments(docsRes.data.documents);
      setScanStats(analyticsRes.data.summary);
      setRecentScans(recentRes.data.scans);
    } catch (err: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (doc: Document) => {
    const next = !doc.isPublic;
    try {
      const { data } = await api.patch(`/documents/${doc._id}/sharing`, { isPublic: next });
      setDocuments((current) => current.map((item) => item._id === doc._id
        ? { ...item, isPublic: data.document.isPublic, requiresPin: data.document.requiresPin }
        : item));
      toast.success(next ? 'Document shared on your QR profile (PIN protected)' : 'Document sharing disabled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update sharing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(documents.filter((d) => d._id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const getDocIcon = (type: string) => {
    if (type === 'aadhaar') return <Shield className="w-5 h-5 text-emerald-400" />;
    if (type === 'pan') return <Shield className="w-5 h-5 text-blue-400" />;
    if (type === 'driving_license') return <Smartphone className="w-5 h-5 text-amber-400" />;
    if (type === 'income') return <BarChart3 className="w-5 h-5 text-purple-400" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">OneQR Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden md:block">Welcome back, {user?.name}</span>
            <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* QR & Stats Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* QR Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" /> Your QR Code
            </h3>
            {user?.qrCodeImage && (
              <div className="flex flex-col items-center">
                <img src={user.qrCodeImage} alt="Your QR" className="w-40 h-40 rounded-xl bg-white p-2 mb-3" />
                <p className="text-slate-400 text-sm mb-1">{user.qrCode}</p>
                <p className="text-slate-500 text-xs">UPI: {user.upiId}</p>
                <div className="flex gap-2 mt-3">
                  <a href={user.qrCodeImage} download className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg">
                    Download QR
                  </a>
                  <Link href="/dashboard/orders" className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Order PVC
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Total Scans</span>
              </div>
              <p className="text-3xl font-bold text-white">{scanStats.totalScans}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs">Payment Scans</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{scanStats.paymentScans}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-xs">Profile Views</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{scanStats.profileViews}</p>
            </div>

            {/* Recent Activity */}
            <div className="col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-3 text-sm">Recent Activity</h4>
              <div className="space-y-2">
                {recentScans.length === 0 && <p className="text-slate-500 text-sm">No scans yet</p>}
                {recentScans.slice(0, 5).map((scan) => (
                  <div key={scan._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {scan.type === 'payment' ? <CreditCard className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
                      <span className="text-slate-300 capitalize">{scan.type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{formatDate(scan.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> Your Documents
            </h3>
            <Link href="/upload" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No documents yet</p>
              <p className="text-slate-500 text-sm mt-1">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase">
                    <th className="pb-3 pl-2">Document</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Uploaded</th>
                    <th className="pb-3">Downloads</th>
                    <th className="pb-3">Security / Sharing</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {documents.map((doc) => (
                    <tr key={doc._id} className="group">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          {getDocIcon(doc.type)}
                          <div>
                            <p className="text-white text-sm font-medium">{doc.title}</p>
                            <p className="text-slate-500 text-xs uppercase">{doc.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          doc.category === 'government' ? 'bg-emerald-500/20 text-emerald-400' :
                          doc.category === 'sensitive' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-600/30 text-slate-400'
                        }`}>
                          {doc.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 text-slate-400 text-sm">{doc.downloadCount}</td>
                      <td className="py-3">
                        {doc.requiresPin ? (
                          <span className="flex items-center gap-1 text-amber-400 text-xs">
                            <Lock className="w-3 h-3" /> PIN
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Open</span>
                        )}
                        {doc.isPublic && <span className="ml-2 text-emerald-400 text-xs">Shared</span>}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          {doc.category === 'basic' && (
                            <button onClick={() => handleShare(doc)} title={doc.isPublic ? 'Disable QR sharing' : 'Share on QR profile'} className={doc.isPublic ? 'text-emerald-400 hover:text-emerald-300 p-1' : 'text-slate-400 hover:text-white p-1'}>
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(doc._id)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 p-1">
                            <Eye className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4">
          <Link href="/upload" className="bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-5 transition-colors">
            <Upload className="w-6 h-6 text-blue-400 mb-3" />
            <h4 className="text-white font-medium text-sm">Upload Document</h4>
            <p className="text-slate-500 text-xs mt-1">Add new files to your vault</p>
          </Link>
          <Link href="/dashboard/gov-fetch" className="bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 transition-colors">
            <Shield className="w-6 h-6 text-emerald-400 mb-3" />
            <h4 className="text-white font-medium text-sm">Fetch Government Docs</h4>
            <p className="text-slate-500 text-xs mt-1">Aadhaar, PAN, DL via API</p>
          </Link>
          <Link href="/dashboard/analytics" className="bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-5 transition-colors">
            <BarChart3 className="w-6 h-6 text-amber-400 mb-3" />
            <h4 className="text-white font-medium text-sm">Scan Analytics</h4>
            <p className="text-slate-500 text-xs mt-1">Track QR scan activity</p>
          </Link>
          <Link href="/dashboard/orders" className="bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-xl p-5 transition-colors">
            <ShoppingBag className="w-6 h-6 text-purple-400 mb-3" />
            <h4 className="text-white font-medium text-sm">Order QR Card</h4>
            <p className="text-slate-500 text-xs mt-1">Premium PVC card ₹50</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
