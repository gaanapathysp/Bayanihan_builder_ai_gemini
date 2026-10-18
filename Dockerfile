# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /frontend

COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + built frontend ──────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

# Copy only the built dist from stage 1 (no node_modules in final image)
COPY --from=frontend-builder /frontend/dist ./frontend/dist

ENV GOOGLE_GENAI_USE_VERTEXAI=FALSE
ENV FRONTEND_DIST=/app/frontend/dist
ENV PORT=8080

CMD exec uvicorn app.api.main:app --host 0.0.0.0 --port $PORT --workers 2
