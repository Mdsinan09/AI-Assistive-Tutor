# Cloudflare Deployment & Architecture Guide

This guide covers deploying the **AI Assistive Tutor** to Cloudflare Pages (Frontend) and connecting it securely to the FastAPI Python backend.

---

## 1. Architecture Overview

```
[Visually Impaired User Mobile / PWA]
        │
        ├── HTTPS Frontend (Cloudflare Pages CDN)
        │     - React 18 + Vite SPA
        │     - Web App Manifest + Service Worker (PWA)
        │     - Local speech synthesis & audio capture
        │     - Offline fallback shell
        │
        └── API & ML Inference (FastAPI Backend)
              - FieldNet V3 PyTorch Object Detection
              - Tesseract OCR & Document Dewarping
              - Google Speech Recognition + Gemini Flash Fallback
              - Gemini 3.8 Flash Educational Tutor
              - SQLite Session History & 2D Digital Twin
```

---

## 2. Cloudflare Pages Deployment (Frontend)

### Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Node.js Version**: `18.x` or `20.x` (set `NODE_VERSION=20` in Cloudflare Pages environment variables if prompted).

### Environment Variables on Cloudflare Pages
Add the following in **Settings > Environment variables** in your Cloudflare Pages project:

| Variable Name | Example Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com` or `https://xyz.trycloudflare.com` | Public HTTPS endpoint where the backend is hosted or tunneled. **Do NOT put secrets here.** |

---

## 3. Backend Deployment & Cloudflare Tunnel Setup

Because the backend runs heavy PyTorch ML models (FieldNet V3) and Tesseract OCR, it requires a Python environment with PyTorch and system Tesseract installed (e.g., VPS, AWS EC2, GCP Compute, or a dedicated workstation).

### Option A: Cloudflare Tunnel (Zero-Trust Quick Setup)
A Cloudflare Tunnel securely connects your running backend to a public HTTPS URL without exposing open router ports or requiring static IPs.

1. Install `cloudflared`:
   ```bash
   brew install cloudflared       # macOS
   # or
   sudo apt-get install cloudflared  # Ubuntu/Debian
   ```
2. Start the FastAPI backend:
   ```bash
   python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
   ```
3. Expose the backend via free quick tunnel:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:8000
   ```
4. Copy the generated `https://[tunnel-id].trycloudflare.com` URL.
5. In `backend/.env`, set:
   ```env
   CORS_ORIGINS=https://ai-assistive-tutor.pages.dev,http://localhost:5173
   ```
6. In Cloudflare Pages, set `VITE_API_BASE_URL=https://[tunnel-id].trycloudflare.com`.

---

## 4. Environment Variables Checklist

### Backend (`backend/.env`)
```env
GEMINI_API_KEY=your_google_gemini_api_key
CORS_ORIGINS=https://your-frontend.pages.dev,http://localhost:5173
HOST=0.0.0.0
PORT=8000
```

### Frontend (`frontend/.env`)
```env
# Leave empty for local development (uses Vite proxy)
# In production on Cloudflare Pages:
VITE_API_BASE_URL=https://your-backend-domain.com
```

---

## 5. Security & Browser Permissions Notice

1. **HTTPS is Mandatory**: Modern browsers (especially iOS Safari and Android Chrome) **block camera and microphone access** on non-secure (`http://`) origins (except `localhost`). Both Cloudflare Pages and Cloudflare Tunnel provide valid HTTPS certificates by default.
2. **CORS Restrictions**: Do not use credentialed wildcard CORS (`allow_origins=["*"]` with `allow_credentials=True`), as modern browsers will reject the response. Use explicit origins or tunnel URLs in `CORS_ORIGINS`.

---

## 6. Online vs. Offline Capabilities

| Feature | Online Mode (Connected) | Offline Mode (PWA Shell) |
|---|---|---|
| Interface Navigation | Available (cached) | Available (cached) |
| Settings & Accessibility | Available | Available |
| Voice Capture (Web Speech API) | Available (browser engine) | Available if device has offline speech pack |
| Voice Backend Fallback | Available | Unavailable (requires server) |
| FieldNet V3 Object Detection | Available | Unavailable (model runs on server) |
| OCR Text Scanning | Available | Unavailable (Tesseract runs on server) |
| Gemini Educational Tutor | Available | Unavailable (LLM requires network) |
| Session History | Full Sync | Local cached view |

When offline, the top banner explicitly notifies the user:
`Offline Mode — Cached interface active. Live AI detection, OCR scanning, and tutor questions require network connectivity.`
