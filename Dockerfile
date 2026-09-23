# syntax=docker/dockerfile:1
FROM python:3.12-slim@sha256:2f17fc044b579bab302c2e8054d3a686e2cb9a83de48e70534b94cd8ebbe06a9 AS backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_LINK_MODE=copy \
    PATH="/app/backend/.venv/bin:$PATH" ORG_REVIEW_DATA_DIR=/data/analyses
WORKDIR /app
RUN pip install --no-cache-dir uv==0.9.28 \
    && groupadd --gid 10001 kontur \
    && useradd --uid 10001 --gid kontur --no-create-home kontur \
    && mkdir -p /data/analyses && chown -R kontur:kontur /data
COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN uv sync --project backend --locked --no-dev --no-install-project
COPY backend/ ./backend/
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

FROM backend AS backend-tests
USER root
RUN uv sync --project backend --locked --no-install-project
COPY fixtures/ ./fixtures/
USER 10001:10001
CMD ["python", "-m", "pytest", "backend/tests", "-q", "-p", "no:cacheprovider"]

FROM node:22-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# A single slash becomes the empty API prefix; requests stay on the web origin.
ENV VITE_API_BASE_URL=/
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8 AS frontend
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
