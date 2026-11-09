# Deploy OneQR on Render

This repository includes a Render Blueprint at `render.yaml` for two services:

- `oneqr-api`: Express API, rooted at `backend`, health check `/api/health`.
- `oneqr-frontend`: Next.js app, rooted at `frontend`.

## Deploy

1. Push this repository to GitHub.
2. In Render, choose **New + → Blueprint** and select `Deva9294/oneqr`.
3. Review the two services and apply the Blueprint.
4. In the `oneqr-api` service, set the required `MONGO_URI` to the MongoDB Atlas connection string. Add the database user/password in Render only; never commit them.
5. Set `ADMIN_EMAILS` to the comma-separated email address(es) that should have admin access.
6. If document uploads are required in production, configure all three Cloudinary variables. The backend deliberately refuses production uploads without private cloud storage.
7. If OTP delivery is required, configure the Twilio SID, token, and sender number. OTP verification will remain unavailable until a working SMS provider is configured.
8. Wait for both services to finish deploying.

## Verify

- API health: `https://oneqr-api.onrender.com/api/health`
- Expected healthy response includes `"status":"ok"` and `"database":"connected"`.
- Frontend: `https://oneqr-frontend.onrender.com`

If the frontend uses a different Render URL, update the API service's `CLIENT_URL` to that exact origin (no trailing slash). If the API service URL changes, update frontend `NEXT_PUBLIC_API_URL` to `https://<api-host>/api` and redeploy the frontend because Next.js embeds this value during build.

## Important production notes

- Render does not host MongoDB for this Blueprint. Use MongoDB Atlas or another managed MongoDB provider and allow Render outbound access in the Atlas network rules (for initial testing, Atlas may allow `0.0.0.0/0`; secure this with database credentials and least privilege).
- Free Render web services may sleep after inactivity and take time to wake.
- Configure Cloudinary for persistent private document storage. The local filesystem on a hosted service must not be treated as durable storage.
- Government document retrieval is not live merely by deploying. It requires approved provider credentials, authorization, and compliant API contracts.
- UPI QR intent is not payment confirmation. Use a verified payment gateway/webhook before marking any transaction paid.
- Never put MongoDB credentials, JWT secrets, SMS tokens, or Cloudinary secrets in source control or frontend variables.
