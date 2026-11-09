# OneQR Database Setup

## Configure MongoDB Atlas

1. Create or open your MongoDB Atlas project.
2. Create a database user with a strong, unique password.
3. In Network Access, allow only the outbound IP addresses required by your hosting provider. Avoid permanent `0.0.0.0/0` access unless you understand the risk and have compensating controls.
4. Copy the Atlas connection string and set it as `MONGO_URI` in your hosting provider's environment settings.
5. Replace the username, password, cluster host and database name with your own values.
6. Keep credentials out of source code, screenshots, logs and Git history.

## Local development

Set:

```env
MONGO_URI_LOCAL=mongodb://127.0.0.1:27017/oneqr
JWT_SECRET=use-a-long-random-secret
CLIENT_URL=http://localhost:3000
```

Run backend:

```bash
cd backend
npm install
npm run dev
```

Run frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

## Health checks

- `GET /api/health` reports process and database readiness.
- `GET /api/public/stats` requires a working database.

A successful process start does not mean the database is connected. Production must have a valid `MONGO_URI`.

## Security incident response

If a database password, API key or token was ever committed:
1. Rotate/revoke it immediately in the provider dashboard.
2. Update the hosting environment variable.
3. Remove the secret from all Git history and cached artifacts.
4. Review provider access logs for unexpected activity.

Removing a secret from the latest file does not invalidate the old credential or erase it from Git history.
