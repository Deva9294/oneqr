'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { User, CreditCard, Droplets, Phone, Shield, Lock, FileText, Download, Smartphone, AlertCircle } from 'lucide-react';

interface PublicProfile {
  name: string;
  avatar: string;
  upiId: string;
  upiDeepLink: string;
  bloodGroup?: string;
  emergencyContacts?: any[];
  medicalConditions?: string[];
  activeProfile: string;
  businessName?: string;
  gstNumber?: string;
  qrCodeImage: string;
}

interface Document {
  _id: string;
  title: string;
  type: string;
  category: string;
  requiresPin: boolean;
}

export default function ScanPage() {
  const { qrCode } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'pin' | 'otp' | null>(null);
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [scannerName, setScannerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [downloadData, setDownloadData] = useState<any>(null);

  useEffect(() => {
    if (!qrCode) return;
    fetchProfile();
  }, [qrCode]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get(`/qr/${qrCode}/scan`);
      if (data.type === 'public_profile') {
        setProfile(data.profile);
        setProfile((prev) => ({ ...prev!, qrCodeImage: data.qrCodeImage }));
        // Fetch public documents
        const docsRes = await api.get(`/public/documents/${qrCode}`);
        setDocuments(docsRes.data?.documents || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (!profile?.upiDeepLink) return;
    window.location.href = profile.upiDeepLink;
  };

  const requestDownload = async (docId: string, method: 'pin' | 'otp') => {
    setSelectedDoc(docId);
    setAuthMethod(method);
    setDownloadData(null);
    try {
      const { data } = await api.post(`/documents/${docId}/download/request`, { method });
      if (!data.requiresAuth) {
        setDownloadData(data);
      } else {
        toast.success(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Request failed');
    }
  };

  const verifyAndDownload = async () => {
    if (!selectedDoc || !authMethod) return;
    setVerifying(true);
    try {
      const { data } = await api.post(`/documents/${selectedDoc}/download/verify`, {
        method: authMethod,
        pin: authMethod === 'pin' ? pin : undefined,
        otp: authMethod === 'otp' ? otp : undefined,
        scannerName: scannerName || 'Anonymous',
      });
      setDownloadData(data);
      toast.success('Download ready!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invalid QR Code</h2>
          <p className="text-slate-400">This QR code does not exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Profile Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6 text-center">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-blue-500" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-700 mx-auto mb-3 flex items-center justify-center">
              <User className="w-10 h-10 text-slate-400" />
            </div>
          )}
          <h2 className="text-xl font-bold text-white">{profile.name}</h2>
          {profile.activeProfile === 'business' && profile.businessName && (
            <p className="text-blue-400 text-sm mt-1">{profile.businessName}</p>
          )}
          <p className="text-slate-500 text-sm mt-1">{profile.upiId}</p>

          {profile.bloodGroup && (
            <div className="flex items-center justify-center gap-2 mt-3 text-red-400 text-sm">
              <Droplets className="w-4 h-4" /> Blood Group: {profile.bloodGroup}
            </div>
          )}

          <button
            onClick={handlePay}
            className="mt-5 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <CreditCard className="w-5 h-5" /> Pay Now via UPI
          </button>
        </div>

        {/* Emergency Info */}
        {profile.emergencyContacts && profile.emergencyContacts.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" /> Emergency Info
            </h3>
            {profile.emergencyContacts.map((contact: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div>
                  <p className="text-white text-sm">{contact.name} <span className="text-slate-500">({contact.relation})</span></p>
                </div>
                <a href={`tel:${contact.phone}`} className="text-blue-400 text-sm flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Call
                </a>
              </div>
            ))}
            {profile.medicalConditions && profile.medicalConditions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs">Medical Conditions:</p>
                <p className="text-amber-400 text-sm">{profile.medicalConditions.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" /> Available Documents
          </h3>

          {documents.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No documents available for sharing</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${doc.category === 'government' ? 'text-emerald-400' : 'text-blue-400'}`} />
                    <div>
                      <p className="text-white text-sm font-medium">{doc.title}</p>
                      <p className="text-slate-500 text-xs">{doc.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {doc.requiresPin ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => requestDownload(doc._id, 'pin')}
                        className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" /> PIN
                      </button>
                      <button
                        onClick={() => requestDownload(doc._id, 'otp')}
                        className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Smartphone className="w-3 h-3" /> OTP
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => requestDownload(doc._id, 'pin')}
                      className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auth Modal */}
        {selectedDoc && authMethod && !downloadData && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-white font-semibold mb-4">
                {authMethod === 'pin' ? 'Enter Document PIN' : 'Enter OTP'}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {authMethod === 'pin'
                  ? 'Ask the QR owner for their 4-digit Document PIN'
                  : 'Enter the 6-digit OTP sent to the owner\'s phone'}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 text-sm">Your Name (optional)</label>
                  <input
                    type="text"
                    value={scannerName}
                    onChange={(e) => setScannerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 mt-1"
                    placeholder="e.g., Dr. Sharma"
                  />
                </div>

                {authMethod === 'pin' ? (
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="4-digit PIN"
                  />
                ) : (
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="6-digit OTP"
                  />
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setSelectedDoc(null); setAuthMethod(null); setPin(''); setOtp(''); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyAndDownload}
                  disabled={verifying || (authMethod === 'pin' ? pin.length !== 4 : otp.length !== 6)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {verifying ? 'Verifying...' : 'Verify & Download'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download Success */}
        {downloadData && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-center">
              <Download className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Download Ready!</h3>
              <p className="text-slate-400 text-sm mb-4">{downloadData.title}</p>
              <a
                href={downloadData.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium"
              >
                Open Document
              </a>
              <button
                onClick={() => { setDownloadData(null); setSelectedDoc(null); setAuthMethod(null); setPin(''); setOtp(''); }}
                className="block mx-auto mt-3 text-slate-500 text-sm hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
