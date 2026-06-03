'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, X, File, Shield, Lock, Unlock, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('custom');
  const [category, setCategory] = useState('basic');
  const [requiresPin, setRequiresPin] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypes = [
    { value: 'aadhaar', label: 'Aadhaar Card', category: 'government' },
    { value: 'pan', label: 'PAN Card', category: 'government' },
    { value: 'driving_license', label: 'Driving License', category: 'government' },
    { value: 'qualification', label: 'Qualification / Degree', category: 'basic' },
    { value: 'income', label: 'Income / Aay Certificate', category: 'sensitive' },
    { value: 'caste', label: 'Caste / Jati Certificate', category: 'sensitive' },
    { value: 'domicile', label: 'Domicile / Moolnivasi', category: 'sensitive' },
    { value: 'custom', label: 'Custom Document', category: 'basic' },
    { value: 'other', label: 'Other', category: 'basic' },
  ];

  const handleTypeChange = (value: string) => {
    setDocType(value);
    const found = docTypes.find((d) => d.value === value);
    if (found) setCategory(found.category);
    if (value === 'aadhaar' || value === 'pan' || value === 'driving_license') {
      setRequiresPin(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxSize = 10 * 1024 * 1024;
    if (selected.size > maxSize) {
      toast.error('File size must be under 10MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/zip'];
    if (!allowedTypes.includes(selected.type)) {
      toast.error('Only PDF, JPG, PNG, WEBP, and ZIP files allowed');
      return;
    }

    setFile(selected);
    if (!title) {
      setTitle(selected.name.split('.')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('type', docType);
    formData.append('category', category);
    formData.append('requiresPin', String(requiresPin));

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Upload Document</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600 hover:border-slate-500 bg-slate-800'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <File className="w-8 h-8 text-emerald-400" />
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  <p className="text-slate-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-slate-500 text-sm">PDF, JPG, PNG, WEBP, ZIP (max 10MB)</p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., My Aadhaar Card"
              required
            />
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Document Type</label>
            <div className="grid grid-cols-2 gap-2">
              {docTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    docType === type.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Security */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="sensitive">Sensitive</option>
                <option value="government">Government</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Security</label>
              <button
                type="button"
                onClick={() => setRequiresPin(!requiresPin)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  requiresPin
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {requiresPin ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {requiresPin ? 'PIN Protected' : 'Open Access'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-400 text-sm font-medium">Security Note</p>
              <p className="text-slate-400 text-xs mt-1">
                Government and sensitive documents are automatically PIN-protected. 
                Anyone downloading must enter your 4-digit PIN or request an OTP.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      </div>
    </div>
  );
}
