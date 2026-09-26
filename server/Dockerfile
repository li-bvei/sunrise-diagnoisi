FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY *.mjs ./

EXPOSE 3001
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "index.mjs"]
