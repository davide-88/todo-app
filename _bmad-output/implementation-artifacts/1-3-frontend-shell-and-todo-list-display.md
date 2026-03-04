# Story 1.3: Frontend Shell & Todo List Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my todos when I open the app,
so that I can immediately review what I need to do.

## Acceptance Criteria

1. **Given** the frontend app is loaded
   **When** the initial data fetch is in progress
   **Then** placeholder rows (static skeleton) are displayed
   **And** the input area is visible and ready

2. **Given** todos exist on the server
   **When** the fetch completes
   **Then** todos are displayed in a list with text and timestamps visible
   **And** active todos show normal text with unchecked checkbox
   **And** completed todos show strikethrough text, muted color, and checked checkbox

3. **Given** no todos exist on the server
   **When** the fetch completes
   **Then** placeholder rows remain visible indicating where todos will appear

4. **Given** the app shell renders
   **When** the page loads
   **Then** AppHeader displays the app title
   **And** the layout is centered with max-width 640px on desktop (>=768px)
   **And** full-width with 16px padding on mobile (<768px)

5. **Given** the frontend makes API requests
   **When** any request is sent
   **Then** it goes through the apiFetch wrapper with base URL from VITE_API_BASE_URL
   **And** errors are normalized to the { code, message, details? } shape

## Tasks / Subtasks

- [x] **Task 1 — Install shadcn/ui primitives + TanStack Query** (AC: all)
  - [x] Run `npx shadcn@latest add input checkbox button tabs` inside `packages/frontend`
  - [x] Install `@tanstack/react-query` v5 as dependency
  - [x] Install `@testing-library/react` + `@testing-library/jest-dom` as devDependencies
  - [x] Verify all packages install without conflicts

- [x] **Task 2 — apiFetch wrapper** (AC: 5)
  - [x] Create `packages/frontend/src/lib/api-fetch.ts` — fetch wrapper with `VITE_API_BASE_URL` base URL from `import.meta.env.VITE_API_BASE_URL`
  - [x] Handle JSON response parsing
  - [x] Normalize non-2xx responses to `{ code, message, details? }` shape using `ApiError` type from `@todo-app/shared`
  - [x] Handle network errors (fetch throws) — normalize to `{ code: "NETWORK_ERROR", message: "..." }`
  - [x] Write `packages/frontend/src/lib/api-fetch.test.ts` — unit tests with mocked `fetch`: success, 400, 500, network error

- [x] **Task 3 — QueryClient configuration** (AC: all)
  - [x] Create `packages/frontend/src/lib/query-client.ts` — TanStack `QueryClient` with default options
  - [x] Defaults: `staleTime: 0`, `retry: false` (error handling is per-todo, not auto-retry)
  - [x] Update `packages/frontend/src/main.tsx` to wrap `<App />` in `<QueryClientProvider>`

- [x] **Task 4 — useTodos hook** (AC: 1, 2, 3)
  - [x] Create `packages/frontend/src/hooks/use-todos.ts` — `useInfiniteQuery` hook wrapping `GET /api/todos` via `apiFetch`
  - [x] Accept `status` filter (active/completed) and `order` (asc/desc) parameters
  - [x] Handle cursor-based pagination: pass `cursor` from previous page's last item
  - [x] Return `{ todos, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error }` — flatten pages into single array
  - [x] Write `packages/frontend/src/hooks/use-todos.test.ts` — unit tests with mocked `apiFetch`: loading state, success with data, empty list, pagination (hasNextPage true/false)

- [x] **Task 5 — PlaceholderRow component** (AC: 1, 3)
  - [x] Create `packages/frontend/src/components/placeholder-row.tsx`
  - [x] Static skeleton: 48px min height, checkbox placeholder (18x18px rounded rect, border color), text placeholder (rounded rect, border color, varied widths 40-70%)
  - [x] No animation (static skeleton per UX spec)
  - [x] Write `packages/frontend/src/components/placeholder-row.test.tsx`

- [x] **Task 6 — StatusDot component** (AC: 2)
  - [x] Create `packages/frontend/src/components/status-dot.tsx`
  - [x] Variants: `syncing` (blue #3B82F6, pulse animation), `error` (red #DC2626, static), `hidden` (not rendered)
  - [x] 8x8px circle
  - [x] `role="status"`, `aria-label="Syncing"` or `"Error"`
  - [x] Respect `prefers-reduced-motion`: disable pulse when set
  - [x] Write `packages/frontend/src/components/status-dot.test.tsx`

- [x] **Task 7 — TodoRow component** (AC: 2)
  - [x] Create `packages/frontend/src/components/todo-row.tsx`
  - [x] Props: `todo`, `state` (TodoUiState from shared), `errorMessage?`, `onToggle`, `onDelete`, `onRetry?`
  - [x] States: confirmed-active (normal text, unchecked), confirmed-completed (strikethrough, muted, checked), syncing (muted 50% opacity, disabled, blue dot), transient-error (red bg tint, frozen checkbox, retry + delete visible), permanent-error (red bg tint, frozen checkbox, error message, delete only)
  - [x] Delete button: hover-reveal on desktop for confirmed rows, always visible on error rows and mobile
  - [x] Timestamp display: relative time (e.g., "2m ago") in `--muted-foreground`, right-aligned
  - [x] `role="listitem"`, `aria-disabled="true"` when syncing
  - [x] `aria-label` on icon buttons: "Delete todo: [text]", "Retry todo: [text]"
  - [x] Write `packages/frontend/src/components/todo-row.test.tsx` — test all 5 visual states, accessibility attributes

- [x] **Task 8 — ErrorMessage component** (AC: 2)
  - [x] Create `packages/frontend/src/components/error-message.tsx`
  - [x] 13px font, `--destructive` color, 4px top padding
  - [x] Only rendered when `state === 'permanent-error'`
  - [x] `role="alert"`, linked to TodoRow via `aria-describedby`
  - [x] Write `packages/frontend/src/components/error-message.test.tsx`

- [x] **Task 9 — TodoList component** (AC: 1, 2, 3)
  - [x] Create `packages/frontend/src/components/todo-list.tsx`
  - [x] Renders TodoRow[] when data exists, PlaceholderRow[] when empty (after fetch completes), PlaceholderRow[] during initial loading
  - [x] `role="list"`, `aria-live="polite"` on the container
  - [x] "Load more" button when `hasNextPage` is true (disabled during `isFetchingNextPage`)
  - [x] Write `packages/frontend/src/components/todo-list.test.tsx`

- [x] **Task 10 — AppHeader component** (AC: 4)
  - [x] Create `packages/frontend/src/components/app-header.tsx`
  - [x] Title "todos" left-aligned, 20px font-weight 600
  - [x] Sort toggle button right-aligned: "Newest first" / "Oldest first" (ghost Button variant)
  - [x] `--card` background (#FAFAFA), bottom border
  - [x] `aria-label="Sort order: newest first"` (updates dynamically)
  - [x] Write `packages/frontend/src/components/app-header.test.tsx`

- [x] **Task 11 — InputArea component (display-only for this story)** (AC: 1)
  - [x] Create `packages/frontend/src/components/input-area.tsx`
  - [x] Input field with placeholder "What needs to be done?" + "Add Todo" button
  - [x] Visually complete per UX spec: `--card` background on input, `--primary` border on focus, 8px gap
  - [x] `aria-label="New todo text"` on input
  - [x] **Submission logic is Story 1.4** — this story only renders the visual component. Wire `onSubmit` prop but do not implement the mutation hook.
  - [x] Write `packages/frontend/src/components/input-area.test.tsx`

- [x] **Task 12 — App shell composition** (AC: 1, 2, 3, 4)
  - [x] Update `packages/frontend/src/app.tsx` to compose: AppHeader → InputArea → Tabs (Active/Completed, display-only) → TodoList
  - [x] Layout: centered max-width 640px on desktop (>=768px), full-width 16px padding on mobile
  - [x] Outer container with 1px border, 12px border-radius per UX spec
  - [x] Wire `useTodos` hook with default params (no filter, descending order)
  - [x] Tabs are visual-only in this story (Active selected by default) — filtering logic is Story 3.1
  - [x] Google Fonts: add Roboto 400/500 with `font-display: swap` to `index.html`

- [x] **Task 13 — Verify** (AC: all)
  - [x] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [x] `pnpm lint` passes with 0 errors
  - [x] `pnpm --filter @todo-app/frontend test` — all unit tests green
  - [x] Frontend renders in browser: app shell visible, placeholder rows on empty server, todo list with data from running backend

## Dev Notes

### Current Frontend State (from Stories 1.1 + 1.2)

The frontend is a **minimal Vite + React 19 scaffold** with no components:
- `src/main.tsx` — `createRoot` rendering `<App />` in `<StrictMode>`
- `src/App.tsx` — returns `<main>` with title text (stub only)
- `src/lib/utils.ts` — `cn()` Tailwind class merge utility (shadcn standard)
- `src/styles/globals.css` — Tailwind v4 import + shadcn CSS variable tokens (light + dark)
- `components.json` — shadcn configured: default style, no RSC, lucide icons, aliases set
- **No components directory** — shadcn primitives not yet installed
- **No hooks directory** — no TanStack Query hooks
- **No api-fetch** — no HTTP client wrapper

### Dependencies Already Installed

```
dependencies:
  @todo-app/shared: workspace:*
  class-variance-authority: ^0.7.1
  clsx: ^2.1.1
  lucide-react: ^0.475.0
  react: ^19.0.0
  react-dom: ^19.0.0
  tailwind-merge: ^2.6.0

devDependencies:
  @tailwindcss/vite: ^4.0.0
  @types/react: ^19.0.0
  @types/react-dom: ^19.0.0
  @vitejs/plugin-react: ^4.3.4
  jsdom: ^28.1.0
  tailwindcss: ^4.0.0
  typescript: ^5.7.3
  vite: ^6.1.0
  vitest: ^3.0.0
```

### New Dependencies Required

```bash
# TanStack Query for server state
pnpm --filter @todo-app/frontend add @tanstack/react-query

# Testing library for component tests
pnpm --filter @todo-app/frontend add -D @testing-library/react @testing-library/jest-dom

# shadcn/ui components (run inside packages/frontend)
cd packages/frontend && npx shadcn@latest add input checkbox button tabs
```

**Note on Vitest version:** The project uses `vitest: ^3.0.0` (not v4.x as mentioned in architecture). The architecture spec says v4.x but Story 1.1 installed v3. Use the installed v3 — do not upgrade mid-sprint.

### apiFetch Wrapper Pattern

```typescript
// packages/frontend/src/lib/api-fetch.ts
import type { ApiError } from "@todo-app/shared";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
  } catch {
    throw { code: "NETWORK_ERROR", message: "Network request failed" } satisfies ApiError;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw {
      code: body.code ?? "UNKNOWN_ERROR",
      message: body.message ?? response.statusText,
      details: body.details,
    } satisfies ApiError;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
```

**Critical:** Always throw `ApiError`-shaped objects — the frontend error classification (Story 2.x) depends on this shape. Never throw raw `Response` or `Error` objects.

### useTodos Hook Pattern (TanStack Query v5 useInfiniteQuery)

```typescript
// packages/frontend/src/hooks/use-todos.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch.js";
import type { Todo } from "@todo-app/shared";

interface TodoListResponse {
  data: Todo[];
  cursor: string | null;
}

interface UseTodosOptions {
  status?: "active" | "completed";
  order?: "asc" | "desc";
}

export function useTodos(options: UseTodosOptions = {}) {
  const { status, order = "desc" } = options;
  return useInfiniteQuery({
    queryKey: ["todos", { status, order }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (order) params.set("order", order);
      if (pageParam) params.set("cursor", pageParam);
      const query = params.toString();
      return apiFetch<TodoListResponse>(`/api/todos${query ? `?${query}` : ""}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });
}
```

**Return shape:** Use `data.pages.flatMap(p => p.data)` to get a flat todo array in components.

### QueryClient Configuration

```typescript
// packages/frontend/src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Why `retry: false`:** Error handling is per-todo via the state machine, not via auto-retry. TanStack Query's built-in retry would interfere with the optimistic UI error flow.

### main.tsx Update Pattern

```typescript
// packages/frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client.js";
import "./styles/globals.css";
import { App } from "./App.js";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

### Component Implementation Details

#### PlaceholderRow — Static Skeleton

```typescript
// packages/frontend/src/components/placeholder-row.tsx
interface PlaceholderRowProps {
  widthPercent?: number; // text placeholder width 40-70%
}

export const PlaceholderRow = ({ widthPercent = 60 }: PlaceholderRowProps) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[48px]" role="listitem">
      {/* Checkbox placeholder */}
      <div className="h-[18px] w-[18px] rounded border border-border shrink-0" />
      {/* Text placeholder */}
      <div
        className="h-4 rounded bg-border"
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
};
```

Show 3-5 rows with varied widths (e.g., 60%, 45%, 70%, 55%, 40%).

#### TodoRow — State-Driven Rendering

Key implementation points:
- Use `Checkbox` from shadcn/ui for the toggle
- Use `Button` from shadcn/ui (ghost variant) for delete and retry icons
- Use `lucide-react` icons: `X` for delete, `RotateCcw` for retry
- Timestamp: format `createdAt` as relative time — use a simple helper (no library; compute diff from `Date.now()`)
- Hover-reveal delete: use Tailwind `group` + `opacity-0 group-hover:opacity-100` pattern
- Error rows: always show actions (no hover-reveal)
- Syncing rows: `pointer-events-none opacity-50`

#### Relative Time Helper

Implement a lightweight helper — no external library needed:

```typescript
// packages/frontend/src/lib/format-relative-time.ts
export function formatRelativeTime(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

#### App Shell Layout

The outer container uses a bordered frame pattern per UX Direction C + A:

```
<div className="mx-auto max-w-[640px] border border-border rounded-xl overflow-hidden">
  <AppHeader sortOrder={sortOrder} onToggleSort={toggleSort} />
  <InputArea onSubmit={handleSubmit} />
  <Tabs defaultValue="active">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="active">Active</TabsTrigger>
      <TabsTrigger value="completed">Completed</TabsTrigger>
    </TabsList>
  </Tabs>
  <TodoList ... />
</div>
```

**Responsive:** The outer container gets `px-4` padding on mobile (<768px) via the body/page wrapper, not on the bordered frame itself.

### Scope Boundary — What This Story Does NOT Implement

- **Todo creation mutation** — Story 1.4 (`useCreateTodo` hook, InputArea submission)
- **Todo toggle/delete mutations** — Story 1.5 (`useToggleTodo`, `useDeleteTodo` hooks)
- **Error classification & recovery** — Epic 2 (error type differentiation, retry flows)
- **Tab filtering logic** — Story 3.1 (Active/Completed URL params, refetch on tab switch)
- **Sort toggle logic** — Story 3.2 (sort parameter wiring, refetch on toggle)
- **Cursor pagination "Load more"** — Story 3.3 (fetchNextPage wiring)
- **Keyboard navigation** — Story 4.1
- **Screen reader support** — Story 4.2

**For this story:** InputArea renders but submit is a no-op (prop accepted, not wired). Tabs render but switching is visual-only. Sort toggle renders but does not refetch. "Load more" button renders but does not fetch. TodoRow delete/retry/toggle callbacks are accepted as props but handlers are no-ops.

### Testing Strategy

**Test framework:** Vitest 3.x + `@testing-library/react` + `jsdom`

**Test patterns for components:**
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceholderRow } from "./placeholder-row.js";

describe("PlaceholderRow", () => {
  it("renders checkbox and text placeholder", () => {
    render(<PlaceholderRow />);
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });
});
```

**For hooks (useTodos):** Use `@tanstack/react-query` test utilities — wrap in `QueryClientProvider` with a test QueryClient. Mock `apiFetch` via `vi.mock`.

**Coverage targets (NFR20):** >=90% for all new code in this story.

### Tailwind CSS v4 Notes (from Story 1.1)

The project uses **Tailwind CSS v4** with the Vite plugin (`@tailwindcss/vite`). There is NO `tailwind.config.ts` — Tailwind v4 uses CSS-based configuration via `@import "tailwindcss"` in `globals.css`.

CSS variables for colors are defined in `globals.css` using HSL values. To use them in Tailwind classes:
- `bg-background` → `hsl(var(--background))`
- `text-foreground` → `hsl(var(--foreground))`
- `border-border` → `hsl(var(--border))`
- `text-destructive` → `hsl(var(--destructive))`
- `text-muted-foreground` → `hsl(var(--muted-foreground))`

**Custom colors not in the default token set** (add to globals.css if needed):
- `--syncing: 217 91% 60%` (blue #3B82F6) — for StatusDot syncing state
- `--destructive-bg: 0 93% 97%` (light red #FEF2F2) — for error row background tint

### Font Loading — Google Fonts

Add to `packages/frontend/index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
```

Add to `globals.css` base layer:
```css
body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

### File Naming Rules (CRITICAL)

- All files: **kebab-case** (`todo-row.tsx`, `api-fetch.ts`, `use-todos.ts`)
- Component exports: **PascalCase** (`TodoRow`, `InputArea`, `AppHeader`)
- Hook exports: **camelCase** (`useTodos`)
- **Named exports only** — zero `export default` anywhere
- Test files: co-located, `.test.ts`/`.test.tsx` suffix
- No `__tests__/` directories

### Anti-Patterns to Reject

- `export default` anywhere in frontend code
- Direct `fetch()` calls without the `apiFetch` wrapper
- Inline TypeBox schema duplication
- `React.FC` type annotation (use explicit props destructuring)
- PascalCase file names (`TodoRow.tsx` is WRONG — use `todo-row.tsx`)
- Test files in a separate `__tests__/` directory
- `any` type — use `unknown` and narrow
- Default imports from `@tanstack/react-query` (use named: `{ useInfiniteQuery }`)
- Installing `axios` or `date-fns` — use native `fetch` wrapper and lightweight helper

### Environment Variables

| Var | Used in | Default |
|---|---|---|
| `VITE_API_BASE_URL` | `api-fetch.ts` | `http://localhost:3000` |

Set in `.env` (already in `.env.example` from Story 1.1).

### Project Structure — Files to Create/Modify

```
packages/frontend/
  index.html                         <- MODIFY (add Google Fonts)
  src/
    main.tsx                         <- MODIFY (add QueryClientProvider)
    app.tsx                          <- MODIFY (compose full app shell)
    components/
      ui/                            <- NEW (shadcn generates: input.tsx, checkbox.tsx, button.tsx, tabs.tsx)
        input.tsx
        checkbox.tsx
        button.tsx
        tabs.tsx
      app-header.tsx                 <- NEW
      app-header.test.tsx            <- NEW
      input-area.tsx                 <- NEW
      input-area.test.tsx            <- NEW
      todo-row.tsx                   <- NEW
      todo-row.test.tsx              <- NEW
      todo-list.tsx                  <- NEW
      todo-list.test.tsx             <- NEW
      status-dot.tsx                 <- NEW
      status-dot.test.tsx            <- NEW
      error-message.tsx              <- NEW
      error-message.test.tsx         <- NEW
      placeholder-row.tsx            <- NEW
      placeholder-row.test.tsx       <- NEW
    hooks/
      use-todos.ts                   <- NEW
      use-todos.test.ts              <- NEW
    lib/
      api-fetch.ts                   <- NEW
      api-fetch.test.ts              <- NEW
      query-client.ts                <- NEW
      format-relative-time.ts        <- NEW
      format-relative-time.test.ts   <- NEW
      utils.ts                       <- EXISTS (cn utility, do not modify)
    styles/
      globals.css                    <- MODIFY (add custom color tokens + font-family)
```

### Previous Story Learnings (from 1.1 + 1.2)

**From Story 1.1:**
- shadcn init uses Tailwind v4 — no `tailwind.config.ts`, uses `@tailwindcss/vite` plugin
- `components.json` already configured with correct aliases (`@/components/ui`, `@/lib/utils`, `@/hooks`)
- ESLint excludes `packages/frontend/src/components/ui/**` from linting (shadcn vendor code)
- ESLint `export default` ban has exceptions for framework config files (vite.config.ts, vitest.config.ts)
- `pnpm esbuild builds` needs `"onlyBuiltDependencies": ["esbuild"]` in root package.json (already set)

**From Story 1.2:**
- TypeBox v1 uses **default imports**: `import Type from "typebox"` — but in frontend, we only import *types* from `@todo-app/shared` (e.g., `type Todo`, `type ApiError`), not the TypeBox runtime
- Vitest uses explicit imports (`import { describe, it, expect } from "vitest"`) — `globals: false` in vitest config
- Backend routes are registered under `/api/todos` prefix and `/api/health`
- API response shapes: `{ data: Todo[], cursor: string | null }` for list, `Todo` for single, `204` for delete, `{ code, message, details? }` for errors
- Backend integration tests found that `50ms` sleep was insufficient for `updatedAt` ordering — use adequate timing in any time-dependent frontend tests
- The backend CORS is configured with `CORS_ORIGIN` env var — for local dev, frontend at `http://localhost:5173` needs to be in the allowlist

### References

- Component hierarchy: [Source: ux-design-specification.md#Composition Hierarchy]
- TodoRow states: [Source: ux-design-specification.md#TodoRow States]
- PlaceholderRow spec: [Source: ux-design-specification.md#PlaceholderRow]
- StatusDot spec: [Source: ux-design-specification.md#StatusDot]
- ErrorMessage spec: [Source: ux-design-specification.md#ErrorMessage]
- AppHeader spec: [Source: ux-design-specification.md#AppHeader]
- InputArea spec: [Source: ux-design-specification.md#InputArea]
- Color system: [Source: ux-design-specification.md#Color System]
- Typography: [Source: ux-design-specification.md#Typography System]
- Spacing: [Source: ux-design-specification.md#Spacing & Layout Foundation]
- Layout structure: [Source: ux-design-specification.md#Implementation Approach]
- Frontend architecture: [Source: architecture.md#Frontend Architecture]
- Component file structure: [Source: architecture.md#Complete Project Directory Structure]
- TanStack Query patterns: [Source: architecture.md#Communication Patterns]
- apiFetch pattern: [Source: architecture.md#Frontend Architecture — HTTP client]
- Named exports rule: [Source: architecture.md#Structure Patterns — Exports]
- Naming conventions: [Source: architecture.md#Naming Patterns]
- Story ACs: [Source: epics.md#Story 1.3]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Vitest `globals: false` + `@testing-library/jest-dom`: used `import { expect } from 'vitest'; import * as matchers from '@testing-library/jest-dom/matchers'; expect.extend(matchers)` pattern in test-setup.ts instead of direct `import '@testing-library/jest-dom'`
- Added global `afterEach(cleanup)` in test-setup.ts to fix DOM state leakage between tests
- `@typescript-eslint/only-throw-error` conflict with plain `ApiError` objects: resolved by creating `ApiFetchError extends Error implements ApiError` class
- `import.meta.env.VITE_API_BASE_URL` typed as `any` due to vite env index signature: fixed with custom `vite-env.d.ts` that types `VITE_API_BASE_URL: string | undefined`
- `@testing-library/jest-dom` TS types: added `/// <reference types="@testing-library/jest-dom" />` in `vitest.d.ts` and `"types": ["vite/client"]` in tsconfig.json
- pnpm store migration: required `CI=true pnpm install` before package installs worked

### Completion Notes List

- All 13 tasks implemented with TDD (red-green-refactor) cycle
- 58 unit tests across 10 test files — all passing (post-review)
- TypeScript typecheck: 0 errors
- ESLint lint: 0 errors
- Components: PlaceholderRow, StatusDot, TodoRow, ErrorMessage, TodoList, AppHeader, InputArea
- Hooks: useTodos (useInfiniteQuery wrapping apiFetch)
- Lib: apiFetch (ApiFetchError class), queryClient, formatRelativeTime
- App shell composed: AppHeader → InputArea → Tabs (visual-only) → TodoList
- Mutations (toggle/delete/create) are no-ops — deferred to Stories 1.4 and 1.5 per spec

### File List

packages/frontend/index.html
packages/frontend/package.json
packages/frontend/vitest.config.ts
packages/frontend/tsconfig.json
packages/frontend/src/test-setup.ts
packages/frontend/src/vite-env.d.ts
packages/frontend/src/vitest.d.ts
packages/frontend/src/main.tsx
packages/frontend/src/app.tsx
packages/frontend/src/styles/globals.css
packages/frontend/src/components/ui/input.tsx
packages/frontend/src/components/ui/checkbox.tsx
packages/frontend/src/components/ui/button.tsx
packages/frontend/src/components/ui/tabs.tsx
packages/frontend/src/components/placeholder-row.tsx
packages/frontend/src/components/placeholder-row.test.tsx
packages/frontend/src/components/status-dot.tsx
packages/frontend/src/components/status-dot.test.tsx
packages/frontend/src/components/todo-row.tsx
packages/frontend/src/components/todo-row.test.tsx
packages/frontend/src/components/error-message.tsx
packages/frontend/src/components/error-message.test.tsx
packages/frontend/src/components/todo-list.tsx
packages/frontend/src/components/todo-list.test.tsx
packages/frontend/src/components/app-header.tsx
packages/frontend/src/components/app-header.test.tsx
packages/frontend/src/components/input-area.tsx
packages/frontend/src/components/input-area.test.tsx
packages/frontend/src/hooks/use-todos.ts
packages/frontend/src/hooks/use-todos.test.ts
packages/frontend/src/lib/api-fetch.ts
packages/frontend/src/lib/api-fetch.test.ts
packages/frontend/src/lib/query-client.ts
packages/frontend/src/lib/format-relative-time.ts
packages/frontend/src/lib/format-relative-time.test.ts
pnpm-lock.yaml

## Change Log

- 2026-03-03: Story 1.3 implemented — frontend shell, all components, useTodos hook, apiFetch wrapper, 51 unit tests passing (claude-sonnet-4-6)
- 2026-03-04: Code review fixes (claude-opus-4-6): H1 apiFetch header merge bug, H2 Load more literal quotes, H3 ErrorMessage layout restructured below row, H4 delete button mobile visibility, M1 aria-describedby linkage, M2 ul→div[role=list] for valid HTML, M3 File List updated, M4 +7 tests added (58 total)
- 2026-03-04: Visual alignment fixes (claude-sonnet-4-6): added @theme inline to globals.css to wire CSS vars to Tailwind v4 color utilities (root fix for bg-primary/bg-muted no-ops); AppHeader sort button → outline variant with ArrowUpDown icon; InputArea container bg-card, input field bg-muted/50; Tabs → full-width underline style with active border-foreground / inactive border-border; active tab bg-muted/50
