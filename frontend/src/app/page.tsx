'use client';

import Link from 'next/link';
import { Shield, Smartphone, FolderOpen, ShoppingBag, ChevronRight, Lock, Clock, BarChart3, UserCog } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white">OneQR</h1>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-slate-300 hover:text-white transition-colors">Login</Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            All Your Documents<br />in One QR Code
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Store, Share & Secure Your Files with a Single Scan. Accept UPI payments and share documents securely with OTP/PIN protection.
          </p>
          <div className="flex gap-4">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2">
              Get Started <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="#features" className="border border-slate-600 hover:border-slate-400 text-slate-300 px-8 py-3 rounded-xl font-semibold transition-colors">
              How it Works
            </Link>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-64 h-64 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <div className="text-slate-900 text-center p-4">
                <Smartphone className="w-16 h-16 mx-auto mb-2" />
                <p className="font-bold text-lg">Scan to Pay</p>
                <p className="text-xs text-slate-500">or View Documents</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">One QR. Infinite Possibilities.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-white text-center mb-4">Our Features</h3>
        <p className="text-slate-400 text-center mb-12">Smart & Secure Document Storage</p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: FolderOpen, title: 'Quick Access', desc: 'Scan & Download Instantly' },
            { icon: Lock, title: 'OTP Protection', desc: 'OTP for Aadhaar, PAN, DL' },
            { icon: Shield, title: 'Safe & Secure', desc: 'Your Files Fully Encrypted' },
            { icon: ShoppingBag, title: 'Order Your QR Tag', desc: 'Get a Physical QR Keychain' },
          ].map((f) => (
            <div key={f.title} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-colors">
              <f.icon className="w-8 h-8 text-blue-400 mb-4" />
              <h4 className="text-white font-semibold mb-2">{f.title}</h4>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-white text-center mb-12">Advanced Security & Features</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <Clock className="w-8 h-8 text-amber-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">Expiry Links</h4>
            <p className="text-slate-400 text-sm">Share documents with self-destructing links that expire in 10 minutes.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <BarChart3 className="w-8 h-8 text-emerald-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">Scan Analytics</h4>
            <p className="text-slate-400 text-sm">Track who scanned your QR, from where, and what device they used.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <UserCog className="w-8 h-8 text-blue-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">Multi-Profile</h4>
            <p className="text-slate-400 text-sm">Toggle between Business and Personal profiles instantly.</p>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-600/30 rounded-3xl p-12 flex md:flex-row flex-col items-center gap-12">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-4">Get Your Own QR Keychain!</h3>
            <p className="text-slate-300 mb-2">Order a premium PVC QR Card for just <span className="text-amber-400 font-bold text-xl">₹50</span></p>
            <p className="text-slate-400 mb-6">Carry your QR Code everywhere. Waterproof, durable, and scannable for life.</p>
            <Link href="/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-xl font-bold transition-colors inline-block">
              Order Now
            </Link>
          </div>
          <div className="w-32 h-32 bg-slate-900 rounded-2xl border-2 border-amber-500 flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-amber-400" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p className="text-slate-500 text-sm">OneQR. All rights reserved.</p>
            <span className="hidden md:inline text-slate-700">|</span>
            <p className="text-slate-500 text-sm">Design & Developed by <span className="text-blue-400 font-medium">DevaCore Studio</span></p>
          </div>
          <div className="flex gap-6 text-slate-500 text-sm">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Help Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
