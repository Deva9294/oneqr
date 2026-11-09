'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { AlertCircle, Download, FileText, Loader2, ShieldCheck } from 'lucide-react';

interface SharedDocument {
  title: string;
  fileUrl: string;
  fileType: string;
}

export default function ExpiringDocumentPage() {
  const params = useParams();
  const token = String(params.token || '');
  const [document, setDocument] = useState<SharedDocument | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get(`/documents/access/${encodeURIComponent(token)}`)
      .then(({ data }) => setDocument(data.document))
      .catch((err) => setError(err.response?.data?.message || 'This share link has expired or was already used.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <ShieldCheck className="h-7 w-7 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">OneQR Secure Share</h1>
        <p className="mt-2 text-sm text-slate-400">This is a single-use document link. The download link expires after a short time.</p>
        {loading && <div className="mt-8 flex items-center justify-center gap-2 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /> Checking secure link…</div>}
        {!loading && error && <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="mx-auto mb-2 h-6 w-6" />{error}</div>}
        {!loading && document && (
          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800 p-5">
            <FileText className="mx-auto mb-3 h-8 w-8 text-blue-400" />
            <h2 className="font-semibold text-white">{document.title}</h2>
            <p className="mt-1 text-xs uppercase text-slate-400">{document.fileType}</p>
            <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500">
              <Download className="h-4 w-4" /> Download document
            </a>
          </div>
        )}
        <p className="mt-7 text-xs text-slate-500">Never share sensitive identity documents through public links.</p>
      </section>
    </main>
  );
}
