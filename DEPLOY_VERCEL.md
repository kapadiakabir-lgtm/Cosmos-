# Deploying Cosmos to Vercel

Vercel only hosts the **frontend** (Expo web build). The FastAPI backend + MongoDB must live on a separate host (Railway, Render, Fly.io, your own VPS, etc.).

You have two ways to connect the two — pick one.

---

## Option A — Same-origin via `vercel.json` rewrites (recommended)

This is what the included `frontend/vercel.json` is set up for. The browser calls a relative path like `/api/auth/register`, Vercel's edge proxies it to your real backend, so no CORS headaches and no env var needed at build time.

1. Deploy the FastAPI backend somewhere reachable over HTTPS, e.g. `https://cosmos-api.up.railway.app`. It must keep the `/api/*` prefix and connect to your MongoDB Atlas (or other) cluster.
2. Open `frontend/vercel.json` and replace `REPLACE_WITH_YOUR_BACKEND_HOST` with the deployed backend's host. Example:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://cosmos-api.up.railway.app/api/:path*" }
     ]
   }
   ```
3. In the Vercel dashboard, set the project's **Root Directory** to `frontend` and (optionally) leave `EXPO_PUBLIC_BACKEND_URL` **empty**. The app will fall back to same-origin `/api/*` automatically (see `src/api.ts`).
4. Deploy. Open the Vercel URL and the Create Account button now hits your real backend.

---

## Option B — Cross-origin via `EXPO_PUBLIC_BACKEND_URL`

Use this if you don't want a Vercel rewrite (e.g. you already have a custom domain for the API).

1. Deploy the FastAPI backend (CORS already allows `*`).
2. In the Vercel dashboard → Project → **Settings → Environment Variables**, add:
   ```
   EXPO_PUBLIC_BACKEND_URL = https://cosmos-api.up.railway.app
   ```
   (No trailing slash; do **not** include `/api`.)
3. Re-deploy so the build picks up the env var (Expo bakes `EXPO_PUBLIC_*` at build time).
4. Open the Vercel URL — the app will call `https://cosmos-api.up.railway.app/api/auth/register` directly.

---

## Backend configuration on the host of your choice

Whatever PaaS you choose, the backend needs:

- `MONGO_URL` — pointing at MongoDB Atlas or another managed Mongo.
- `DB_NAME` — e.g. `cosmos_prod`.
- `JWT_SECRET` — long random string (don't reuse the dev default).
- `EMERGENT_LLM_KEY` — only required if you want to regenerate the app icon; the running app does not call it.

Expose port `8001` (or whatever your host uses) and make sure the path prefix `/api/*` is preserved.

---

## Native (iOS/Android) builds

Native apps cannot use a relative URL — they always need `EXPO_PUBLIC_BACKEND_URL` set to an absolute HTTPS URL at build time (Option B). When you run `eas build` or Emergent's publish flow, set the env var first.

---

## Local sanity check

```bash
cd frontend
EXPO_PUBLIC_BACKEND_URL=https://cosmos-api.up.railway.app npx expo export -p web
npx serve dist
# open http://localhost:3000 and try "Create account"
```

If the network panel shows the request hitting your backend host with a 200, you're good to deploy.
