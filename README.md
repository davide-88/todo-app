# Todo App

A full-stack todo application built with React, Fastify, Drizzle ORM, and PostgreSQL in a pnpm monorepo.

## Packages

| Package | Description |
|---------|-------------|
| `packages/shared` | Shared TypeBox schemas, constants, and state machine |
| `packages/backend` | Fastify REST API with Drizzle ORM |
| `packages/frontend` | React + Vite + shadcn/ui frontend |

## Prerequisites

- [Node.js](https://nodejs.org/) v24.x LTS
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Copy env file and configure
cp .env.example .env

# 4. Start all services in dev mode
pnpm dev
```

All services should be healthy within 120 seconds of running step 2.

## Available Scripts

Run from the **repo root** unless noted:

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all packages in dev mode (parallel) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript type-check all packages (strict mode) |
| `pnpm lint` | ESLint across all packages (0 warnings allowed) |
| `pnpm format` | Prettier format all packages |
| `pnpm format:check` | Prettier check (CI-friendly, no writes) |
| `pnpm test` | Run all unit tests |
| `pnpm test:coverage` | Run all unit tests with coverage enforcement |
| `pnpm test:integration` | Run integration tests (starts Postgres via Docker) |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm test:bundle-size` | Validate frontend bundle < 150KB gzipped |
| `pnpm test:api-latency` | Validate API p95 latency thresholds |
| `pnpm test:lighthouse` | Validate CLS <= 0.01 via Playwright |

### Per-package scripts

```bash
# Run tests for just the shared package
pnpm --filter @todo-app/shared test

# Type-check just the backend
pnpm --filter @todo-app/backend typecheck

# Run backend integration tests
pnpm --filter @todo-app/backend test:integration
```

## CI/CD Pipeline

GitHub Actions runs on every push to `main` and on pull requests:

```
lint → type-check → unit-tests (with coverage) → integration-tests (Postgres service container)
```

Each stage depends on the previous — fail-fast. The final `performance` job validates bundle size, CLS, and API latency thresholds. See `.github/workflows/ci.yml` for details.

### Performance Thresholds

| Metric | Threshold | Script |
|--------|-----------|--------|
| Bundle size (gzipped JS+CSS) | < 150KB | `pnpm test:bundle-size` |
| API p95 latency (CRUD) | < 500ms | `pnpm test:api-latency` |
| API p95 latency (pagination) | < 300ms | `pnpm test:api-latency` |
| Cumulative Layout Shift (CLS) | <= 0.01 | `pnpm test:lighthouse` |

### Coverage Thresholds

| Package | Branches | Functions | Lines | Statements |
|---------|----------|-----------|-------|------------|
| shared | 100% | 100% | 90% | 90% |
| backend | 90% | 90% | 90% | 90% |
| frontend | 90% | 90% | 90% | 90% |

## Environment Variables

See `.env.example` for all required variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://todoapp:todoapp@localhost:5432/todoapp` | Postgres connection string |
| `PORT` | `3000` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `RATE_LIMIT_MAX` | `100` | Max requests per minute |
| `VITE_API_BASE_URL` | `http://localhost:3000` | API base URL for frontend |

## Project Structure

```
todo-app/
├── .github/workflows/    # CI/CD pipeline
├── packages/
│   ├── shared/src/       # TypeBox schemas, constants, todo state machine
│   ├── backend/src/      # Fastify routes, Drizzle schema, migrations
│   └── frontend/src/     # React components, hooks, pages
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── eslint.config.js
```
