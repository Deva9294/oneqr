'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, CreditCard, Eye, Smartphone, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/scans/analytics?period=30');
      setData(data);
    } catch (err: any) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const dailyTrend = data?.dailyTrend || [];
  const deviceStats = data?.deviceStats || [];
  const topLocations = data?.topLocations || [];

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-1 mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" /> Scan Analytics
        </h2>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Scans (30d)</span>
            </div>
            <p className="text-3xl font-bold text-white">{summary.totalScans || 0}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Payment Scans</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{summary.paymentScans || 0}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs">Profile Views</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">{summary.profileViews || 0}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs">Doc Views</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">{summary.documentViews || 0}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Trend */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Daily Scan Trend
            </h3>
            {dailyTrend.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No data available</p>
            ) : (
              <div className="space-y-2">
                {dailyTrend.map((day: any) => (
                  <div key={day._id} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-20">{day._id}</span>
                    <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (day.scans / (summary.totalScans || 1)) * 100 * dailyTrend.length)}%` }}
                      />
                    </div>
                    <span className="text-white text-xs font-medium w-8 text-right">{day.scans}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Stats */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" /> Device Breakdown
            </h3>
            {deviceStats.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {deviceStats.map((device: any) => (
                  <div key={device._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-slate-300 text-sm capitalize">{device._id || 'Unknown'}</span>
                    </div>
                    <span className="text-white font-bold">{device.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Locations */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400" /> Top Locations
          </h3>
          {topLocations.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No location data available</p>
          ) : (
            <div className="grid md:grid-cols-5 gap-4">
              {topLocations.map((loc: any) => (
                <div key={loc._id} className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <MapPin className="w-5 h-5 text-red-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">{loc._id || 'Unknown'}</p>
                  <p className="text-slate-400 text-xs">{loc.count} scans</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
