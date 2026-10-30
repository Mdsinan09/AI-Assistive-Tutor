# Deployment

## Architecture

Vercel hosts the existing Vite app as a static site. Render hosts FastAPI in Docker, including the FieldNet V3 checkpoint and Linux Tesseract. SQLite uses the container's temporary filesystem; its contents can disappear when Render restarts or replaces the free instance.

Both providers' free offerings are selected. Render Free services can sleep when idle and have a 512 MB memory limit. A local startup of the complete backend with FieldNet loaded peaked near 505 MiB, leaving almost no headroom; inference may exceed the Render limit and restart the service. This is a free-tier deployment attempt, not a guarantee of reliable inference.

## Configuration

- Build: Dockerfile (Node 20 `npm ci` + `npm run build`, Python 3.12 image, CPU-only PyTorch 2.2.2/torchvision 0.17.2 matching the verified local versions).
- Start: `uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}`.
- Health check: `/health`.
- Database: `DATABASE_PATH=/var/data/assistive-tutor.db` on the mounted disk.
- OCR: Debian `tesseract-ocr` and English language data; `TESSERACT_CMD=/usr/bin/tesseract`.
- Frontend API URL: configure `VITE_API_BASE_URL` in Vercel to the Render service URL before building.
- CORS: configure `CORS_ORIGINS` in Render to the actual Vercel production domain.
- Gemini: set `GEMINI_API_KEY` using Render's secret environment-variable UI. The Blueprint does not contain a key value.
- Model: the committed `objectdetection-main/outputs/v3_ft_mask/best_ema.pt` is copied into the image.

## Deploy

1. Push the reviewed deployment changes to `main` in the existing GitHub repository.
2. Import the repository into Vercel, keeping the repository root as the project root; `vercel.json` supplies its frontend build and SPA routing settings.
3. Create the Render Blueprint from the same repository. It uses the free plan with no persistent disk.
4. Set Vercel's `VITE_API_BASE_URL` to `https://ai-assistive-tutor-api.onrender.com` and Render's `CORS_ORIGINS` to the actual Vercel domain, then redeploy both services.
5. Set `GEMINI_API_KEY` in Render's secret environment settings.
6. Both services can auto-deploy from `main` after their GitHub integrations are connected.

The expected Render URL is `https://ai-assistive-tutor-api.onrender.com`; it becomes real only after Render provisions the service. Append `/health` for the health check. Vercel assigns the frontend domain during project setup; use that exact origin in Render's CORS setting.

## Operations

Use Render's Events and Logs pages and Vercel's deployment logs to inspect builds and runtime errors. Update secrets in Render's Environment page and redeploy. Roll back by selecting a prior successful deploy. SQLite data on the free instance is temporary and may be lost on restarts or deploys.

No live service, URL, or end-to-end result is claimed until the Blueprint is authorized, provisioned, and tested against the public URL.
