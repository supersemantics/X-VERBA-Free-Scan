FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/package*.json ./api/
RUN npm ci --prefix api

COPY web/package*.json ./web/
RUN npm ci --prefix web

RUN python3 -m venv /opt/xverba \
    && /opt/xverba/bin/pip install --no-cache-dir x-verba

ENV PATH="/opt/xverba/bin:${PATH}"
ENV X_VERBA_BIN="/opt/xverba/bin/x-verba"

COPY . .

RUN npm --prefix api run build \
    && npm --prefix web run build

EXPOSE 3001

CMD ["npm", "--prefix", "api", "start"]
