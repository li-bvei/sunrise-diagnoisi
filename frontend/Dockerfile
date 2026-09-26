FROM node:22-alpine AS builder

# Same default as vite.base-path.ts: the live site is served under /server/. Set VITE_BASE_PATH=/ for a root deploy.
ARG VITE_BASE_PATH=/server/
ENV VITE_BASE_PATH=$VITE_BASE_PATH

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
