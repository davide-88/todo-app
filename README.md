# Todo App

A full-stack todo application built with React, Fastify, Drizzle ORM, and PostgreSQL in a pnpm monorepo.

## Packages

| Package | Description |
|---------|-------------|
| `packages/shared` | Shared TypeBox schemas, constants, and state machine |
| `packages/backend` | Fastify REST API with Drizzle ORM |
| `packages/frontend` | React + Vite + shadcn/ui frontend |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Setup

```bash
# 1. Start the database
docker compose up -d postgres

# 2. Install dependencies and link workspaces
pnpm install

# 3. Copy env file and configure
cp .env.example .env
```

## Available Scripts

Run from the **repo root** unless noted:

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all packages in dev mode (parallel) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript type-check all packages |
| `pnpm lint` | ESLint across all packages (0 warnings allowed) |
| `pnpm format` | Prettier format all packages |
| `pnpm test` | Run all unit tests |
| `pnpm test:e2e` | Run end-to-end tests (configured in Story 5.2) |

### Per-package scripts

```bash
# Run tests for just the shared package
pnpm --filter @todo-app/shared test

# Type-check just the backend
pnpm --filter @todo-app/backend typecheck
```

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
├── packages/
│   ├── shared/src/     # TypeBox schemas, constants, todo state machine
│   ├── backend/src/    # Fastify routes, Drizzle schema, migrations
│   └── frontend/src/   # React components, hooks, pages
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── eslint.config.js
```
