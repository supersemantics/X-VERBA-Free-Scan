FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/package*.json ./api/
RUN npm ci --prefix api

COPY web/package*.json ./web/
RUN npm ci --prefix web

# Pinned, so a new engine release never changes live results by itself.
# To upgrade: bump this, test locally, and note it in CHANGELOG.md.
ARG XVERBA_VERSION=0.7.0
RUN python3 -m venv /opt/xverba \
    && /opt/xverba/bin/pip install --no-cache-dir "x-verba==${XVERBA_VERSION}"

ENV PATH="/opt/xverba/bin:${PATH}"
ENV X_VERBA_BIN="/opt/xverba/bin/x-verba"

COPY . .

RUN npm --prefix api run build \
    && npm --prefix web run build

EXPOSE 3001

# Scans clone untrusted repositories, so don't run them as root.
USER node

CMD ["npm", "--prefix", "api", "start"]
