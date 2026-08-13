# Deploy: Vercel (frontend) + Render (backend)

Split hosting layout:

```
https://your-app.vercel.app          → React frontend
https://your-api.onrender.com        → FastAPI backend (/api/*)
```

GoDaddy domain (optional later): point `www` CNAME → Vercel, or use Vercel's custom domain UI.

---

## Prerequisites

- GitHub repo with this project pushed
- [Render](https://render.com) account (free)
- [Vercel](https://vercel.com) account (free)
- Google OAuth Client ID configured (see README / prior chat)
- OpenAI + Serper API keys

---

## Part 1 — Deploy backend on Render

### 1. Push code to GitHub

Ensure `render.yaml` is in the repo root.

### 2. Create Render web service

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates **resume-job-finder-api**
4. Or create manually:
   - **New Web Service** → connect repo
   - **Root Directory:** `backend`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Region:** Singapore (closest free option to India)

### 3. Set environment variables (Render dashboard → Environment)

| Variable | Value |
|----------|--------|
| `OPENAI_API_KEY` | your key |
| `COSTLY_MODEL` | `gpt-4o` |
| `CHEAP_MODEL` | `gpt-4o-mini` |
| `SERPER_API_KEY` | your key |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
| `JWT_SECRET` | long random string |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (update after Vercel deploy) |
| `COOKIE_SECURE` | `true` |
| `JWT_EXPIRE_MINUTES` | `60` (optional) |
| `RESUME_UPLOAD_LIMIT` | `5` (optional; max uploads per user per window) |
| `RESUME_UPLOAD_WINDOW_SECONDS` | `3600` (optional; 1 hour) |

`FRONTEND_URL` must match your Vercel URL **exactly** (no trailing slash).  
If you add a custom domain later, update this and redeploy Render.

### 4. Deploy and copy the URL

After deploy succeeds, copy the service URL, e.g.:

```
https://resume-job-finder-api.onrender.com
```

Test: open `https://YOUR-API.onrender.com/health` → should return `{"status":"ok"}`.

> **Free tier note:** Render sleeps after ~15 minutes idle. First request after sleep may take 30–60 seconds.

---

## Part 2 — Deploy frontend on Vercel

### 1. Import project

1. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. **Root Directory:** `frontend` (click Edit → set to `frontend`)
3. **Framework Preset:** Vite (auto-detected)
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`

### 2. Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|----------|--------|
| `VITE_GOOGLE_CLIENT_ID` | same Client ID as backend |
| `VITE_API_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |

Apply to **Production**, **Preview**, and **Development** if you use Vercel dev.

No extra Vercel env vars are needed for resume upload rate limiting — that lives on the backend.

### 3. Deploy

Click **Deploy**. Copy your URL, e.g.:

```
https://resume-job-finder.vercel.app
```

### 4. Update Render `FRONTEND_URL`

Go back to Render → Environment → set:

```
FRONTEND_URL=https://resume-job-finder.vercel.app
```

Save → Render redeploys automatically.

---

## Part 3 — Google Cloud Console

1. **APIs & Services** → **Credentials** → your OAuth client
2. **Authorized JavaScript origins** — add:
   ```
   https://your-app.vercel.app
   ```
   Keep `http://localhost:5173` for local dev.
3. If using a custom domain on Vercel, add that too.

No redirect URI needed for the Google Sign-In button.

---

## Part 4 — GoDaddy custom domain (optional)

### Point domain to Vercel

1. Vercel project → **Settings** → **Domains** → add `yourdomain.com`
2. Vercel shows DNS records (usually CNAME or A)
3. GoDaddy → **DNS** → add those records
4. Vercel provisions SSL automatically
5. Update:
   - Google Console origins → `https://yourdomain.com`
   - Render `FRONTEND_URL` → `https://yourdomain.com`
   - Redeploy Render

Backend stays on `*.onrender.com` — no GoDaddy change needed for the API.

---

## Part 5 — Verify end-to-end

- [ ] `https://YOUR-API.onrender.com/health` returns OK
- [ ] Vercel site loads login page
- [ ] Google Sign-In works
- [ ] Resume upload runs (may be slow if Render was sleeping)
- [ ] No CORS errors in browser DevTools → Console

---

## Local development (unchanged)

Root `.env` + `frontend/.env` with Client ID only (no `VITE_API_URL`).

```powershell
# Terminal 1
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

Empty `VITE_API_URL` → requests go to `/api` via Vite proxy.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error after login | `FRONTEND_URL` on Render must exactly match Vercel URL |
| Sign-in works, analyze 401 | `COOKIE_SECURE=true` on Render; check cookies in DevTools → Application |
| Google "origin not allowed" | Add Vercel URL to Authorized JavaScript origins |
| Very slow first request | Render free tier cold start — wait or upgrade |
| Build fails on Render | Confirm **Root Directory** is `backend` |

---

## Cost

| Service | Cost |
|---------|------|
| Render (free web service) | $0 (sleeps when idle) |
| Vercel (hobby) | $0 |
| OpenAI + Serper | Pay per use |
| GoDaddy domain | Already paid |
