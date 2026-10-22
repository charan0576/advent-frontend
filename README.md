# Advent Tech Studio — Frontend (Vercel)

React + Vite frontend. The API and Remotion renderer are deployed separately as a Docker Web Service on Render.

## Deploy on Vercel

1. Push the **contents of this folder** to the root of a GitHub repository. The repository root must contain `package.json`, `package-lock.json`, `index.html`, `src/`, `public/`, and `vercel.json`.
2. In Vercel choose **Add New → Project** and import the frontend repository.
3. Framework preset: **Vite**. Root Directory: `.` if `package.json` is at the repository root.
4. Build command: `npm run build`; Install command: `npm ci`; Output directory: `dist`. These are also defined in `vercel.json`.
5. Add environment variable `VITE_API_BASE_URL` with the Render API origin, e.g. `https://advent-tech-api.onrender.com` (no trailing slash). Set it for Production and Preview as needed. This variable is public by design; never put secret keys in `VITE_*` variables.
6. Click Deploy. Whenever `VITE_API_BASE_URL` changes, redeploy because Vite reads it at build time.

## Connect to Render

On Render, set `FRONTEND_URL` to your exact Vercel production URL (no trailing slash), then redeploy/restart the backend. `PUBLIC_BASE_URL` on Render must be the actual Render service URL; it is used for MP4 URLs and QR redirects.

## Local development

```bash
npm ci
# create .env.local from .env.example and set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

## Security note

The current backend is a single-workspace demo without real user authentication. Do not expose write/profile/video-generation operations to unrestricted public use until authentication, authorization, rate limiting, and abuse protection are implemented.
