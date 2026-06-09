# X-VERBA MVP1 — Web Frontend + API

## Quick Start

### 1. Install dependencies
```bash
cd web && npm install
cd ../api && npm install
```

### 2. Start the API backend
```bash
cd api
npm run dev
# Runs on http://localhost:3001
```

### 3. Start the frontend
```bash
cd web
npm run dev
# Runs on http://localhost:5173
# API calls proxy to :3001
```

## Architecture

```
web/          → React + TypeScript + Tailwind (Vite)
api/          → Node.js + Express backend
packages/     → Python CLI scan engine (existing)
```

## Screens

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 1 | Landing | `/` | Repo URL input, GitHub OAuth, recent scans |
| 2 | Scan Progress | `/scanning` | Real-time scan progress animation |
| 3 | Dashboard | `/results/:scanId` | Γ score, findings summary, drift classes |
| 4 | Detailed Findings | `/findings/:scanId` | Per-finding cards with code, issue, recommendation |
| 5 | Export Contract | `/export/:scanId` | Download/copy governance.yaml |
| 6 | Scan History | `/history/:repo` | Γ trend chart, scan history list |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Trigger scan with `{ repo_url }` |
| `GET` | `/api/contract/:scan_id` | Get governance.yaml for a scan |
| `GET` | `/api/scans/:repo` | Get scan history for a repo |
| `GET` | `/api/health` | Health check |

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + TypeScript | Type-safe, fast iteration |
| Styling | Tailwind CSS | No design overhead |
| Bundler | Vite | Fast HMR, optimized builds |
| API | Express + tsx | Hot-reload, wraps Python CLI |
| Database | In-memory (→ Supabase) | Swap when ready |
