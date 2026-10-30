# Build the Vite frontend with its same-origin API configuration.
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_BASE_URL=
RUN npm run build

# The API image includes the actual FieldNet checkpoint and Tesseract runtime.
FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TESSERACT_CMD=/usr/bin/tesseract
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 tesseract-ocr tesseract-ocr-eng espeak-ng \
    && ln -s /usr/bin/espeak-ng /usr/local/bin/espeak \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt /app/backend/requirements.txt
# Match the repository's verified local versions and install CPU-only wheels;
# this service has no GPU and should not pull CUDA runtime libraries.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
      torch==2.2.2+cpu torchvision==0.17.2+cpu
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend/ /app/backend/
COPY objectdetection-main/ /app/objectdetection-main/
COPY --from=frontend-build /app/frontend/dist/ /app/frontend/dist/
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
