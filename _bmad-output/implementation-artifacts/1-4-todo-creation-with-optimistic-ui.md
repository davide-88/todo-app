# Story 1.4: Todo Creation with Optimistic UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to type a task and press Enter to see it appear instantly,
so that I can capture todos without waiting for the server.

## Acceptance Criteria

1. **Given** the input area is focused
   **When** I type todo text and press Enter (or click "Add Todo")
   **Then** the todo appears immediately at the top of the list in syncing state (blue pulsing dot, row muted/disabled)
   **And** the input clears and retains focus for the next todo
   **And** a client-generated UUID is assigned via `crypto.randomUUID()`

2. **Given** a todo is in syncing state
   **When** the server responds with 201
   **Then** the syncing dot disappears silently
   **And** the row becomes fully interactive (confirmed state)

3. **Given** a todo is in syncing state
   **When** the server responds with an error
   **Then** the todo transitions to error state visually (red accent)

4. **Given** the input field is empty or contains only whitespace
   **When** I attempt to submit
   **Then** submission is prevented
   **And** a validation error message appears below input: "Todo text is required"
   **And** the input border turns red

5. **Given** the input text exceeds maxTextLength (500 chars)
   **When** I type beyond the limit
   **Then** a validation error message appears: "Text exceeds maximum length"
   **And** the input border turns red
   **And** submission is prevented

6. **Given** a validation error is displayed
   **When** I modify the input text
   **Then** the error message clears on the next keystroke

7. **Given** I create 5 todos in rapid succession
   **When** all are submitted
   **Then** all 5 appear in the list without spinner, delay, or layout shift
   **And** each has an independent syncing state

## Tasks / Subtasks

- [x] **Task 1 — Create `useCreateTodo` mutation hook** (AC: 1, 2, 3, 7)
  - [x] Create `packages/frontend/src/hooks/use-create-todo.ts`
  - [x] Use TanStack Query `useMutation` with `onMutate` for optimistic insert
  - [x] Generate UUID via `crypto.randomUUID()` in the mutation function
  - [x] Build optimistic `Todo` object: `{ id, text, completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }`
  - [x] In `onMutate`: cancel outgoing queries, snapshot previous cache, insert optimistic todo into `['todos', ...]` infinite query pages (prepend to first page's `data` array)
  - [x] In `onError`: DO NOT rollback — keep optimistic todo in list, update per-todo UI state to error (the todo must remain visible for retry/delete per AC 3)
  - [x] In `onSuccess`: invalidate `['todos']` queries (safe — server has the todo now, refetch brings back real version). Remove todo from per-todo state map (defaults to "confirmed")
  - [x] DO NOT invalidate on error — refetch from server would remove the local-only optimistic todo
  - [x] POST to `/api/todos` via `apiFetch` with `{ id, text }` body
  - [x] Return mutation state + per-todo UI state tracking for syncing/error states
  - [x] Write `packages/frontend/src/hooks/use-create-todo.test.ts` — tests: successful create, error keeps todo in list (no rollback), optimistic insert appears in cache, multiple rapid creates, error classification (permanent vs transient)

- [x] **Task 2 — Add per-todo UI state tracking** (AC: 1, 2, 3, 7)
  - [x] Create a mechanism to track `TodoUiState` per todo ID (e.g., `Map<string, TodoUiState>` via `useState` or a local ref)
  - [x] `useCreateTodo` sets state to `"syncing"` on `onMutate`, `"confirmed"` on `onSuccess`, and `"transient-error"` or `"permanent-error"` on `onError` (classify via HTTP status from `ApiFetchError`)
  - [x] Error classification: `status >= 500 || status === 429 || code === "NETWORK_ERROR"` → transient; `status === 400 || status === 422` → permanent
  - [x] Expose `getTodoState(id): TodoUiState` function to components
  - [x] Expose `getErrorMessage(id): string | undefined` for permanent errors
  - [x] Extend `ApiFetchError` to include `status: number` property (store `response.status` in constructor) — enables robust HTTP status-based error classification and simplifies Story 2.x
  - [x] Error classification using both `status` and `code`: `status >= 500 || status === 429 || code === "NETWORK_ERROR"` → transient; `status === 400 || status === 422 || code === "VALIDATION_ERROR"` → permanent; unknown → transient (safer, user can retry)

- [x] **Task 3 — Update InputArea with validation logic** (AC: 4, 5, 6)
  - [x] Add `validationError` state (`string | null`)
  - [x] On submit attempt: if `value.trim() === ""` → set error "Todo text is required", return
  - [x] On keystroke: if `value.length > maxTextLength` → set error "Text exceeds maximum length"
  - [x] On any keystroke when error is shown → clear error (unless max length exceeded)
  - [x] Apply `border-destructive` to input when error is shown
  - [x] Render error message below input: 13px, `text-destructive`, 4px top padding
  - [x] Link error to input via `aria-describedby`
  - [x] Add `useRef<HTMLInputElement>` and call `inputRef.current?.focus()` after successful submit — ensures focus returns to input even when "Add Todo" button was clicked (Enter path retains focus naturally, but button-click path does not)
  - [x] Update `packages/frontend/src/components/input-area.test.tsx` — tests: empty submit shows error, whitespace-only submit shows error, max length error, error clears on keystroke, successful submit clears input and retains focus, aria-describedby linkage

- [x] **Task 4 — Wire useCreateTodo into App shell + update TodoList interface** (AC: 1, 2, 3, 7)
  - [x] Modify `TodoList` (`todo-list.tsx`): add `getTodoState?: (id: string) => TodoUiState` and `getErrorMessage?: (id: string) => string | undefined` to `TodoListProps` — currently hardcodes `state="confirmed"` on line 41
  - [x] In `TodoList`: pass `state={getTodoState?.(todo.id) ?? "confirmed"}` and `errorMessage={getErrorMessage?.(todo.id)}` to each `TodoRow`
  - [x] Update `todo-list.test.tsx` with tests for state/error pass-through
  - [x] In `app.tsx`: replace `handleSubmit` no-op with `useCreateTodo` mutation call
  - [x] In `app.tsx`: add per-todo state tracking (`useTodoStates` hook or local `Map` state) — design for reuse by Story 1.5 toggle/delete mutations
  - [x] Pass `getTodoState` and `getErrorMessage` to `TodoList`
  - [x] Ensure optimistic todos appear at top of list with syncing visual state

- [x] **Task 5 — Verify** (AC: all)
  - [x] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [x] `pnpm lint` passes with 0 errors
  - [x] `pnpm --filter @todo-app/frontend test` — all unit tests green
  - [ ] Manual verification: create todo → appears instantly in syncing state → settles to confirmed
  - [ ] Manual verification: rapid creation of 5 todos → all appear with independent syncing states
  - [ ] Manual verification: empty input → validation error → type text → error clears → submit works
  - [ ] Manual verification: exceed max length → validation error shown → shorten → error clears

## Dev Notes

### Current Frontend State (from Stories 1.1 + 1.2 + 1.3)

The frontend has a full component set with visual-only placeholders for mutations:

**Existing components (all tested):**
- `AppHeader` — title + sort toggle (visual-only sorting in current story)
- `InputArea` — input field + "Add Todo" button, accepts `onSubmit` prop but **mutation not wired**
- `TodoList` — renders `TodoRow[]` / `PlaceholderRow[]`, supports `role="list"`, "Load more" button
- `TodoRow` — full state rendering (confirmed, syncing, transient-error, permanent-error), accepts `onToggle`, `onDelete`, `onRetry` props
- `StatusDot` — syncing (blue pulsing), error (red static), hidden
- `ErrorMessage` — inline error below todo row, `role="alert"`, `aria-describedby`
- `PlaceholderRow` — static skeleton rows

**Existing hooks:**
- `useTodos` — `useInfiniteQuery` wrapping `GET /api/todos` via `apiFetch`, returns `{ todos, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage }`

**Existing libs:**
- `apiFetch` — fetch wrapper with error normalization (`ApiFetchError` class)
- `queryClient` — TanStack `QueryClient` with `staleTime: 0`, `retry: false`, `refetchOnWindowFocus: false`
- `formatRelativeTime` — lightweight relative time formatting

**Current app.tsx wiring:**
```typescript
// These are all no-ops — THIS STORY wires handleSubmit
const handleToggle: (id: string) => void = () => undefined;
const handleDelete: (id: string) => void = () => undefined;
const handleSubmit: (text: string) => void = () => undefined;
```

### Dependencies Already Installed (no new deps needed)

```
@tanstack/react-query: ^5.x
@todo-app/shared: workspace:*   (includes maxTextLength=500, TodoUiState, transitionTodoState, etc.)
lucide-react: ^0.475.0
react: ^19.0.0
@testing-library/react + @testing-library/jest-dom (devDependencies)
vitest: ^3.0.0
```

### Shared Package API (from `@todo-app/shared`)

```typescript
// Types
type Todo = { id: string; text: string; completed: boolean; createdAt: string; updatedAt: string }
type CreateTodo = { id: string; text: string }
type TodoListResponse = { data: Todo[]; cursor: string | null }
type ApiError = { code: string; message: string; details?: unknown }

// State machine
type TodoUiState = "confirmed" | "syncing" | "transient-error" | "permanent-error"
type TodoUiEvent = "MUTATE" | "SUCCESS" | "TRANSIENT_ERROR" | "PERMANENT_ERROR" | "RETRY"
function transitionTodoState(currentState: TodoUiState, event: TodoUiEvent): TodoUiState

// Constants
const maxTextLength = 500
const pageSize = 20
const errorCodes = { VALIDATION_ERROR, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR }
```

### ApiFetchError Shape (MUST EXTEND in this story)

Current (`api-fetch.ts`):
```typescript
class ApiFetchError extends Error implements ApiError {
  code: string;      // e.g., "VALIDATION_ERROR", "NETWORK_ERROR", "INTERNAL_ERROR"
  details?: unknown; // field-level validation errors for 400s
  // MISSING: HTTP status code
}
```

**Required change:** Add `status: number` to `ApiFetchError`. Store `response.status` in the constructor for non-ok responses. For network errors (fetch throws), use `status: 0` as sentinel.

Updated constructor: `constructor(code: string, message: string, details?: unknown, status: number = 0)`

In `apiFetch`: `throw new ApiFetchError(body.code ?? "UNKNOWN_ERROR", body.message ?? response.statusText, body.details, response.status)`

**Error classification strategy (using both status and code):**
- **Permanent:** `status === 400 || status === 422 || code === "VALIDATION_ERROR"` → permanent-error (retry would fail again)
- **Transient:** `status >= 500 || status === 429 || code === "NETWORK_ERROR" || code === "INTERNAL_ERROR" || code === "RATE_LIMITED"` → transient-error (retry may succeed)
- **Default fallback:** treat unknown errors as transient (safer — user can retry)

### useCreateTodo Hook Pattern (TanStack Query v5 Optimistic Mutation)

```typescript
// packages/frontend/src/hooks/use-create-todo.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch.js";
import type { Todo, CreateTodo, TodoListResponse } from "@todo-app/shared";

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTodo) => {
      return apiFetch<Todo>("/api/todos", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onMutate: async (input: CreateTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Snapshot previous cache for rollback
      const previousData = queryClient.getQueriesData<{ pages: { data: Todo[]; cursor: string | null }[] }>({
        queryKey: ["todos"],
      });

      // Optimistic insert: prepend to first page
      const optimisticTodo: Todo = {
        id: input.id,
        text: input.text,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<{ pages: { data: Todo[]; cursor: string | null }[]; pageParams: unknown[] }>(
        { queryKey: ["todos"] },
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            data: [optimisticTodo, ...newPages[0].data],
          };
          return { ...old, pages: newPages };
        },
      );

      return { previousData, todoId: input.id };
    },
    onSuccess: () => {
      // Server has the todo now — safe to refetch, real version replaces optimistic
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      // Update per-todo state: remove from map (defaults to "confirmed")
    },
    onError: (error, _input, context) => {
      // CRITICAL: DO NOT rollback! Keep the optimistic todo visible in error state.
      // Rollback would remove the todo — user expects to see it for retry/delete (AC 3).
      // DO NOT invalidate queries — refetch from server won't include this local-only todo.
      //
      // Instead, update per-todo UI state to error:
      // - Classify error as transient or permanent (see error classification strategy)
      // - Store error message for permanent errors
    },
  });
}
```

**CRITICAL DESIGN DECISIONS:**
1. `onMutate` uses `setQueriesData` (plural) to update ALL matching `['todos', ...]` query keys (different filter/sort variants may exist in cache). Use `getQueriesData` for snapshot.
2. `onError` must NOT rollback the optimistic insert — the todo stays in the list in error state for retry/delete.
3. `onSuccess` invalidates queries — server has the todo, refetch is safe.
4. `onError` must NOT invalidate — refetch would remove the local-only optimistic todo.
5. Previous cache snapshot from `onMutate` is NOT used for rollback on create errors — it exists only as a safety net for unexpected scenarios. For toggle/delete (Story 1.5), rollback IS needed because the original todo existed on the server.

### Per-Todo UI State Tracking Pattern

The app needs to track `TodoUiState` per todo ID to drive `TodoRow` rendering. Since TanStack Query handles the data cache, UI state (syncing, error) is a separate concern.

**Recommended approach:** Lift state to `App.tsx` via `useState<Map<string, { state: TodoUiState; errorMessage?: string }>>`:

```typescript
const [todoStates, setTodoStates] = useState<Map<string, { state: TodoUiState; errorMessage?: string }>>(new Map());

// Helper functions
const getTodoState = (id: string): TodoUiState => todoStates.get(id)?.state ?? "confirmed";
const getErrorMessage = (id: string): string | undefined => todoStates.get(id)?.errorMessage;
```

The `useCreateTodo` callbacks update this map:
- `onMutate`: set `{ state: "syncing" }` for the new todo ID
- `onSuccess`: remove entry (defaults to "confirmed")
- `onError`: set `{ state: "transient-error" | "permanent-error", errorMessage }` based on error classification

**Recommended: Create a reusable `useTodoStates()` hook** that encapsulates the `Map` and exposes `{ getTodoState, getErrorMessage, setTodoState, clearTodoState }`. Story 1.5 (toggle/delete) needs the same per-todo state tracking — a shared hook avoids duplication and ensures consistent state management across all mutation types. Place in `packages/frontend/src/hooks/use-todo-states.ts`.

### InputArea Validation Enhancement

Current `InputArea` is minimal — accepts `onSubmit` and manages `value` state. Story 1.4 adds validation:

```typescript
// packages/frontend/src/components/input-area.tsx (enhanced)
import { maxTextLength } from "@todo-app/shared";

// Add validation state
const [validationError, setValidationError] = useState<string | null>(null);

// On submit:
if (value.trim() === "") {
  setValidationError("Todo text is required");
  return;
}
if (value.length > maxTextLength) {
  setValidationError("Text exceeds maximum length");
  return;
}

// On change:
onChange={(e) => {
  const newValue = e.target.value;
  setValue(newValue);
  if (validationError) {
    setValidationError(newValue.length > maxTextLength ? "Text exceeds maximum length" : null);
  }
}}
```

**UX spec rules:**
- Validation messages: 13px, `text-destructive`, 4px top padding
- Empty/whitespace: only triggers on submit attempt (not on keystroke)
- Max length: triggers as user types past the limit
- Error clears on next keystroke (except if still over max length)
- Input border turns `border-destructive` when error shown
- `aria-describedby` links input to error message

### Testing Strategy

**Test framework:** Vitest 3.x + `@testing-library/react` + jsdom

**useCreateTodo hook tests:**
- Mock `apiFetch` via `vi.mock`
- Wrap in `QueryClientProvider` with test QueryClient
- Test: mutation inserts optimistic todo into cache (syncing state)
- Test: successful mutation → invalidates queries, todo settles to confirmed
- Test: failed mutation → todo remains in cache (NOT rolled back), transitions to error state
- Test: permanent error (400/VALIDATION_ERROR) → permanent-error state with error message
- Test: transient error (NETWORK_ERROR) → transient-error state
- Test: multiple rapid mutations each produce independent optimistic entries with independent states

**useTodoStates hook tests:**
- Test: `getTodoState` returns "confirmed" for unknown IDs
- Test: `setTodoState` updates state, `getTodoState` reflects change
- Test: `clearTodoState` removes entry
- Test: `getErrorMessage` returns message for error states

**InputArea validation tests:**
- Test: submit with empty input → error "Todo text is required"
- Test: submit with whitespace-only → same error
- Test: input exceeding maxTextLength → error "Text exceeds maximum length"
- Test: typing after error → error clears
- Test: successful submit → input clears, focus retained
- Test: error message has `role="alert"` or linked via `aria-describedby`

**Vitest config note:** `globals: false` — use explicit `import { describe, it, expect } from "vitest"`. Test setup includes `@testing-library/jest-dom` matchers via `test-setup.ts`.

### Project Structure Notes

#### Files to Create

```
packages/frontend/src/
  hooks/
    use-create-todo.ts           <- NEW (optimistic create mutation hook)
    use-create-todo.test.ts      <- NEW
    use-todo-states.ts           <- NEW (reusable per-todo UI state tracking — shared by create/toggle/delete)
    use-todo-states.test.ts      <- NEW
```

#### Files to Modify

```
packages/frontend/src/
  components/
    input-area.tsx               <- MODIFY (add validation logic, error display, aria-describedby, useRef focus)
    input-area.test.tsx          <- MODIFY (add validation tests)
    todo-list.tsx                <- MODIFY (add getTodoState/getErrorMessage props, replace hardcoded state="confirmed")
    todo-list.test.tsx           <- MODIFY (add state/error pass-through tests)
  lib/
    api-fetch.ts                 <- MODIFY (add status: number to ApiFetchError constructor)
    api-fetch.test.ts            <- MODIFY (verify status is captured on errors)
  app.tsx                        <- MODIFY (wire useCreateTodo, replace handleSubmit no-op, add per-todo state tracking)
```

#### Alignment with Project Structure

- All new files follow kebab-case naming
- Tests co-located with source (`.test.ts` suffix)
- Named exports only
- Hook pattern: one hook per concern (`useCreateTodo` for create mutation)
- No new dependencies required

### Anti-Patterns to Reject

- `export default` anywhere
- Installing `uuid` library — use `crypto.randomUUID()` (native)
- `React.FC` type annotation — use explicit props destructuring
- Direct `fetch()` calls — use `apiFetch` wrapper
- Auto-retry on mutation error — error handling is per-todo via state machine, not auto-retry
- `any` type — use `unknown` and narrow
- Global error toasts/banners — all feedback is inline and per-item
- Confirmation dialogs on submit — direct submission per UX spec

### Previous Story Learnings (from 1.1 + 1.2 + 1.3)

**From Story 1.3:**
- `@typescript-eslint/only-throw-error` conflict resolved: `ApiFetchError extends Error` (not plain object)
- `import.meta.env.VITE_API_BASE_URL` typed via custom `vite-env.d.ts`
- `@testing-library/jest-dom` types: `/// <reference types="@testing-library/jest-dom" />` in `vitest.d.ts`
- Vitest `globals: false` + explicit imports
- Global `afterEach(cleanup)` in `test-setup.ts` prevents DOM leakage between tests
- pnpm store migration: use `CI=true pnpm install` if package installs fail
- Tailwind v4 uses `@theme inline` in `globals.css` to wire CSS vars to utilities
- ESLint excludes `packages/frontend/src/components/ui/**` (shadcn vendor code)

**From Story 1.2:**
- Backend API: `POST /api/todos` accepts `{ id: uuid, text: string }`, returns full `Todo` with 201
- Upsert on conflict: same `id` → update existing (idempotent)
- Error responses: `{ code: "VALIDATION_ERROR", message: "...", details: [...] }` for 400s
- CORS configured with `CORS_ORIGIN` env var — frontend at `http://localhost:5173` must be in allowlist

**From Story 1.1:**
- TypeBox v1 uses default imports: `import Type from "typebox"` — but frontend only imports types
- `components.json` configured with aliases: `@/components/ui`, `@/lib/utils`, `@/hooks`

### Git Intelligence (recent commits)

```
4ad1489 Merge pull request #3 (Story 1.3)
f8b6c05 feat(impl): review story 1.3
354505c feat(impl): review story 1.3
0e4df7e feat(impl): dev story 1.3
75324c6 feat(impl): create dev story 1.3
```

Patterns established:
- Commit prefix: `feat(impl):`
- Branch naming: `feat/01-epic-project-foundation-story-1-X`
- PRs merged to main

### References

- Story ACs: [Source: epics.md#Story 1.4]
- InputArea spec: [Source: ux-design-specification.md#InputArea]
- Form validation patterns: [Source: ux-design-specification.md#Form Patterns]
- Feedback patterns: [Source: ux-design-specification.md#Feedback Patterns]
- Optimistic mutation pattern: [Source: architecture.md#Communication Patterns]
- useCreateTodo hook: [Source: architecture.md#Frontend Architecture — Custom hooks]
- Error handling chain: [Source: architecture.md#Process Patterns — Error handling chain]
- Error classification: [Source: architecture.md#Process Patterns — Error classification in frontend]
- Data flow — create todo: [Source: architecture.md#Data Flow — Create todo (happy path)]
- Todo state machine: [Source: shared/src/todo-state-machine.ts]
- ApiError schema: [Source: shared/src/error-schemas.ts]
- Constants (maxTextLength): [Source: shared/src/constants.ts]
- Previous story learnings: [Source: implementation-artifacts/1-3-frontend-shell-and-todo-list-display.md#Previous Story Learnings]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no major blockers.

### Completion Notes List

- Created `useCreateTodo` hook with TanStack Query `useMutation`, optimistic insert via `setQueriesData`, no-rollback on error strategy per AC 3
- Error classification: 400/422/VALIDATION_ERROR → permanent-error; all others → transient-error (safe default)
- Created `useTodoStates` hook encapsulating `Map<id, {state, errorMessage}>` — designed for reuse by Story 1.5 toggle/delete mutations
- Extended `ApiFetchError` with `status: number` field (HTTP status code, 0 for network errors) — enables robust classification, simplifies Story 2.x
- Updated `InputArea` with validation: empty/whitespace → "Todo text is required" (on submit), max-length → "Text exceeds maximum length" (on keystroke); `aria-describedby` linkage; `useRef` focus management
- Updated `TodoList` to accept optional `getTodoState`/`getErrorMessage` props, defaults to `"confirmed"` for backward compat
- Wired everything in `app.tsx`: `useTodoStates()` + `useCreateTodo()` with UUID generation via `crypto.randomUUID()`
- 93 tests passing, 0 typecheck errors, 0 lint warnings

### Code Review Notes (AI — 2026-03-04)

**Reviewer:** claude-sonnet-4-6 (adversarial review)
**Outcome:** All ACs verified as implemented. 4 MEDIUM + 2 LOW issues found and fixed.

**Fixes applied:**
- M1: Added `this.name = "ApiFetchError"` to real class (was only in test mock)
- M2: Replaced inline styles with Tailwind utilities in InputArea error message
- M3: Rewrote rapid creates test — 5 concurrent mutations instead of 2 sequential
- M4: Added dedicated test for 429 → transient-error classification
- L1: Renamed misleading `_error` → `error` in onError callback
- L2: Added `aria-invalid` attribute to input during validation error state

**Post-review:** 94 tests passing, 0 typecheck errors, 0 lint warnings

### File List

packages/frontend/src/hooks/use-create-todo.ts (NEW)
packages/frontend/src/hooks/use-create-todo.test.ts (NEW)
packages/frontend/src/hooks/use-todo-states.ts (NEW)
packages/frontend/src/hooks/use-todo-states.test.ts (NEW)
packages/frontend/src/lib/api-fetch.ts (MODIFIED — added status: number to ApiFetchError)
packages/frontend/src/lib/api-fetch.test.ts (MODIFIED — added status capture tests)
packages/frontend/src/components/input-area.tsx (MODIFIED — validation, aria-describedby, useRef focus)
packages/frontend/src/components/input-area.test.tsx (MODIFIED — added 10 validation tests)
packages/frontend/src/components/todo-list.tsx (MODIFIED — getTodoState/getErrorMessage props)
packages/frontend/src/components/todo-list.test.tsx (MODIFIED — added 3 state pass-through tests)
packages/frontend/src/app.tsx (MODIFIED — wired useCreateTodo + useTodoStates)
