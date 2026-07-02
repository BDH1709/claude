# Onderwijshub - lichtgewicht Node.js image, geschikt voor Raspberry Pi (arm64/armv7).
# Multi-stage build: better-sqlite3 wordt in de builder-fase native gecompileerd
# (met build-essential/python3), zodat het uiteindelijke image slank blijft.

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system onderwijshub && useradd --system --gid onderwijshub --home-dir /app onderwijshub

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

RUN mkdir -p /app/data/backups /app/data/uploads && chown -R onderwijshub:onderwijshub /app

USER onderwijshub
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "src/server.js"]
