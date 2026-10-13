# WholesaleFlow — Production Deployment Guide

This guide details instructions for deploying WholesaleFlow across **Vercel** (Frontend), **Railway** (Backend), **MongoDB Atlas** (Database), and **Cloudinary** (Media).

---

## 1. MongoDB Atlas Configuration
1. Create a free M0 or production cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Security > Database Access**, create a user `wholesale_app_user` with read and write permissions.
3. Under **Security > Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) or Railway IP ranges.
4. Obtain the connection string:
   ```
   mongodb+srv://wholesale_app_user:<password>@cluster0.abcde.mongodb.net/wholesale_catalogue?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment on Railway
1. Push your repository to GitHub.
2. Log into [Railway](https://railway.app/) and select **New Project > Deploy from GitHub repo**.
3. Set **Root Directory** to `/backend`.
4. Railway will automatically detect Node.js. Configure the following **Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `${{PORT}}` (Railway automatically binds this)
   - `MONGODB_URI`: `<Your MongoDB Atlas connection URI>`
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app`
   - `PUBLIC_APP_URL`: `https://your-frontend-app.vercel.app`
   - `API_BASE_URL`: `https://<your-railway-backend-url>/api/v1`
   - `JWT_ACCESS_SECRET`: `<Generate strong 32+ char secret>`
   - `JWT_ACCESS_EXPIRES_IN`: `15m`
   - `JWT_REFRESH_SECRET`: `<Generate strong 32+ char secret>`
   - `JWT_REFRESH_EXPIRES_IN`: `7d`
   - `COOKIE_SECURE`: `true`
   - `COOKIE_SAME_SITE`: `none` (Required for cross-origin cookies between Vercel and Railway)
   - `SUPER_ADMIN_EMAIL`: `cpnihal35@gmail.com`
   - `SUPER_ADMIN_INITIAL_PASSWORD`: `Nihal@1108`
   - `SUPER_ADMIN_BOOTSTRAP_SECRET`: `<Generate strong secret>`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587` (or `465` for direct SSL)
   - `SMTP_SECURE`: `false` (or `true` if port 465)
   - `SMTP_USER`: `cpnihal35@gmail.com`
   - `SMTP_PASS`: `<Google App Password from https://myaccount.google.com/apppasswords>`
   - `EMAIL_FROM`: `Cateloge OTP <cpnihal35@gmail.com>`
   - `CLOUDINARY_CLOUD_NAME`: `<Cloudinary cloud name>`
   - `CLOUDINARY_API_KEY`: `<Cloudinary API key>`
   - `CLOUDINARY_API_SECRET`: `<Cloudinary API secret>`
5. Deploy the backend service.
6. Verify deployment:
   - Platform Health: `https://<your-backend-url>/api/v1/health`
   - Super Admin Diagnostic: `https://<your-backend-url>/api/v1/super-admin/email/diagnostic` (requires Super Admin login)

---

## 3. Super Admin Bootstrap on Railway
After the backend container boots up, execute the one-time Super Admin bootstrap via the Railway CLI or one-off command:
```bash
npm run bootstrap:admin
```
This securely creates the platform super administrator in MongoDB without exposing credentials in public APIs.

---

## 4. Frontend Deployment on Vercel
1. Log into [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import the GitHub repository.
3. In **Project Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://<your-railway-backend-url>/api/v1`
5. Click **Deploy**.
6. The included `frontend/vercel.json` ensures that dynamic client-side routes like `/:shopSlug` and `/superadmin/dashboard` resolve seamlessly without 404 errors on browser refresh.

---

## 5. Domain & Shop Slugs
Once your custom domain is connected (e.g. `yourcatalogue.com`):
- `yourcatalogue.com/` — Platform Landing Page
- `yourcatalogue.com/abc-wholesale` — ABC Wholesale Public Catalogue
- `yourcatalogue.com/xyz-traders` — XYZ Traders Public Catalogue
- `yourcatalogue.com/admin` — Shop Admin Management Portal
- `yourcatalogue.com/superadmin` — Platform Super Administrator HQ
