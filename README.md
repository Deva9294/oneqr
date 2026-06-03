# OneQR - Unified QR Platform

> A next-generation alternative to DigiLocker combined with UPI payments. One static QR handles both secure document sharing and direct UPI payments.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (React 19), Tailwind CSS, Zustand |
| Backend | Node.js, Express, MongoDB (Mongoose) |
| Storage | Cloudinary (files), MongoDB (metadata) |
| SMS | Twilio |
| QR Generation | qrcode (npm) |

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  UPI Apps   │     │   Browser   │     │  QR Scanner │
│ (PhonePe,   │     │   /Camera   │     │   (Native)  │
│  GPay, etc) │     │             │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       │ upi://pay         │ GET /scan/:qrCode  │ GET /api/qr/:id/scan
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    OneQR Backend                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth    │  │   QR     │  │ Document │  │ Order  │ │
│  │ Controller│  │ Controller│  │ Controller│  │Controller│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │             │             │            │      │
│  ┌────┴─────────────┴─────────────┴────────────┴────┐ │
│  │              MongoDB + Cloudinary                  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### User Collection
```js
{
  name: String,           // Full name
  email: String,          // Unique
  phone: String,          // Unique (+91)
  password: String,       // bcrypt hashed
  qrCode: String,         // Unique permanent code (OQR-XXXXX)
  qrCodeImage: String,    // Cloudinary URL
  upiId: String,          // e.g., name@upi
  upiDeepLink: String,    // upi://pay?pa=...
  documentPin: String,    // bcrypt hashed 4-digit PIN
  bloodGroup: String,     // A+, B-, etc
  emergencyContacts: [{ name, relation, phone }],
  medicalConditions: [String],
  profiles: [{ type: 'personal'|'business', businessName, gstNumber, isActive }],
  activeProfile: String,  // 'personal' or 'business'
  totalScans: Number,
  totalDownloads: Number,
  totalPayments: Number,
  kycStatus: String,      // pending | verified | rejected
}
```

### Document Collection
```js
{
  user: ObjectId,         // ref: User
  title: String,
  type: Enum,             // aadhaar | pan | dl | qualification | income | caste | domicile | custom | other
  category: Enum,         // basic | sensitive | government
  fileUrl: String,        // Cloudinary URL
  filePublicId: String,   // For deletion
  fileType: Enum,         // pdf | image | zip
  fileSize: Number,
  isGovernmentFetched: Boolean,
  governmentSource: String, // UIDAI | NSDL | Parivahan | DigiLocker
  verificationStatus: String,
  requiresPin: Boolean,   // If true, download requires PIN/OTP
  downloadCount: Number,
  hasExpiryLink: Boolean,
  expiryLinkToken: String,
  expiryLinkExpiresAt: Date,
}
```

### ScanLog Collection
```js
{
  user: ObjectId,
  qrCode: String,
  type: Enum,             // payment | document_view | profile_view
  ipAddress: String,
  userAgent: String,
  deviceType: String,     // mobile | tablet | desktop
  browser: String,
  os: String,
  location: { country, city, lat, lng },
  amount: Number,
  upiApp: String,
  paymentStatus: String,  // initiated | completed | failed
}
```

### Order Collection
```js
{
  user: ObjectId,
  orderType: Enum,        // pvc_card | premium_sticker | keychain
  quantity: Number,
  pricePerUnit: Number,
  totalAmount: Number,
  shippingAddress: { fullName, phone, line1, line2, city, state, pincode },
  paymentStatus: String,
  status: String,         // pending | confirmed | processing | shipped | delivered
  trackingId: String,
  trackingUrl: String,
  carrier: String,
}
```

### Otp Collection
```js
{
  user: ObjectId,
  phone: String,
  code: String,
  purpose: Enum,          // document_download | login | password_reset | phone_verify
  expiresAt: Date,        // TTL index - auto deletes after expiry
  isUsed: Boolean,
  attempts: Number,
}
```

### ExpiryLink Collection
```js
{
  user: ObjectId,
  document: ObjectId,
  token: String,          // UUID/random hex
  expiresAt: Date,        // 10 minutes from creation
  isUsed: Boolean,
  usedAt: Date,
  usedByIp: String,
}
```

---

## API Flow: QR Routing (UPI App vs Browser)

### How It Works

Every user's QR code contains a JSON payload:
```json
{
  "type": "oneqr",
  "id": "OQR-1699999999-ABC123",
  "upi": "user@upi",
  "url": "https://oneqr.in/scan/OQR-1699999999-ABC123"
}
```

**UPI Apps (PhonePe, GPay, Paytm):**
- Detect the `upi://` scheme in the QR payload
- Open their native payment flow directly
- Never hit our server

**Browsers / Camera Scanners:**
- Visit the URL in the QR payload
- Hit our `/api/qr/:qrCode/scan` endpoint
- Server detects User-Agent to identify if it's a UPI app
- Returns UPI deep link data OR public profile data

**Detection Logic:**
```js
const UPI_APPS = ['phonepe', 'gpay', 'paytm', 'bhim', 'cred', 'amazonpay', 'mobikwik'];

function detectScannerType(userAgent) {
  const ua = userAgent.toLowerCase();
  for (const app of UPI_APPS) {
    if (ua.includes(app)) return 'upi_app';
  }
  return 'browser';
}
```

---

## API Flow: Government Document Fetching

### Aadhaar (UIDAI)
1. User enters Aadhaar number + requests OTP
2. OTP sent to Aadhaar-registered mobile via UIDAI
3. User enters OTP
4. Backend calls UIDAI e-KYC API (via authorized ASP/KUA partner)
5. Receives: Name, Address, DOB, Gender, Photo
6. Stores as Document with `isGovernmentFetched: true`

### PAN (NSDL)
1. User enters PAN number + DOB
2. Backend calls NSDL e-PAN verification API
3. Receives: Name, Father's Name, Status
4. Stores as verified Document

### Driving License (Parivahan)
1. User enters DL number + DOB
2. Backend calls Ministry of Road Transport API
3. Receives: Name, Validity, Vehicle Class
4. Stores as verified Document

### Production API Partners
You MUST use authorized government API aggregators:
- **AuthBridge** (authbridge.com)
- **HyperVerge** (hyperverge.co)
- **IDfy** (idfy.com)
- **Signzy** (signzy.com)

---

## Secure Document Download Flow

```
Scanner                                  Owner's Phone
   │                                          │
   ├── GET /api/public/documents/:qrCode ────►│
   │◄── List of available documents ───────────┤
   │                                          │
   ├── POST /documents/:id/download/request ──►│
   │   { method: 'otp' }                       │
   │◄── { requiresAuth: true, method: 'otp' } ─┤
   │                                          │
   │                                          ├── SMS OTP sent ───►
   │                                          │◄── User receives OTP
   ├── POST /documents/:id/download/verify ──►│
   │   { method: 'otp', otp: '123456' }       │
   │◄── { fileUrl: '...', title: '...' } ─────┤
   │                                          │
   ├── GET fileUrl (from Cloudinary) ◄───────┤
```

**Alternative: PIN Method**
- Scanner asks owner for their 4-digit Document PIN
- Enters PIN in verification request
- If PIN matches bcrypt hash → document is served

---

## Core Backend Logic

### QR Routing Controller
```js
// controllers/qrController.js
export const handleScan = catchAsync(async (req, res) => {
  const scannerType = detectScannerType(req.headers['user-agent']);
  const user = await User.findOne({ qrCode: req.params.qrCode });

  // Log the scan
  await ScanLog.create({ user: user._id, type: scannerType === 'upi_app' ? 'payment' : 'profile_view' });

  if (scannerType === 'upi_app') {
    return res.json({ type: 'upi_payment', upiId: user.upiId, upiDeepLink: user.upiDeepLink });
  }

  return res.json({ type: 'public_profile', profile: { name, avatar, ... } });
});
```

### Secure Document Download
```js
// controllers/documentController.js
export const verifyAndDownload = catchAsync(async (req, res) => {
  const { method, pin, otp } = req.body;
  const doc = await Document.findById(req.params.docId).populate('user');

  let verified = false;
  if (method === 'pin') {
    verified = await doc.user.comparePin(pin);
  } else if (method === 'otp') {
    const otpRecord = await Otp.findOne({ user: doc.user._id, code: otp, isUsed: false, expiresAt: { $gt: new Date() } });
    verified = otpRecord ? (otpRecord.isUsed = true, await otpRecord.save(), true) : false;
  }

  if (!verified) throw new AppError('Authentication failed', 401);

  await Document.findByIdAndUpdate(doc._id, { $inc: { downloadCount: 1 } });
  res.json({ fileUrl: doc.fileUrl });
});
```

---

## Project Structure

```
oneqr/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB connection
│   │   │   └── cloudinary.js      # Cloudinary config
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, login, profile
│   │   │   ├── qrController.js    # QR scan routing (CORE)
│   │   │   ├── documentController.js  # Upload, secure download (CORE)
│   │   │   ├── scanController.js  # Analytics
│   │   │   ├── orderController.js   # E-commerce orders
│   │   │   └── publicController.js  # Public profile data
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protect
│   │   │   ├── multer.js          # File upload config
│   │   │   └── rateLimiter.js     # Rate limiting
│   │   ├── models/
│   │   │   ├── User.js            # User schema with QR, UPI, PIN
│   │   │   ├── Document.js        # Document schema
│   │   │   ├── ScanLog.js         # Scan analytics
│   │   │   ├── Order.js           # E-commerce orders
│   │   │   ├── Otp.js             # OTP verification
│   │   │   └── ExpiryLink.js      # Self-destruct links
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── qrRoutes.js
│   │   │   ├── documentRoutes.js
│   │   │   ├── scanRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   └── publicRoutes.js
│   │   ├── services/
│   │   │   ├── smsService.js      # Twilio SMS/OTP
│   │   │   └── governmentApiService.js  # Gov API integrations
│   │   ├── utils/
│   │   │   ├── AppError.js        # Custom error class
│   │   │   ├── catchAsync.js      # Async wrapper
│   │   │   └── generateQR.js      # QR code generation
│   │   └── server.js              # Express app entry
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── login/page.tsx       # Login
│   │   │   ├── register/page.tsx    # Registration
│   │   │   ├── dashboard/page.tsx   # User dashboard
│   │   │   ├── dashboard/analytics/page.tsx
│   │   │   ├── dashboard/orders/page.tsx
│   │   │   ├── dashboard/gov-fetch/page.tsx
│   │   │   ├── upload/page.tsx      # Document upload
│   │   │   └── scan/[qrCode]/page.tsx  # Public profile (CORE)
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios instance
│   │   │   └── utils.ts             # Helper functions
│   │   └── store/
│   │       └── authStore.ts         # Zustand auth state
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
│
└── README.md
```

---

## Setup Instructions

### 1. Clone & Install
```bash
cd oneqr/backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables
```bash
cp backend/.env.example backend/.env
```
Fill in:
- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_*`
- `TWILIO_*`

### 3. Run Development
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 4. Build for Production
```bash
cd backend && npm start
cd frontend && npm run build && npm start
```

---

## Security Measures

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt (12 rounds) |
| Document PIN | bcrypt hashed 4-digit PIN |
| JWT | HS256 with expiry |
| OTP | 6-digit, 10-min expiry, max 3 attempts |
| Rate Limiting | express-rate-limit on all sensitive endpoints |
| File Upload | Multer with 10MB limit, type whitelist |
| Expiry Links | Crypto-random token, 10-min TTL, single-use |
| UPI Detection | User-Agent analysis, no server-side spoofing |
| Document Access | PIN OR OTP required for sensitive docs |

---

## E-Commerce: PVC QR Card

- **Price:** ₹50 per card
- **Products:** PVC Card, Keychain (₹10), Premium Sticker (₹30)
- **Shipping:** Free delivery
- **Payment:** UPI / Card / COD
- **Tracking:** Admin updates tracking ID + carrier

---

## Multi-Profile Support

Users can toggle between:
- **Personal Profile:** Name, photo, personal docs, emergency info
- **Business Profile:** Business name, GST, business address

When someone scans the QR, they see the currently active profile.

---

## License

MIT License - Built for India.
