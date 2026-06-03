# OneQR Database Setup Guide

## Current Status

Your backend server is running on **port 5001** in LIMITED MODE because MongoDB is not connected yet.

## The Problem

Your MongoDB Atlas cluster blocks connections from your current IP address.
- **Your IP Address:** `157.34.31.177`
- **Error:** `Could not connect to any servers in your MongoDB Atlas cluster`

## Fix (Takes 2 Minutes)

### Step 1: Log into MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Log in with your account (ravibhalavi06121998)

### Step 2: Open Network Access
1. Click your cluster name (Cluster0)
2. In the left sidebar, click **"Network Access"**
3. Click the green button **"+ ADD IP ADDRESS"**

### Step 3: Add Your IP
1. Select **"Add Current IP Address"** OR
2. Enter this IP manually: **`157.34.31.177`**
3. Optionally add a comment: "Home/Office PC"
4. Click **"Confirm"**

### Step 4: Wait 1-2 Minutes
Atlas takes a moment to apply the IP whitelist.

### Step 5: Restart the Server
```bash
cd D:\oneqr\backend
node src/server.js
```

You should see:
```
Trying MongoDB Atlas...
MongoDB Atlas Connected: ac-lfipczu-shard-00-00.znymtnk.mongodb.net
OneQR Server running on port 5001
```

## Alternative: Use Local MongoDB

If you prefer local development instead of Atlas:

1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install with default settings
3. Make sure `mongod` is running on port 27017
4. The app will auto-connect to `mongodb://127.0.0.1:27017/oneqr`

## What's Already Fixed

- [x] Server starts without crashing when DB is offline (LIMITED MODE)
- [x] Clear error messages tell you exactly what to do
- [x] Port changed from 5000 to 5001 (5000 was blocked by another process)
- [x] Frontend `.env.local` created with correct API URL
- [x] All backend models, controllers, and routes validated - zero syntax errors
- [x] Frontend builds successfully

## Testing After DB Connection

Once connected, test these endpoints:
```bash
# Health check
curl http://localhost:5001/api/health

# Public stats (DB connected)
curl http://localhost:5001/api/public/stats

# Register a user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","phone":"+919999999999","password":"password123","documentPin":"1234","upiId":"test@upi"}'
```
