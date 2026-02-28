---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-27'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/prd-validation-report.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-27.md'
  - 'docs/draft-prd.md'
workflowType: 'architecture'
project_name: 'todo-app'
user_name: 'dvd'
date: '2026-02-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

42 FRs across 6 domains. The requirement surface is small but deep — CRUD is the skeleton, but the optimistic UI state machine, error differentiation, and cursor pagination add architectural weight beyond a typical CRUD app.

| Domain | FR Count | Architectural Weight |
|---|---|---|
| Task Lifecycle (CRUD + validation) | FR1–FR9 | Low — standard CRUD patterns |
| Display & Organization (filter, sort, paginate) | FR10–FR18 | Medium — cursor pagination + stable mutations |
| Real-Time Feedback (optimistic UI) | FR19–FR23 | High — state machine drives frontend architecture |
| Error Handling & Recovery | FR24–FR30 | High — error type differentiation, per-item recovery |
| Data Persistence & Integrity | FR31–FR36 | Medium — 3-layer validation, UUID idempotency |
| Accessibility & Responsiveness | FR37–FR42 | Low — handled by design system (shadcn) + semantic HTML |

**Non-Functional Requirements:**

| Category | Key Constraints | Architectural Impact |
|---|---|---|
| Performance | <50ms optimistic feedback, <500ms API p95, <150KB bundle, ≥90 Lighthouse, CLS ≤0.01 | Framework choice, bundle strategy, font loading, placeholder rows |
| Security | Schema validation on all inputs, CORS allowlist, rate limiting 60/min/IP burst 20, parameterized queries | API middleware stack, validation layer, DB access patterns |
| Reliability | Consistent error schema (code, message, details), atomic writes, 503 on DB outage within 5s | Error response contract, transaction strategy, health checks |
| Maintainability | ≥90% unit coverage, E2E lifecycle, integration tests against real Postgres, 0 circular deps, strict TS | Test infrastructure, package boundaries, CI pipeline |
| Accessibility | WCAG AA contrast, keyboard navigation, focus management, aria-live, 44px touch targets | Component implementation, design system configuration |

**Scale & Complexity:**

- Primary domain: Full-stack web application (SPA + REST API + Postgres)
- Complexity level: Low (single entity, single user, no integrations, no compliance)
- Estimated architectural components: ~15 (7 custom UI components, 5 shadcn primitives, API layer, data layer, shared package)

### Technical Constraints & Dependencies

- **Monorepo structure:** `frontend`, `backend`, `shared` packages — decided in brainstorming
- **Database:** Postgres — chosen for B-tree indexes, triggers, GIN for future search, referential integrity
- **Backend runtime:** Node.js with Fastify — decided in brainstorming
- **Frontend framework:** React 19 — decided in architecture phase (agent consistency, shadcn/ui maturity, first-class TanStack Query support)
- **Design system:** shadcn/ui (Radix UI primitives) + Tailwind CSS — decided in UX spec, React variant confirmed in architecture
- **Query layer:** TanStack Query for server state management — decided in brainstorming
- **Containerization:** Docker Compose for local development stack
- **TypeScript:** Strict mode across all packages, shared interfaces as the integration contract
- **No client-side routing library** — single-screen app, `history.replaceState` for query param only

### Cross-Cutting Concerns Identified

1. **Shared validation & constants** — `maxTextLength`, `pageSize`, validation schemas must be single-sourced in the `shared` package and consumed by frontend, API, and DB constraint layers
2. **Per-todo state machine** — state transitions (confirmed ↔ syncing → error) must be consistent between frontend state management, API response handling, and test assertions
3. **Idempotency contract** — client-generated UUIDs, server-side upsert, `Retry-After` on rate limit — spans frontend (UUID generation), API (upsert logic), and DB (unique constraint)
4. **Error response contract** — consistent `{code, message, details?}` schema with correct HTTP status classes — consumed by frontend error type differentiation and tested via contract tests
5. **Cursor pagination contract** — cursor token format, page size, sort direction — shared between API response shape and frontend query key strategy

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (SPA + REST API) in a TypeScript monorepo. No single full-stack starter matches this architecture — the project composes three independent packages (frontend, backend, shared) under pnpm workspaces.

### Framework Decision

**React 19** selected over Svelte for:
- shadcn/ui is the canonical, most mature variant (Radix UI primitives)
- TanStack Query React (`@tanstack/react-query`) is first-class
- Highest AI agent implementation consistency due to training corpus size
- <150KB bundle budget is achievable with Vite tree-shaking and a small component surface (~5 shadcn primitives)

### Starter Options Considered

| Option | Fit | Verdict |
|---|---|---|
| **create-t3-app** (Next.js + tRPC + Prisma + Tailwind) | Poor — SSR-first, tRPC not REST, Prisma not raw Postgres, single-app structure | Rejected |
| **Turborepo starter** (`npx create-turbo@latest`) | Moderate — adds build caching/task orchestration | Rejected — overkill for 3 packages, solo dev |
| **Vite React TS + pnpm workspaces** (composed) | Strong — lightweight monorepo, Vite for frontend, manual backend/shared | Selected |
| **Nx monorepo** | Poor — enterprise-weight tooling for a low-complexity project | Rejected |

### Selected Starter: Composed pnpm Monorepo

**Rationale:** No off-the-shelf starter matches SPA + Fastify API + shared package in a monorepo. pnpm workspaces provide native monorepo support with zero additional tooling. Each package gets the right setup for its role.

**Initialization Commands:**

```bash
# Root monorepo
mkdir todo-app && cd todo-app
pnpm init

# Frontend (Vite + React 19 + TypeScript)
npm create vite@latest packages/frontend -- --template react-ts

# shadcn/ui (run inside packages/frontend)
npx shadcn@latest init

# Backend (Fastify v5 + TypeScript — manual setup)
mkdir -p packages/backend && cd packages/backend && pnpm init

# Shared (pure TypeScript package — manual setup)
mkdir -p packages/shared && cd packages/shared && pnpm init
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript strict mode across all packages
- Node.js 24.x LTS (v24.14.0 current — Active LTS "Krypton", supported until April 2028)
- React 19.x (v19.2.4 current)
- Shared `tsconfig.base.json` extended by each package

**Styling Solution:**
- Tailwind CSS (installed via shadcn init)
- CSS variables for theming (shadcn default)
- `cn()` utility for conditional classes (installed via shadcn init)

**Build Tooling:**
- Vite (frontend) — ES module dev server, Rollup production builds
- `tsc` (backend, shared) — TypeScript compiler for non-bundled packages
- pnpm workspaces — `workspace:*` protocol for cross-package references

**Testing Framework:**
- Vitest v4.x — unified test runner across all packages (Vite-native, Jest-compatible API)
- `@testing-library/react` for component tests
- Playwright for E2E tests

**Code Organization:**
- `packages/frontend` — Vite React 19 SPA
- `packages/backend` — Fastify v5 REST API
- `packages/shared` — TypeScript interfaces, constants, validation schemas
- Root `pnpm-workspace.yaml` binds all packages

**Development Experience:**
- Vite HMR + React Fast Refresh (frontend)
- `tsx` for backend dev server with watch mode
- pnpm `--filter` for package-scoped commands
- Docker Compose for Postgres + full stack local dev

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- ORM: Drizzle ORM — schema definition, migrations, query layer
- Validation: TypeBox — shared schemas for Fastify routes + TypeScript types
- State management: TanStack Query + React local state
- Error response contract: `{code, message, details?}` across all endpoints

**Important Decisions (Shape Architecture):**
- API documentation: OpenAPI via @fastify/swagger + TypeBox schemas
- Security middleware stack: CORS, rate-limit, helmet
- CI/CD: GitHub Actions pipeline
- Logging: Pino (Fastify default)

**Deferred Decisions (Post-MVP):**
- Authentication method (v2+)
- Deployment platform beyond Docker Compose (v2+)
- WebSocket / real-time sync (v2+)
- Caching strategy (not needed for single-user v1)

### Data Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| ORM | Drizzle ORM | v0.45.1 | Lightweight (~7.4KB), TypeScript-first, SQL-like API, built-in migration support via Drizzle Kit. Avoids raw `pg` boilerplate while staying close to SQL. Schema changes produce versioned SQL migrations. |
| Migration tool | Drizzle Kit | (bundled) | Generates SQL migrations from schema diff, applies programmatically. Single `todos` table makes manual migrations viable, but Drizzle Kit provides safety for future schema changes. |
| Connection pooling | Drizzle + `pg` Pool | — | Default pool settings (max 10 connections). Single-user app doesn't need tuning. |
| DB driver | `pg` (node-postgres) | — | Drizzle's Postgres adapter uses `pg` underneath. Parameterized queries by default — satisfies injection prevention NFR. |

**Schema definition (Drizzle):**

The Drizzle `pgTable` schema lives in `packages/backend`. TypeScript types are defined independently in `packages/shared` via TypeBox schemas. The Drizzle schema uses `satisfies` to enforce compile-time conformance with shared types. Drizzle-inferred types never leak into `shared`.

- `id` — UUID, primary key, client-generated
- `text` — VARCHAR with max length constraint (from shared constant)
- `completed` — BOOLEAN, default false
- `createdAt` — TIMESTAMP WITH TIME ZONE, default now()
- `updatedAt` — TIMESTAMP WITH TIME ZONE, auto-updated via Postgres trigger

**Upsert strategy:** Drizzle's `onConflictDoUpdate` on `id` — implements idempotent writes for client UUID retry.

**Postgres `updatedAt` trigger:** Drizzle Kit does not auto-generate triggers. The initial migration must include raw SQL:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

This is added as a custom SQL statement in the first Drizzle Kit migration via `drizzle-kit generate` + manual append.

**Package dependency direction (no circular deps):**

```
shared (source of truth: types, TypeBox schemas, constants, state machine)
  ↑               ↑
  │               │
frontend        backend (Drizzle schema conforms to shared types via satisfies)
```

`shared` has zero dependencies on `frontend` or `backend`. Both consumer packages depend on `shared` unidirectionally.

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Authentication | None (v1) | Single-user, no accounts. Architecture doesn't preclude adding auth middleware later. |
| CORS | `@fastify/cors` | Allowlist frontend origin only. Rejects preflight and simple requests from non-allowlisted origins. |
| Rate limiting | `@fastify/rate-limit` | In-memory store, 60 req/min per IP, burst 20. Sufficient for single-instance. Returns `429` with `Retry-After` header. |
| Security headers | `@fastify/helmet` | Standard security headers (X-Content-Type-Options, X-Frame-Options, etc.) with sensible defaults. |
| Input validation | TypeBox schemas on all routes | Fastify v5 enforces JSON Schema validation on `body`, `querystring`, `params`. TypeBox generates these schemas with TypeScript type inference. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| API style | REST | Decided in brainstorming. Single resource (`/api/todos`), CRUD operations, query params for filter/sort/pagination. |
| Base path | `/api` | All endpoints prefixed. Separates API from potential static file serving. |
| Documentation | `@fastify/swagger` + `@fastify/swagger-ui` | Auto-generates OpenAPI spec from TypeBox route schemas. Zero additional authoring — documentation is a byproduct of validation schemas. |
| Versioning | None (v1) | Single consumer (our frontend). No version prefix needed. |
| Error schema | `{ code: string, message: string, details?: unknown }` | Consistent across all 4xx/5xx responses. `code` is machine-readable (e.g., `VALIDATION_ERROR`, `NOT_FOUND`). `message` is human-readable. `details` carries field-level validation errors when applicable. |
| Health check | `GET /api/health` | Returns `{ status: "ok" }` or `{ status: "error", message: "..." }` with DB connectivity check. Used by Docker healthcheck. |

**Endpoint design:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/todos` | Create (upsert via client UUID) |
| `GET` | `/api/todos` | List (filter, sort, paginate via query params) |
| `PATCH` | `/api/todos/:id` | Update (toggle completed) |
| `DELETE` | `/api/todos/:id` | Delete |
| `GET` | `/api/health` | Health check |

**Query parameters for GET /api/todos:**
- `status` — `active` \| `completed` (filter)
- `sort` — `createdAt` (default, only option in v1)
- `order` — `desc` (default) \| `asc`
- `cursor` — base64-encoded `createdAt` ISO string of the last item in the previous page. Server decodes and uses as `WHERE created_at < cursor` (desc) or `WHERE created_at > cursor` (asc). `null` or absent on first page request.
- `limit` — page size (default from shared constant)

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Server state | TanStack Query v5 (`@tanstack/react-query` v5.74.x) | Handles caching, optimistic mutations, background refetch, pagination. First-class React support. |
| Local UI state | React `useState` / `useReducer` | Input field value, validation errors, sort toggle. No global state library needed — all local state is component-scoped. |
| Todo state machine | Pure function in `shared` package | `(currentState, event) => newState` — consumed by custom React hooks. Tested independently. Not a state management library. |
| Form validation | Inline in InputArea component | Single input field — shared `maxTextLength` constant for validation. No form library needed. |
| HTTP client | Native `fetch` (wrapped) | Lightweight `apiFetch` utility that handles base URL (from `import.meta.env.VITE_API_BASE_URL`), JSON parsing, error response normalization. No axios needed. |
| UUID generation | `crypto.randomUUID()` | Native in all modern browsers + Node 24. Zero-dependency. No `uuid` library needed. |
| Bundle optimization | Vite defaults + tree-shaking | Code splitting via dynamic imports if needed. `font-display: swap` for Roboto. Target: <150KB gzipped. |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Deployment target | Docker Compose (v1) | Local dev and demo. Multi-container: frontend (nginx or Vite preview), backend (Node), Postgres. Container-ready for Railway/Fly.io future migration. |
| CI/CD | GitHub Actions | Lint → type-check → unit tests → integration tests (Postgres service container) → E2E (Playwright). Runs on push/PR. |
| Environment variables | `dotenv` (local dev), `process.env` (runtime) | Backend env: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `RATE_LIMIT_MAX`. Frontend env: `VITE_API_BASE_URL` (Vite requires `VITE_` prefix for client-exposed vars, consumed via `import.meta.env`). Shared constants (not env-dependent) in `shared` package. |
| Logging | Pino (Fastify built-in) | Structured JSON logging. No additional setup — Fastify ships with Pino. Log level configurable via env. |
| Health check | `GET /api/health` + Docker HEALTHCHECK | Postgres connectivity check. Container restarts on health failure. |

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold (pnpm workspaces, tsconfig, Docker Compose)
2. Shared package (TypeBox schemas, constants, todo state machine)
3. Backend (Fastify + Drizzle schema + migrations + CRUD routes)
4. Frontend (Vite React + shadcn/ui + TanStack Query + components)
5. Integration (connect frontend to backend, E2E tests)
6. CI/CD (GitHub Actions pipeline)

**Cross-Component Dependencies:**
- TypeBox schemas in `shared` → consumed by Fastify route validation (backend) AND TypeScript types (frontend)
- Todo state machine in `shared` → consumed by React hooks (frontend) AND test assertions (all packages)
- Drizzle schema in `backend` → conforms to shared types via `satisfies`, types stay internal to backend
- Error response contract → defined as TypeBox schema in `shared`, enforced by Fastify error handler, consumed by frontend error type differentiation

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (snake_case everywhere):**

| Element | Convention | Example |
|---|---|---|
| Tables | lowercase plural | `todos` |
| Columns | snake_case | `created_at`, `updated_at` |
| Indexes | `idx_{table}_{columns}` | `idx_todos_created_at` |
| Constraints | `{table}_{type}_{columns}` | `todos_pkey_id`, `todos_chk_text_length` |

**API (camelCase JSON, plural REST nouns):**

| Element | Convention | Example |
|---|---|---|
| Endpoints | plural nouns | `/api/todos` |
| Route params | camelCase | `:id` |
| Query params | camelCase | `?status=active&order=desc` |
| JSON fields | camelCase | `{ createdAt, updatedAt }` |
| Error codes | UPPER_SNAKE_CASE | `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED` |

Note: Drizzle handles the snake_case (DB) ↔ camelCase (JS) mapping automatically.

**Code (TypeScript/React):**

| Element | Convention | Example |
|---|---|---|
| Files (components) | kebab-case | `todo-row.tsx`, `input-area.tsx` |
| Files (non-components) | kebab-case | `use-todos.ts`, `api-fetch.ts`, `todo-schemas.ts` |
| React components | PascalCase | `TodoRow`, `InputArea` |
| Functions/variables | camelCase | `useTodos`, `handleDelete`, `maxTextLength` |
| Types/interfaces | PascalCase | `Todo`, `TodoState`, `ApiError` |
| Constants | camelCase (not UPPER_SNAKE) | `maxTextLength`, `pageSize` |
| Enums/union literals | PascalCase type, camelCase values | `type TodoStatus = 'active' \| 'completed'` |

Why kebab-case files: Matches shadcn/ui convention. All shadcn components are kebab-case. Consistency across the frontend package.

### Structure Patterns

**Test location: Co-located**

Tests live next to the code they test, same directory, `.test.ts` / `.test.tsx` suffix.

```
packages/shared/src/
  todo-schemas.ts
  todo-schemas.test.ts
  todo-state-machine.ts
  todo-state-machine.test.ts

packages/backend/src/routes/
  todos.ts
  todos.test.ts

packages/frontend/src/components/
  todo-row.tsx
  todo-row.test.tsx
```

Exception: E2E tests in a top-level `e2e/` directory at the monorepo root (Playwright convention).

**Exports: Named only, no default exports**

Every module uses named exports exclusively. Default exports create naming inconsistency across consumers.

```typescript
// Good
export function useTodos() { ... }
export const TodoRow = () => { ... }

// Bad
export default function useTodos() { ... }
```

**Imports: Path aliases per package**

Each package defines its own `@/` alias pointing to its `src/` directory:

```typescript
// In packages/frontend
import { TodoRow } from '@/components/todo-row';

// Cross-package imports use the package name
import { type Todo, maxTextLength } from '@todo-app/shared';
```

**React component pattern:**

```typescript
interface TodoRowProps {
  todo: Todo;
  state: TodoState;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
}

export const TodoRow = ({ todo, state, onToggle, onDelete, onRetry }: TodoRowProps) => {
  // ...
};
```

- Props interface named `{ComponentName}Props`
- Arrow function components (not function declarations)
- Destructured props in signature
- No `React.FC` — explicit return type is unnecessary

**Backend route organization: Feature-based files**

```
packages/backend/src/
  routes/
    todos.ts
    health.ts
  plugins/
    db.ts
    cors.ts
    rate-limit.ts
  schema/
    todos-table.ts
  lib/
    error-handler.ts
```

One route file per resource. Fastify plugins for cross-cutting middleware.

### Format Patterns

**API response shapes:**

```typescript
// List response (GET /api/todos)
{ data: Todo[], cursor: string | null }

// Single item responses (POST, PATCH)
Todo

// Delete response
// 204 No Content — empty body

// Error response (all 4xx/5xx)
{ code: string, message: string, details?: unknown }
```

**Date format:** ISO 8601 strings in all JSON responses (`2026-02-27T14:30:00.000Z`). Postgres `TIMESTAMPTZ` → JS `Date` → `.toISOString()` in JSON serialization.

**Null handling:** Explicit `null` in JSON for absent optional fields. Never `undefined` in API responses (JSON doesn't support it). Cursor is `null` when no more pages.

### Communication Patterns

**State management — TanStack Query conventions:**

| Pattern | Convention |
|---|---|
| Query keys | Array format: `['todos', { status, order, cursor }]` |
| Mutation keys | `['createTodo']`, `['toggleTodo']`, `['deleteTodo']` |
| Optimistic updates | Via `onMutate` callback — update cache, return rollback context |
| Error rollback | Via `onError` callback — restore previous cache from `onMutate` context |
| Cache invalidation | `queryClient.invalidateQueries({ queryKey: ['todos'] })` on mutation success |

**Custom hooks — one hook per concern:**

| Hook | Responsibility |
|---|---|
| `useTodos` | `useInfiniteQuery` — paginated todo list with `fetchNextPage`/`hasNextPage`, handles cursor, filter, sort |
| `useCreateTodo` | Mutation + optimistic insert + error/rollback |
| `useToggleTodo` | Mutation + optimistic toggle + rollback |
| `useDeleteTodo` | Mutation + optimistic remove + rollback |

### Process Patterns

**Error handling chain:**

```
Frontend validation (InputArea) → blocks submission
     ↓ (passes)
Optimistic insert → immediate UI update
     ↓
API request → Fastify TypeBox schema validation → 400 if invalid
     ↓ (passes)
Drizzle query → DB constraint violation → 400 if invalid
     ↓ (passes)
Success → 200/201 with full Todo object
     ↓ (or failure)
Error → Fastify error handler normalizes to { code, message, details? }
     ↓
Frontend receives error → classifies as transient (5xx/network) or permanent (4xx)
     ↓
State machine transition → error state with appropriate recovery actions
```

**Error classification in frontend:**

```typescript
// Transient: retry makes sense
status >= 500 || status === 429 || network error || timeout

// Permanent: retry would fail again
status === 400 || status === 404 || status === 422
```

**Loading state conventions:**

| State | TanStack Query property | UI behavior |
|---|---|---|
| Initial page load | `isLoading` (first fetch) | Placeholder rows |
| Refetch in background | `isFetching && !isLoading` | No visible change (silent) |
| Load more | `isFetchingNextPage` | "Load more" button disabled + text change |
| Mutation in flight | Per-todo `syncing` state (local) | Blue dot, row disabled |

### Enforcement Guidelines

**All AI agents MUST:**
1. Use kebab-case for all file names, PascalCase for component names
2. Use named exports exclusively — zero default exports
3. Co-locate tests with source files using `.test.ts`/`.test.tsx` suffix
4. Return `{ code, message, details? }` for all API errors — no exceptions
5. Use TypeBox schemas from `shared` for all route validation — no inline JSON Schema
6. Use `@/` path alias for intra-package imports, `@todo-app/shared` for cross-package
7. Follow the unidirectional dependency flow: `shared` ← `backend`, `shared` ← `frontend`

**Anti-patterns to reject:**
- `export default` anywhere
- Inline validation logic that duplicates shared schemas
- Direct `fetch()` calls without the `apiFetch` wrapper
- Raw SQL queries bypassing Drizzle
- Component files named with PascalCase (`TodoRow.tsx` → use `todo-row.tsx`)
- Test files in a separate `__tests__/` directory
- `any` type — use `unknown` and narrow

## Project Structure & Boundaries

### Complete Project Directory Structure

```
todo-app/
├── .github/
│   └── workflows/
│       └── ci.yml                          # Lint → type-check → test → E2E pipeline
├── docker/
│   ├── backend.Dockerfile                  # Node 24 + backend build
│   ├── frontend.Dockerfile                 # Node 24 build + nginx serve
│   └── nginx.conf                          # Frontend static file serving + API proxy
├── e2e/
│   ├── todo-lifecycle.spec.ts              # Create → complete → uncomplete → delete
│   ├── error-recovery.spec.ts              # Transient + permanent error flows
│   ├── pagination.spec.ts                  # Cursor pagination + sort toggle
│   └── fixtures/
│       └── seed.ts                         # Test data seeding for E2E
├── packages/
│   ├── shared/
│   │   ├── package.json                    # name: @todo-app/shared
│   │   ├── tsconfig.json                   # extends ../../tsconfig.base.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                    # Barrel export
│   │       ├── constants.ts                # maxTextLength, pageSize, errorCodes
│   │       ├── constants.test.ts
│   │       ├── todo-schemas.ts             # TypeBox: Todo, CreateTodo, UpdateTodo, TodoListQuery, TodoListResponse
│   │       ├── todo-schemas.test.ts
│   │       ├── error-schemas.ts            # TypeBox: ApiError, error code union
│   │       ├── error-schemas.test.ts
│   │       ├── todo-state-machine.ts       # (state, event) => newState, pure function
│   │       └── todo-state-machine.test.ts  # All allowed + disallowed transitions
│   ├── backend/
│   │   ├── package.json                    # name: @todo-app/backend
│   │   ├── tsconfig.json                   # extends ../../tsconfig.base.json
│   │   ├── vitest.config.ts
│   │   ├── drizzle.config.ts               # Drizzle Kit migration config
│   │   └── src/
│   │       ├── index.ts                    # Server entry point (listen)
│   │       ├── app.ts                      # Fastify app factory (for testing)
│   │       ├── routes/
│   │       │   ├── todos.ts                # POST, GET, PATCH, DELETE /api/todos
│   │       │   ├── todos.test.ts           # Integration tests against real Postgres
│   │       │   ├── health.ts               # GET /api/health
│   │       │   └── health.test.ts
│   │       ├── plugins/
│   │       │   ├── db.ts                   # Drizzle + pg pool Fastify plugin
│   │       │   ├── cors.ts                 # @fastify/cors config
│   │       │   ├── rate-limit.ts           # @fastify/rate-limit config
│   │       │   ├── helmet.ts               # @fastify/helmet config
│   │       │   └── swagger.ts              # @fastify/swagger + swagger-ui config
│   │       ├── schema/
│   │       │   ├── todos-table.ts          # Drizzle pgTable definition (satisfies shared types)
│   │       │   └── migrations/             # Drizzle Kit generated SQL migrations
│   │       └── lib/
│   │           ├── error-handler.ts        # Global Fastify error handler → { code, message, details? }
│   │           └── error-handler.test.ts
│   └── frontend/
│       ├── package.json                    # name: @todo-app/frontend
│       ├── tsconfig.json                   # extends ../../tsconfig.base.json
│       ├── tsconfig.app.json               # Vite app config
│       ├── tsconfig.node.json              # Vite node config
│       ├── vite.config.ts                  # Vite + React plugin + path aliases
│       ├── vitest.config.ts
│       ├── components.json                 # shadcn/ui config
│       ├── index.html                      # Vite entry HTML
│       └── src/
│           ├── main.tsx                    # React root render + QueryClientProvider
│           ├── app.tsx                     # Root layout component
│           ├── components/
│           │   ├── ui/                     # shadcn/ui primitives (copied, not imported)
│           │   │   ├── input.tsx
│           │   │   ├── checkbox.tsx
│           │   │   ├── button.tsx
│           │   │   └── tabs.tsx
│           │   ├── app-header.tsx           # Title + sort toggle
│           │   ├── app-header.test.tsx
│           │   ├── input-area.tsx           # Text input + Add Todo button + validation
│           │   ├── input-area.test.tsx
│           │   ├── todo-row.tsx             # Single todo with all states
│           │   ├── todo-row.test.tsx
│           │   ├── todo-list.tsx            # List container + pagination
│           │   ├── todo-list.test.tsx
│           │   ├── status-dot.tsx           # Syncing/error indicator
│           │   ├── status-dot.test.tsx
│           │   ├── error-message.tsx        # Inline permanent error text
│           │   ├── error-message.test.tsx
│           │   ├── placeholder-row.tsx      # Empty state skeleton
│           │   └── placeholder-row.test.tsx
│           ├── hooks/
│           │   ├── use-todos.ts             # Paginated query + filter + sort
│           │   ├── use-todos.test.ts
│           │   ├── use-create-todo.ts       # Optimistic create mutation
│           │   ├── use-create-todo.test.ts
│           │   ├── use-toggle-todo.ts       # Optimistic toggle mutation
│           │   ├── use-toggle-todo.test.ts
│           │   ├── use-delete-todo.ts       # Optimistic delete mutation
│           │   └── use-delete-todo.test.ts
│           ├── lib/
│           │   ├── api-fetch.ts             # Fetch wrapper (base URL, JSON, error normalization)
│           │   ├── api-fetch.test.ts
│           │   ├── query-client.ts          # TanStack QueryClient config
│           │   └── utils.ts                 # cn() utility (shadcn)
│           └── styles/
│               └── globals.css              # Tailwind directives + CSS variables
├── package.json                            # Root workspace scripts
├── pnpm-workspace.yaml                     # packages: ['packages/*']
├── tsconfig.base.json                      # Shared TS config (strict, ES2022, paths)
├── eslint.config.js                        # Flat ESLint config (shared across packages)
├── .prettierrc                             # Prettier config
├── playwright.config.ts                    # E2E test config
├── docker-compose.yml                      # Backend + frontend + Postgres
├── .env.example                            # DATABASE_URL, PORT, CORS_ORIGIN, RATE_LIMIT_MAX, VITE_API_BASE_URL
├── .gitignore
└── README.md
```

### Architectural Boundaries

**Package dependency flow (unidirectional):**

```
@todo-app/shared ← @todo-app/backend
@todo-app/shared ← @todo-app/frontend
```

No other cross-package dependencies. `shared` depends on `@sinclair/typebox` only. Backend and frontend never import from each other.

**API boundary:**

```
Frontend (browser)
  ↓ HTTP (fetch)
  ↓ /api/* endpoints
Backend (Fastify)
  ↓ Drizzle ORM
  ↓ SQL
Postgres
```

The API is the only integration point between frontend and backend. No shared runtime code — only shared types and schemas at compile time.

**Data boundary:**

All data access goes through Drizzle ORM in `packages/backend/src/schema/` and route handlers. No direct SQL. No DB access from frontend.

### Requirements to Structure Mapping

| FR Domain | Primary Location | Supporting Files |
|---|---|---|
| Task Lifecycle (FR1–FR9) | `backend/src/routes/todos.ts` | `shared/src/todo-schemas.ts`, `frontend/src/hooks/use-create-todo.ts`, `frontend/src/components/input-area.tsx` |
| Display & Organization (FR10–FR18) | `frontend/src/components/todo-list.tsx`, `frontend/src/hooks/use-todos.ts` | `backend/src/routes/todos.ts` (query params), `shared/src/constants.ts` (pageSize) |
| Real-Time Feedback (FR19–FR23) | `frontend/src/hooks/use-*.ts`, `frontend/src/components/status-dot.tsx` | `shared/src/todo-state-machine.ts` |
| Error Handling (FR24–FR30) | `shared/src/todo-state-machine.ts`, `backend/src/lib/error-handler.ts` | `frontend/src/components/todo-row.tsx`, `frontend/src/lib/api-fetch.ts` |
| Data Persistence (FR31–FR36) | `backend/src/schema/todos-table.ts`, `backend/src/routes/todos.ts` | `shared/src/todo-schemas.ts` (validation), `shared/src/constants.ts` |
| Accessibility (FR37–FR42) | `frontend/src/components/*.tsx` | `frontend/src/components/ui/*` (shadcn primitives) |

### Data Flow

**Create todo (happy path):**

```
InputArea → useCreateTodo.mutate({ id: uuid(), text })
  → optimistic insert into query cache (syncing state)
  → apiFetch('POST', '/api/todos', body)
  → Fastify: TypeBox validation → Drizzle upsert → 201 + Todo
  → onSuccess: cache update (confirmed state)
```

**Create todo (error):**

```
apiFetch → 400/5xx/network error
  → onError: rollback optimistic insert
  → todo state machine: → transient-error or permanent-error
  → TodoRow renders error state with recovery actions
```

### Development Workflow

**Local dev (concurrent):**

```bash
docker compose up -d postgres          # Postgres only
pnpm --filter @todo-app/backend dev    # Fastify with tsx --watch
pnpm --filter @todo-app/frontend dev   # Vite dev server with HMR
```

**Full stack (Docker Compose):**

```bash
docker compose up                       # All 3 services
```

**Testing:**

```bash
pnpm --filter @todo-app/shared test     # Vitest (state machine, schemas)
pnpm --filter @todo-app/backend test    # Vitest (routes against real Postgres)
pnpm --filter @todo-app/frontend test   # Vitest (components, hooks)
pnpm test:e2e                           # Playwright (full stack)
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices verified compatible:
- React 19 + Vite (standard combo, first-class support)
- Fastify v5 + Node 24 LTS (tested in CI since Fastify v5.4.0)
- Drizzle ORM + `pg` driver + Postgres (native adapter)
- TypeBox + Fastify v5 (Fastify consumes JSON Schema natively)
- TanStack Query v5 + React 19 (first-class `@tanstack/react-query`)
- shadcn/ui + Radix UI + Tailwind CSS + React (canonical variant)
- Vitest v4 + Vite (Vite-native test runner)
- No version conflicts or incompatibilities detected.

**Pattern Consistency:** Naming, structure, and format patterns are internally consistent and aligned with technology stack conventions.

**Structure Alignment:** Project directory structure supports all architectural decisions. Boundaries are clean and unidirectional.

### Requirements Coverage ✅

**Functional Requirements (42/42 covered):**

| FR Domain | Architectural Support | Verified |
|---|---|---|
| FR1–FR9 (Task Lifecycle) | Drizzle CRUD + TypeBox validation + frontend hooks | ✅ |
| FR10–FR18 (Display & Organization) | `useInfiniteQuery` + cursor API + Tabs component | ✅ |
| FR19–FR23 (Real-Time Feedback) | TanStack Query optimistic mutations + per-todo state machine | ✅ |
| FR24–FR30 (Error Handling) | Error handler → error schema → frontend classification → state machine | ✅ |
| FR31–FR36 (Data Persistence) | Drizzle + Postgres + UUID upsert + 3-layer validation | ✅ |
| FR37–FR42 (Accessibility) | shadcn/ui primitives + semantic HTML + ARIA patterns | ✅ |

**Non-Functional Requirements Coverage:**

| NFR | Architectural Support | Verified |
|---|---|---|
| <50ms optimistic feedback | TanStack Query `onMutate` (client-side only) | ✅ |
| <500ms API p95 | Fastify + Drizzle + indexed Postgres | ✅ |
| <150KB bundle | React 19 + Vite tree-shaking + 5 shadcn components | ✅ |
| CORS allowlist | `@fastify/cors` plugin | ✅ |
| Rate limiting 60/min/IP | `@fastify/rate-limit` in-memory | ✅ |
| 90% unit coverage | Vitest + co-located tests across all packages | ✅ |
| E2E lifecycle | Playwright in `e2e/` | ✅ |
| 0 circular deps | Unidirectional `shared` ← backend/frontend | ✅ |
| WCAG AA | shadcn ARIA primitives + design system contrast ratios | ✅ |

### Gap Analysis Results

5 minor gaps identified during validation — all resolved inline in prior sections:

| Gap | Resolution | Section Updated |
|---|---|---|
| `useTodos` pagination primitive | Specified `useInfiniteQuery` with `fetchNextPage`/`hasNextPage` | Communication Patterns |
| Cursor token format | Base64-encoded `createdAt` ISO string with directional `WHERE` clause | API Query Parameters |
| Postgres `updatedAt` trigger | Raw SQL trigger function added with migration instructions | Data Architecture |
| Frontend API base URL | `VITE_API_BASE_URL` env var via `import.meta.env` | Frontend Architecture, Infrastructure, Project Structure |
| UUID generation | `crypto.randomUUID()` — native, zero-dependency | Frontend Architecture |

**Critical gaps: 0** | **Blocking issues: 0**

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented
- [x] Enforcement guidelines with anti-patterns

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Unidirectional dependency graph prevents circular imports
- TypeBox as single source of truth for types + validation across all layers
- Per-todo state machine in shared package ensures consistent behavior
- Every file in the project tree is mapped to specific requirements
- Anti-patterns are explicitly listed for agent enforcement

**Areas for Future Enhancement (v2+):**
- Authentication middleware slot (architecture supports it, not implemented)
- WebSocket integration for multi-tab sync
- Sort by `updatedAt` (DB indexes ready, no UI)
- Deployment platform beyond Docker Compose

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Use `crypto.randomUUID()` for UUID generation (no library)
- Use `useInfiniteQuery` for the `useTodos` hook
- Include raw SQL trigger in initial Drizzle migration

**First Implementation Priority:**
1. Monorepo scaffold: `pnpm init`, `pnpm-workspace.yaml`, `tsconfig.base.json`, Docker Compose with Postgres
2. `@todo-app/shared`: TypeBox schemas, constants, todo state machine with tests
3. `@todo-app/backend`: Fastify app, Drizzle schema + migration (including trigger), CRUD routes with tests
