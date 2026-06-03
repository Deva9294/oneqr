import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OneQR - All Your Documents in One QR Code | Secure Document Storage & UPI Payments',
  description: 'OneQR is India\'s most secure unified QR platform. Store Aadhaar, PAN, DL and all documents in one permanent QR code. Accept UPI payments instantly. PIN & OTP protected document sharing.',
  keywords: ['QR code', 'document storage', 'UPI payment', 'Aadhaar', 'PAN card', 'DigiLocker alternative', 'secure documents', 'India'],
  authors: [{ name: 'OneQR' }],
  creator: 'OneQR',
  publisher: 'OneQR',
  robots: 'index, follow',
  metadataBase: new URL('https://oneqr.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'OneQR - All Your Documents in One QR Code',
    description: 'Store, Share & Secure Your Files with a Single Scan. Accept UPI payments and share documents securely.',
    url: 'https://oneqr.in',
    siteName: 'OneQR',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://oneqr.in/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OneQR - Unified QR Platform for Documents and Payments',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OneQR - All Your Documents in One QR Code',
    description: 'Store, Share & Secure Your Files with a Single Scan. Accept UPI payments and share documents securely.',
    images: ['https://oneqr.in/og-image.jpg'],
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'technology',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'OneQR',
  url: 'https://oneqr.in',
  description: 'OneQR is a unified QR platform for secure document storage and UPI payments.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://oneqr.in/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
  publisher: {
    '@type': 'Organization',
    name: 'OneQR',
    logo: {
      '@type': 'ImageObject',
      url: 'https://oneqr.in/logo.png',
    },
    sameAs: [
      'https://facebook.com/oneqr',
      'https://twitter.com/oneqr',
      'https://instagram.com/oneqr',
    ],
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
  },
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="theme-color" content="#0f172a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
