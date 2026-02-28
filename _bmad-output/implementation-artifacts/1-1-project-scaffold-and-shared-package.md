# Story 1.1: Project Scaffold & Shared Package

Status: ready-for-dev

## Story

As a developer,
I want a working monorepo with shared types, validation schemas, and todo state machine,
so that all packages share a single source of truth for contracts, constants, and state logic.

## Acceptance Criteria

1. **Given** a clean checkout of the repository  
   **When** I run the documented setup command  
   **Then** pnpm workspaces are configured with `packages/frontend`, `packages/backend`, and `packages/shared`  
   **And** Docker Compose starts Postgres with health check passing  
   **And** all three packages type-check with TypeScript strict mode (`pnpm typecheck` or equivalent)  
   **And** ESLint and Prettier pass with 0 errors across all packages

2. **Given** the shared package is built  
   **When** I import from `@todo-app/shared`  
   **Then** I can access TypeBox schemas: `Todo`, `CreateTodo`, `UpdateTodo`, `TodoListQuery`, `TodoListResponse`, `ApiError`  
   **And** I can access constants: `maxTextLength`, `pageSize`, `errorCodes`  
   **And** I can access the todo state machine function

3. **Given** the todo state machine  
   **When** I call it with valid `(currentState, event)` pairs  
   **Then** it returns the correct next state for all allowed transitions  
   **And** it throws (or returns an error sentinel) for disallowed transitions  
   **And** 100% of allowed and disallowed transitions are covered by unit tests

4. **Given** the monorepo dependency graph  
   **When** analyzed for circular dependencies  
   **Then** the dependency flow is unidirectional: `shared ← backend`, `shared ← frontend`  
   **And** `shared` has zero imports from `backend` or `frontend`

## Tasks / Subtasks

- [ ] **Task 1 — Root monorepo scaffold** (AC: 1)
  - [ ] Create `pnpm-workspace.yaml` listing `packages/*`
  - [ ] Create root `package.json` with workspace scripts (`dev`, `build`, `typecheck`, `lint`, `format`, `test`)
  - [ ] Create `tsconfig.base.json` with strict mode, ES2022 target, bundler moduleResolution, path aliases
  - [ ] Create `eslint.config.js` (flat config) covering all packages with TypeScript + React rules
  - [ ] Create `.prettierrc` with project formatting preferences
  - [ ] Create `.gitignore` (node_modules, dist, .env, coverage, .turbo)
  - [ ] Create `.env.example` with all required vars: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `RATE_LIMIT_MAX`, `VITE_API_BASE_URL`

- [ ] **Task 2 — Docker Compose + Postgres** (AC: 1)
  - [ ] Create `docker-compose.yml` with `postgres` service (postgres:18-alpine image, named volume, POSTGRES\_\* env vars)
  - [ ] Add Docker HEALTHCHECK to postgres service (`pg_isready`)
  - [ ] Verify `docker compose up -d postgres` reaches healthy state

- [ ] **Task 3 — Frontend package scaffold** (AC: 1)
  - [ ] Initialize with `npm create vite@latest packages/frontend -- --template react-ts`
  - [ ] Create `packages/frontend/package.json` with name `@todo-app/frontend`
  - [ ] Create `packages/frontend/tsconfig.json` extending `../../tsconfig.base.json`
  - [ ] Run `npx shadcn@latest init` inside `packages/frontend` (choose React, Tailwind CSS, CSS variables theme)
  - [ ] Verify `components.json` generated, `tailwind.config.ts` and `globals.css` correct
  - [ ] Configure Vite path alias `@/` → `./src` in `vite.config.ts`
  - [ ] Create `packages/frontend/vitest.config.ts`

- [ ] **Task 4 — Backend package scaffold** (AC: 1)
  - [ ] Create `packages/backend/` with `package.json` (name: `@todo-app/backend`)
  - [ ] Create `packages/backend/tsconfig.json` extending `../../tsconfig.base.json`
  - [ ] Install: `fastify`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/swagger`, `@fastify/swagger-ui`, `drizzle-orm`, `pg`, `typebox`
  - [ ] Install dev: `drizzle-kit`, `tsx`, `@types/pg`, `vitest`
  - [ ] Create minimal `packages/backend/src/index.ts` and `packages/backend/src/app.ts` stubs (enough to type-check)
  - [ ] Create `drizzle.config.ts` pointing at `src/schema/migrations`
  - [ ] Create `packages/backend/vitest.config.ts`

- [ ] **Task 5 — Shared package: constants** (AC: 2)
  - [ ] Create `packages/shared/package.json` (name: `@todo-app/shared`, main: `./src/index.ts`)
  - [ ] Create `packages/shared/tsconfig.json` extending `../../tsconfig.base.json`
  - [ ] Create `packages/shared/vitest.config.ts`
  - [ ] Implement `packages/shared/src/constants.ts`:
    - `maxTextLength: 500` (named export, camelCase)
    - `pageSize: 20`
    - `errorCodes` object: `{ VALIDATION_ERROR, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR }`
  - [ ] Write `packages/shared/src/constants.test.ts` (assert each export exists and has correct value/type)

- [ ] **Task 6 — Shared package: TypeBox schemas** (AC: 2)
  - [ ] Implement `packages/shared/src/todo-schemas.ts`:
    - `Todo` — `{ id: uuid, text: string (maxLength: maxTextLength), completed: boolean, createdAt: string, updatedAt: string }`
    - `CreateTodo` — `{ id: uuid, text: string (minLength: 1, maxLength: maxTextLength) }`
    - `UpdateTodo` — `{ completed: boolean }` (partial, only field patchable)
    - `TodoListQuery` — `{ status?: 'active'|'completed', order?: 'asc'|'desc', cursor?: string, limit?: integer }`
    - `TodoListResponse` — `{ data: Type.Array(Todo), cursor: Type.Union([Type.String(), Type.Null()]) }`
  - [ ] Implement `packages/shared/src/error-schemas.ts`:
    - `ApiError` — `{ code: string, message: string, details?: unknown }`
  - [ ] Write `packages/shared/src/todo-schemas.test.ts` — validate TypeBox `Value.Check()` on valid and invalid payloads for each schema (at minimum 1 valid + 1 invalid per schema)
  - [ ] Write `packages/shared/src/error-schemas.test.ts`

- [ ] **Task 7 — Shared package: todo state machine** (AC: 3)
  - [ ] Implement `packages/shared/src/todo-state-machine.ts` — pure function `transitionTodoState(currentState: TodoUiState, event: TodoUiEvent): TodoUiState`
  - [ ] Define union types:
    ```
    TodoUiState = 'confirmed' | 'syncing' | 'transient-error' | 'permanent-error'
    TodoUiEvent = 'MUTATE' | 'SUCCESS' | 'TRANSIENT_ERROR' | 'PERMANENT_ERROR' | 'RETRY'
    ```
  - [ ] Implement all valid transitions (see Dev Notes → State Machine below)
  - [ ] Throw `Error('Invalid transition: ...')` for disallowed state+event combos
  - [ ] Write `packages/shared/src/todo-state-machine.test.ts` covering ALL transitions (allowed and disallowed)

- [ ] **Task 8 — Barrel export** (AC: 2)
  - [ ] Create `packages/shared/src/index.ts` re-exporting everything from `constants.ts`, `todo-schemas.ts`, `error-schemas.ts`, `todo-state-machine.ts`

- [ ] **Task 9 — Cross-package wiring** (AC: 1, 4)
  - [ ] Add `"@todo-app/shared": "workspace:*"` to `packages/backend/package.json` and `packages/frontend/package.json` dependencies
  - [ ] Run `pnpm install` from root to link workspaces
  - [ ] Verify `pnpm --filter @todo-app/shared typecheck` passes
  - [ ] Verify `pnpm --filter @todo-app/backend typecheck` passes
  - [ ] Verify `pnpm --filter @todo-app/frontend typecheck` passes
  - [ ] Verify `pnpm lint` passes with 0 errors
  - [ ] Verify `pnpm --filter @todo-app/shared test` passes with all state machine + schema tests green

- [ ] **Task 10 — README and setup docs** (AC: 1)
  - [ ] Create `README.md` documenting the one-command setup: `docker compose up -d postgres && pnpm install`
  - [ ] Document package scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`

## Dev Notes

### State Machine: All Transitions

**Valid transitions (must all be implemented and tested):**

| Current State     | Event             | Next State        |
| ----------------- | ----------------- | ----------------- |
| `confirmed`       | `MUTATE`          | `syncing`         |
| `syncing`         | `SUCCESS`         | `confirmed`       |
| `syncing`         | `TRANSIENT_ERROR` | `transient-error` |
| `syncing`         | `PERMANENT_ERROR` | `permanent-error` |
| `transient-error` | `RETRY`           | `syncing`         |
| `transient-error` | `MUTATE`          | `syncing`         |

**Disallowed transitions (must throw, and tests must assert they throw):**

| Current State     | Event             | Why Disallowed                       |
| ----------------- | ----------------- | ------------------------------------ |
| `confirmed`       | `SUCCESS`         | Can't succeed without syncing first  |
| `confirmed`       | `TRANSIENT_ERROR` | Can't error without syncing first    |
| `confirmed`       | `PERMANENT_ERROR` | Can't error without syncing first    |
| `confirmed`       | `RETRY`           | Nothing to retry in confirmed state  |
| `syncing`         | `MUTATE`          | Already syncing, can't start another |
| `syncing`         | `RETRY`           | Can't retry while syncing            |
| `permanent-error` | `RETRY`           | Permanent errors cannot be retried   |
| `permanent-error` | `MUTATE`          | Cannot mutate from permanent error   |
| `permanent-error` | `SUCCESS`         | No active sync                       |
| `permanent-error` | `TRANSIENT_ERROR` | No active sync                       |
| `permanent-error` | `PERMANENT_ERROR` | No active sync                       |
| `transient-error` | `SUCCESS`         | No active sync                       |
| `transient-error` | `TRANSIENT_ERROR` | No active sync                       |
| `transient-error` | `PERMANENT_ERROR` | No active sync                       |

### TypeBox Schema Implementation Notes

Use `typebox` ^1.1.5 (latest). The v1 API uses **default imports** — this is a breaking change from `@sinclair/typebox` 0.34.x. The canonical import pattern:

```typescript
import Type from "typebox";
import Value from "typebox/value";
import { maxTextLength, pageSize } from "./constants.js";

export const Todo = Type.Object({
  id: Type.String({ format: "uuid" }),
  text: Type.String({ minLength: 1, maxLength: maxTextLength }),
  completed: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});
export type Todo = Type.Static<typeof Todo>;
```

- `Type` is a **default import** (not named `{ Type }`).
- `Type.Static<typeof T>` replaces the old `Static<typeof T>` — it is now a namespace property on the default export.
- `Value` is imported from `'typebox/value'` as a default import.
- TypeBox schemas are both the **runtime validation object** (JSON Schema) and the **TypeScript type** via `Type.Static<>`.
- Fastify v5 consumes the schema object directly on routes — no extra compilation needed.
- `Value.Check(Schema, data)` is used in tests; `Value.Errors(Schema, data)` for detailed errors.
- Never duplicate schema constraints inline on routes — always import from `@todo-app/shared`.

### tsconfig.base.json Requirements

Must enable:

- `"strict": true`
- `"target": "ES2022"`
- `"module": "ES2022"` (or `"NodeNext"` for backend, `"ESNext"` for frontend)
- `"moduleResolution": "bundler"` (frontend) / `"NodeNext"` (backend/shared)
- `"verbatimModuleSyntax": true`
- `"noUncheckedIndexedAccess": true`
- `"paths"` — each package overrides with `"@/*": ["./src/*"]`

**Note:** The base tsconfig has `"paths": {}`. Each package's tsconfig adds `"@/*": ["./src/*"]` for its own alias.

### ESLint Flat Config Requirements

`eslint.config.js` at root must:

- Use `typescript-eslint` flat config recommended preset
- Enable `eslint-plugin-react-hooks` for the frontend globs
- Set `"no-restricted-syntax"` or custom rule to catch `export default` (zero default exports policy)
- Run on `packages/**/*.{ts,tsx}` globs
- Exclude `packages/frontend/src/components/ui/**` (shadcn-generated, don't lint)

### Named Exports Enforcement

**Zero default exports** — this is a hard architectural rule. Every file uses named exports:

```typescript
// ✅ Correct
export const maxTextLength = 500
export function transitionTodoState(...) { ... }
export const Todo = Type.Object({ ... })

// ❌ Never do this
export default function transitionTodoState(...) { ... }
```

### File Naming Rules

- All files: **kebab-case** — `todo-schemas.ts`, `todo-state-machine.ts`, `error-schemas.ts`
- React components: **kebab-case file, PascalCase export** — `todo-row.tsx` exports `TodoRow`
- Test files: same name with `.test.ts` / `.test.tsx` suffix, **co-located** with source

### Docker Compose Postgres Config

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: todoapp
      POSTGRES_USER: todoapp
      POSTGRES_PASSWORD: todoapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todoapp -d todoapp"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  postgres_data:
```

`DATABASE_URL` for local dev: `postgresql://todoapp:todoapp@localhost:5432/todoapp`

### shadcn/ui Init Notes

When running `npx shadcn@latest init` inside `packages/frontend`:

- Style: Default (CSS variables)
- Base color: Neutral
- Global CSS: `src/styles/globals.css`
- Tailwind config: Yes
- Components alias: `@/components`
- Utils alias: `@/lib/utils`

The `components.json` will be generated in `packages/frontend/`. The `cn()` utility lands at `packages/frontend/src/lib/utils.ts`. **Do not modify** shadcn-generated files in `components/ui/` — treat them as vendor code.

### Workspace Cross-Package Import Pattern

```typescript
// In packages/backend/src/routes/todos.ts
import { type Todo, CreateTodo, maxTextLength } from "@todo-app/shared";

// In packages/frontend/src/hooks/use-create-todo.ts
import { type Todo, maxTextLength } from "@todo-app/shared";

// Intra-package import (frontend)
import { TodoRow } from "@/components/todo-row";
```

`@todo-app/shared` is resolved via pnpm workspace symlink — no compilation step needed in dev mode when using `tsx` (backend) or Vite (frontend) with TypeScript path resolution.

### Testing Standards for This Story

- **Framework:** Vitest v4.x in all packages
- **Shared tests** are pure unit tests — no mocks needed (state machine + TypeBox validation are pure functions)
- **Coverage target:** 100% for state machine (all branches), ≥90% overall per NFR20
- **Test file pattern:** `*.test.ts` co-located with source
- **Run shared tests:** `pnpm --filter @todo-app/shared test`

#### State Machine Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { transitionTodoState } from "./todo-state-machine.js";

describe("transitionTodoState — allowed transitions", () => {
  it("confirmed + MUTATE → syncing", () => {
    expect(transitionTodoState("confirmed", "MUTATE")).toBe("syncing");
  });
  // ... all allowed transitions
});

describe("transitionTodoState — disallowed transitions", () => {
  it("confirmed + RETRY → throws", () => {
    expect(() => transitionTodoState("confirmed", "RETRY")).toThrow();
  });
  // ... all disallowed transitions
});
```

#### TypeBox Validation Test Pattern

```typescript
import Value from "typebox/value";
import { describe, it, expect } from "vitest";
import { CreateTodo } from "./todo-schemas.js";

describe("CreateTodo schema", () => {
  it("accepts valid payload", () => {
    expect(
      Value.Check(CreateTodo, { id: crypto.randomUUID(), text: "Buy milk" }),
    ).toBe(true);
  });
  it("rejects empty text", () => {
    expect(Value.Check(CreateTodo, { id: crypto.randomUUID(), text: "" })).toBe(
      false,
    );
  });
  it("rejects text over maxTextLength", () => {
    expect(
      Value.Check(CreateTodo, {
        id: crypto.randomUUID(),
        text: "x".repeat(501),
      }),
    ).toBe(false);
  });
});
```

### Project Structure Notes

This story establishes the **entire file tree skeleton**. Subsequent stories add implementation to stub files. Key directories created by this story:

```
todo-app/
├── packages/
│   ├── shared/src/           ← FULLY IMPLEMENTED here (schemas, constants, state machine)
│   ├── backend/src/          ← Stub only (index.ts, app.ts) — backend routes in Story 1.2
│   └── frontend/src/         ← Vite scaffold + shadcn init — components in Story 1.3+
├── docker-compose.yml        ← FULLY IMPLEMENTED here
├── pnpm-workspace.yaml       ← FULLY IMPLEMENTED here
├── tsconfig.base.json        ← FULLY IMPLEMENTED here
├── eslint.config.js          ← FULLY IMPLEMENTED here
└── README.md                 ← FULLY IMPLEMENTED here
```

**Scope boundary:** Do NOT implement Drizzle schema, migrations, Fastify routes, React components, or TanStack Query hooks in this story. That is Stories 1.2–1.5. Backend and frontend packages only need enough to **type-check** and pass lint.

### References

- Monorepo structure: [Source: architecture.md#Complete Project Directory Structure]
- TypeBox schema design: [Source: architecture.md#Data Architecture]
- State machine contract: [Source: architecture.md#Core Architectural Decisions — Frontend Architecture]
- Naming conventions: [Source: architecture.md#Naming Patterns]
- Anti-patterns list: [Source: architecture.md#Enforcement Guidelines]
- Docker Compose spec: [Source: architecture.md#Infrastructure & Deployment]
- Story AC: [Source: epics.md#Story 1.1]
- shadcn/ui init: [Source: architecture.md#Starter Template Evaluation — Initialization Commands]
- Cross-cutting concerns: [Source: architecture.md#Cross-Cutting Concerns Identified]

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

_none_

### Completion Notes List

_none_

### File List

_to be filled by dev agent upon completion_
