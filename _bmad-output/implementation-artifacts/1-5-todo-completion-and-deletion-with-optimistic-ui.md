# Story 1.5: Todo Completion & Deletion with Optimistic UI

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to check off and delete todos with instant feedback,
so that I can manage my list without waiting for server confirmation.

## Acceptance Criteria

1. **Given** an active confirmed todo
   **When** I click the checkbox
   **Then** the todo immediately shows as completed (strikethrough, muted text, checked checkbox)
   **And** the row enters syncing state (blue dot, disabled)
   **And** a PATCH request is sent to toggle completed

2. **Given** a completed confirmed todo
   **When** I click the checkbox
   **Then** the todo immediately shows as active (normal text, unchecked checkbox)
   **And** the row enters syncing state
   **And** a PATCH request is sent to toggle completed

3. **Given** a confirmed todo (active or completed)
   **When** I click the delete button
   **Then** the row is immediately removed from the list
   **And** a DELETE request is sent to the server

4. **Given** a toggle or delete is in syncing state
   **When** the server responds successfully
   **Then** the syncing state resolves to confirmed
   **And** the row becomes fully interactive

5. **Given** a toggle is in syncing state
   **When** the server responds with an error
   **Then** the optimistic change is rolled back (checkbox reverts to previous state)
   **And** the todo transitions to error state

6. **Given** a delete is in syncing state
   **When** the server responds with an error
   **Then** the todo row reappears in error state

7. **Given** a todo was optimistically inserted but never confirmed by the server
   **When** the user refreshes the page
   **Then** the todo does not appear (only server-confirmed todos load from the API)

## Tasks / Subtasks

- [ ] **Task 1 — Extract shared `classifyError` utility + callback interface** (AC: 5, 6)
  - [ ] Create `packages/frontend/src/lib/classify-error.ts` with `classifyError` function extracted from `use-create-todo.ts`
  - [ ] Add `404` to permanent error classification: `error.status === 400 || error.status === 404 || error.status === 422 || error.code === "VALIDATION_ERROR"` (404 on toggle = todo deleted elsewhere, retry won't help)
  - [ ] Export `TodoMutationCallbacks` interface from same file: `{ setTodoState: (id: string, entry: { state: TodoUiState; errorMessage?: string }) => void; clearTodoState: (id: string) => void }` — shared by all three mutation hooks
  - [ ] Update `use-create-todo.ts`: remove inline `classifyError` and `CreateTodoCallbacks`, import both from `@/lib/classify-error.js`
  - [ ] Write `packages/frontend/src/lib/classify-error.test.ts` — tests: permanent (400, 404, 422, VALIDATION_ERROR), transient (500, 429, NETWORK_ERROR), unknown defaults to transient
  - [ ] Verify `use-create-todo.test.ts` still passes after refactor
  - [ ] **Import convention:** all imports use `.js` extension (e.g., `import { classifyError } from "@/lib/classify-error.js"`)

- [ ] **Task 2 — Create `useToggleTodo` mutation hook** (AC: 1, 2, 4, 5)
  - [ ] Create `packages/frontend/src/hooks/use-toggle-todo.ts`
  - [ ] Import `TodoMutationCallbacks` and `classifyError` from `@/lib/classify-error.js`
  - [ ] Accept `{ setTodoState, clearTodoState }: TodoMutationCallbacks` callbacks
  - [ ] Mutation input type: `{ id: string }` only — the hook reads current `completed` from query cache internally (avoids changing TodoRow/TodoList signatures)
  - [ ] In `onMutate`: find the todo across all cached pages, read its `completed` value, derive target `!completed`, apply optimistic update. Pass `targetCompleted` to `mutationFn` via mutation context or by restructuring the flow
  - [ ] `mutationFn`: call `apiFetch<Todo>(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify({ completed: targetCompleted }) })`
  - [ ] `onMutate`: cancel outgoing `["todos"]` queries, snapshot all pages via `getQueriesData`, optimistically toggle `completed` in all matching pages via `setQueriesData`, set `setTodoState(id, { state: "syncing" })`, return `{ previousData }` context
  - [ ] `onSuccess`: invalidate `["todos"]` queries (server has updated todo, refetch is safe), call `clearTodoState(id)`
  - [ ] `onError`: **MUST rollback** — restore `previousData` from context via `setQueriesData`, then call `setTodoState(id, classifyError(error))`. This is the CRITICAL difference from create (which does NOT rollback)
  - [ ] Write `packages/frontend/src/hooks/use-toggle-todo.test.ts`:
    - Test: optimistic toggle from `false` → `true` in cache
    - Test: optimistic toggle from `true` → `false` in cache
    - Test: successful toggle → cache invalidated, state cleared
    - Test: transient error → **rollback to previous value** + transient-error state
    - Test: permanent error (400) → **rollback to previous value** + permanent-error state with message
    - Test: error classification reuse (429 → transient, NETWORK_ERROR → transient)
    - Test: concurrent toggles on different todos → independent states

- [ ] **Task 3 — Create `useDeleteTodo` mutation hook** (AC: 3, 4, 6)
  - [ ] Create `packages/frontend/src/hooks/use-delete-todo.ts`
  - [ ] Accept `{ setTodoState, clearTodoState }` callbacks
  - [ ] Import `TodoMutationCallbacks` and `classifyError` from `@/lib/classify-error.js`
  - [ ] `mutationFn`: `await apiFetch(`/api/todos/${id}`, { method: "DELETE" })` — 204 No Content is already handled by `apiFetch` (line 44: `if (response.status === 204) return undefined as T`). No changes to `apiFetch` needed.
  - [ ] `onMutate`: cancel outgoing `["todos"]` queries, snapshot all pages via `getQueriesData`, optimistically remove todo from all pages via `setQueriesData` (filter out by id), set `setTodoState(id, { state: "syncing" })`, return `{ previousData }` context
  - [ ] `onSuccess`: invalidate `["todos"]` queries, call `clearTodoState(id)`
  - [ ] `onError`: **MUST restore** — restore `previousData` from context via `setQueriesData` (todo reappears in its original position), call `setTodoState(id, classifyError(error))`
  - [ ] Write `packages/frontend/src/hooks/use-delete-todo.test.ts`:
    - Test: optimistic removal from cache (todo gone from all pages)
    - Test: successful delete → todo stays removed, state cleared
    - Test: transient error → **todo reappears** in original position + transient-error state
    - Test: permanent error → **todo reappears** + permanent-error state with message
    - Test: delete from middle of paginated list → other items maintain position
    - Test: concurrent deletes on different todos → independent handling

- [ ] **Task 4 — Wire toggle and delete into App shell** (AC: 1, 2, 3, 4, 5, 6)
  - [ ] In `app.tsx`: import `useToggleTodo` and `useDeleteTodo`
  - [ ] Create toggle mutation: `const toggleMutation = useToggleTodo({ setTodoState, clearTodoState })`
  - [ ] Create delete mutation: `const deleteMutation = useDeleteTodo({ setTodoState, clearTodoState })`
  - [ ] Replace `handleToggle` no-op: `const handleToggle = (id: string) => { const todo = todos.find(t => t.id === id); if (todo) toggleMutation.mutate({ id, completed: !todo.completed }); }` — `todos` is already in scope from `useTodos()`
  - [ ] Replace `handleDelete` no-op: `const handleDelete = (id: string) => deleteMutation.mutate({ id })`
  - [ ] No component changes needed — `TodoList` and `TodoRow` already accept and wire `onToggle`/`onDelete` props with state pass-through

- [ ] **Task 5 — Verify** (AC: all)
  - [ ] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [ ] `pnpm lint` passes with 0 errors
  - [ ] `pnpm --filter @todo-app/frontend test` — all unit tests green (existing + new)
  - [ ] Manual verification: toggle active → completed → syncing state → confirmed
  - [ ] Manual verification: toggle completed → active → syncing state → confirmed
  - [ ] Manual verification: delete todo → row disappears immediately → stays gone
  - [ ] Manual verification: page refresh → only server-confirmed todos appear (AC 7 is satisfied by design — TanStack Query cache is in-memory only, no implementation needed)

## Dev Notes

### Current Frontend State (from Stories 1.1–1.4)

The frontend has working todo creation with optimistic UI. Toggle and delete handlers are still no-ops.

**Existing hooks:**
- `useTodos` — `useInfiniteQuery` wrapping `GET /api/todos` via `apiFetch`, returns `{ todos, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage }`
- `useCreateTodo` — `useMutation` with optimistic insert, per-todo state tracking via callbacks, NO rollback on error (create keeps optimistic todo in error state for retry/delete)
- `useTodoStates` — `Map<string, { state: TodoUiState; errorMessage?: string }>`, exposes `{ getTodoState, getErrorMessage, setTodoState, clearTodoState }`

**Existing components (all tested, no changes needed for this story):**
- `TodoRow` — full state rendering (confirmed, syncing, transient-error, permanent-error), accepts `onToggle`, `onDelete`, `onRetry` props, checkbox + delete button already wired
- `TodoList` — renders `TodoRow[]`, accepts `getTodoState`/`getErrorMessage` optional props, passes state/error to each row
- `StatusDot` — syncing (blue pulsing), error (red static), hidden for confirmed
- `ErrorMessage` — inline error below todo row, `role="alert"`, `aria-describedby`

**Current app.tsx stub handlers (lines 21-22):**
```typescript
const handleToggle: (id: string) => void = () => undefined;
const handleDelete: (id: string) => void = () => undefined;
```

### Dependencies Already Installed (no new deps needed)

```
@tanstack/react-query: ^5.x
@todo-app/shared: workspace:*
react: ^19.0.0
vitest: ^3.0.0
@testing-library/react + @testing-library/jest-dom (devDependencies)
```

### Shared Package API (from `@todo-app/shared`)

```typescript
// Types
type Todo = { id: string; text: string; completed: boolean; createdAt: string; updatedAt: string }
type UpdateTodo = { completed: boolean }
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

### Backend API Endpoints (already implemented in Story 1.2)

**PATCH /api/todos/:id** — Toggle completion
- Request body: `{ completed: boolean }`
- Success: `200` with full `Todo` object (updated `completed` + `updatedAt`)
- Not found: `404` with `{ code: "NOT_FOUND", message: "Todo not found" }`
- Invalid: `400` with `{ code: "VALIDATION_ERROR", message: "...", details: [...] }`

**DELETE /api/todos/:id** — Delete todo
- Success: `204 No Content` — empty body
- Idempotent: deleting non-existent todo returns `204` (not 404)

### ApiFetchError Shape

```typescript
class ApiFetchError extends Error implements ApiError {
  name = "ApiFetchError";
  code: string;      // e.g., "VALIDATION_ERROR", "NETWORK_ERROR"
  status: number;    // HTTP status (0 for network errors)
  details?: unknown;
}
```

### classifyError Function (currently inline in use-create-todo.ts)

```typescript
function classifyError(error: unknown): { state: TodoUiState; errorMessage?: string } {
  if (error instanceof ApiFetchError) {
    const isPermanent =
      error.status === 400 ||
      error.status === 404 ||
      error.status === 422 ||
      error.code === "VALIDATION_ERROR";
    if (isPermanent) {
      return { state: "permanent-error", errorMessage: error.message };
    }
  }
  return { state: "transient-error" };
}
```

**Changes from Story 1.4 version:** Added `error.status === 404` to permanent classification — on toggle, 404 means "todo deleted elsewhere" and retrying won't help. On delete, the backend returns 204 for non-existent todos (idempotent), so 404 never occurs there.

**This story extracts it to `packages/frontend/src/lib/classify-error.ts`** alongside `TodoMutationCallbacks` interface for reuse across create/toggle/delete hooks.

### CRITICAL: Rollback Behavior Differences by Mutation Type

| Mutation | On Error: Rollback? | On Error: Keep in List? | Rationale |
|---|---|---|---|
| **Create** | NO rollback | YES (keep optimistic todo) | User expects to see and retry/delete the failed todo |
| **Toggle** | YES rollback | YES (revert to pre-toggle state) | Checkbox must revert; todo remains visible in error state |
| **Delete** | YES restore | YES (todo reappears) | Deleted todo must come back in error state for retry/delete |

### useToggleTodo Hook Pattern

The mutation accepts only `{ id: string }`. The current `completed` value is read from the query cache inside `onMutate` — this avoids changing `TodoRow`/`TodoList` signatures (they call `onToggle(todo.id)`).

The inline type for `getQueriesData`/`setQueriesData` must match the existing pattern from `use-create-todo.ts` (inline type literal, NOT `InfiniteData` import):

```typescript
type TodoPage = { data: Todo[]; cursor: string | null };
type TodoInfiniteData = { pages: TodoPage[]; pageParams: unknown[] };

export function useToggleTodo({ setTodoState, clearTodoState }: TodoMutationCallbacks) {
  const queryClient = useQueryClient();

  // Helper: find a todo's current completed value from cache
  const findTodoCompleted = (id: string): boolean | undefined => {
    const queries = queryClient.getQueriesData<TodoInfiniteData>({ queryKey: ["todos"] });
    for (const [, data] of queries) {
      if (!data) continue;
      for (const page of data.pages) {
        const todo = page.data.find((t) => t.id === id);
        if (todo) return todo.completed;
      }
    }
    return undefined;
  };

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      return apiFetch<Todo>(`/api/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousData = queryClient.getQueriesData<TodoInfiniteData>({ queryKey: ["todos"] });

      // Read current completed, derive target
      const currentCompleted = findTodoCompleted(id);
      const targetCompleted = currentCompleted !== undefined ? !currentCompleted : true;

      // Optimistic: toggle completed in all matching pages
      queryClient.setQueriesData<TodoInfiniteData>({ queryKey: ["todos"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((todo) =>
              todo.id === id ? { ...todo, completed: targetCompleted } : todo,
            ),
          })),
        };
      });

      setTodoState(id, { state: "syncing" });
      return { previousData, targetCompleted };
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      clearTodoState(id);
    },
    onError: (error, { id }, context) => {
      // MUST rollback — restore previous cache
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          if (data) queryClient.setQueryData(queryKey, data);
        }
      }
      setTodoState(id, classifyError(error));
    },
  });
}
```

**NOTE:** The `mutate` call from `app.tsx` passes `{ id }` only. The `onMutate` reads the current value from cache, derives the target, and stores `targetCompleted` in context. The `mutationFn` receives `{ id, completed }` from the mutation variables — but since `onMutate` runs BEFORE `mutationFn` in TanStack Query, the actual PATCH body value must come from the mutation input. **Resolution:** The caller (`app.tsx`) must pass `{ id, completed: targetCompleted }`. Since `handleToggle` only receives `id`, the app must look up the todo. Two clean options:
1. `const handleToggle = (id: string) => { const todo = todos.find(t => t.id === id); if (todo) toggleMutation.mutate({ id, completed: !todo.completed }); }`
2. Restructure the hook so `mutationFn` reads from `onMutate` context

**Recommended: Option 1** — simpler, explicit, `todos` array is already available in `app.tsx` scope.

### useDeleteTodo Hook Pattern

Uses the same `TodoInfiniteData` type alias and `TodoMutationCallbacks` interface as `useToggleTodo`.

```typescript
export function useDeleteTodo({ setTodoState, clearTodoState }: TodoMutationCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await apiFetch(`/api/todos/${id}`, { method: "DELETE" });
      // 204 No Content — apiFetch already returns undefined for 204 (line 44 of api-fetch.ts)
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousData = queryClient.getQueriesData<TodoInfiniteData>({ queryKey: ["todos"] });

      // Optimistic: remove from all pages
      queryClient.setQueriesData<TodoInfiniteData>({ queryKey: ["todos"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((todo) => todo.id !== id),
          })),
        };
      });

      setTodoState(id, { state: "syncing" });
      return { previousData };
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      clearTodoState(id);
    },
    onError: (error, { id }, context) => {
      // MUST restore — todo reappears in original position
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          if (data) queryClient.setQueryData(queryKey, data);
        }
      }
      setTodoState(id, classifyError(error));
    },
  });
}
```

### apiFetch 204 Handling — Already Solved

`apiFetch` already handles 204 at line 44: `if (response.status === 204) return undefined as T;`. This is tested in `api-fetch.test.ts`. **No changes to `apiFetch` needed in this story.**

### Testing Strategy

**Test framework:** Vitest 3.x + `@testing-library/react` + jsdom

**Pattern from Story 1.4 tests (use-create-todo.test.ts):**
- Mock `apiFetch` via `vi.mock("@/lib/api-fetch.js", ...)`
- Create `QueryClient` with `retry: false` for each test
- Wrap in `QueryClientProvider`
- Use `renderHook` with wrapper
- Set initial query data via `queryClient.setQueryData(["todos", ...], { pages: [...], pageParams: [...] })`
- Assert cache state after mutation via `queryClient.getQueryData`

**Vitest config note:** `globals: false` — use explicit `import { describe, it, expect } from "vitest"`. Test setup includes `@testing-library/jest-dom` matchers.

### Project Structure Notes

#### Files to Create

```
packages/frontend/src/
  lib/
    classify-error.ts              <- NEW (extracted from use-create-todo.ts)
    classify-error.test.ts         <- NEW
  hooks/
    use-toggle-todo.ts             <- NEW (optimistic toggle mutation hook)
    use-toggle-todo.test.ts        <- NEW
    use-delete-todo.ts             <- NEW (optimistic delete mutation hook)
    use-delete-todo.test.ts        <- NEW
```

#### Files to Modify

```
packages/frontend/src/
  hooks/
    use-create-todo.ts             <- MODIFY (remove inline classifyError + CreateTodoCallbacks, import from @/lib/classify-error.js)
  app.tsx                          <- MODIFY (wire useToggleTodo + useDeleteTodo, replace no-op handlers)
```

#### Files NOT Changed (already fully wired)

```
packages/frontend/src/
  components/
    todo-row.tsx                   <- NO CHANGE (already accepts onToggle/onDelete, handles all states)
    todo-row.test.tsx              <- NO CHANGE
    todo-list.tsx                  <- NO CHANGE (already passes handlers and state getters)
    todo-list.test.tsx             <- NO CHANGE
    status-dot.tsx                 <- NO CHANGE
    error-message.tsx              <- NO CHANGE
```

#### Alignment with Project Structure

- All new files follow kebab-case naming
- Tests co-located with source (`.test.ts` suffix)
- Named exports only
- Hook pattern: one hook per concern (`useToggleTodo` for toggle, `useDeleteTodo` for delete)
- No new dependencies required

### Anti-Patterns to Reject

- `export default` anywhere
- Direct `fetch()` calls — use `apiFetch` wrapper
- Auto-retry on mutation error — error handling is per-todo via state machine
- `any` type — use `unknown` and narrow
- Changing `TodoRow`/`TodoList` component signatures — they already support all needed props
- Confirmation dialogs on delete — direct deletion per UX spec
- Global error toasts/banners — all feedback is inline and per-item
- Rolling back create mutations on error — create keeps optimistic todo visible (AC from Story 1.4)
- NOT rolling back toggle/delete on error — these MUST rollback (AC from Story 1.5)
- Omitting `.js` extension in imports — all imports in codebase use `.js` extension (e.g., `from "@/lib/classify-error.js"`)
- Importing `InfiniteData` from `@tanstack/react-query` — use inline type alias `TodoInfiniteData` matching existing `use-create-todo.ts` pattern

### Previous Story Learnings (from 1.1–1.4)

**From Story 1.4 (directly relevant):**
- `classifyError` pattern: `status === 400 || status === 422 || code === "VALIDATION_ERROR"` → permanent; all others → transient (safe default: retry-friendly)
- `useTodoStates` hook: `Map<string, { state: TodoUiState; errorMessage?: string }>` — already reusable by toggle/delete mutations, no changes needed
- `ApiFetchError` has `status: number` field (added in 1.4) — enables robust HTTP status-based error classification
- `onMutate` pattern: use `getQueriesData` (plural) to snapshot ALL matching query keys, `setQueriesData` (plural) to update across all pages
- Commit prefix: `feat(impl):`
- Branch naming: `feat/01-epic-project-foundation-story-1-X`

**From Story 1.4 code review:**
- `ApiFetchError` has `this.name = "ApiFetchError"` (fixed in review)
- Tailwind utilities preferred over inline styles
- `aria-invalid` added to input during validation error state

**From Story 1.3:**
- `@typescript-eslint/only-throw-error` — only `Error` subclasses can be thrown
- Vitest `globals: false` + explicit imports
- Global `afterEach(cleanup)` in `test-setup.ts`
- ESLint excludes `packages/frontend/src/components/ui/**`

**From Story 1.2:**
- Backend PATCH endpoint: `PATCH /api/todos/:id` with `{ completed: boolean }` body, returns full `Todo` with 200
- Backend DELETE endpoint: `DELETE /api/todos/:id` returns 204 No Content, idempotent (204 even if not found)
- Error responses: `{ code: "NOT_FOUND", message: "..." }` for 404

### Git Intelligence (recent commits)

```
d3fa7b5 Merge pull request #4 (Story 1.4)
d7bfe2f feat(impl): dev + review story 1.4
3fcb0bc feat(impl): create dev story 1.4
4ad1489 Merge pull request #3 (Story 1.3)
f8b6c05 feat(impl): review story 1.3
```

Patterns established:
- Commit prefix: `feat(impl):`
- Branch naming: `feat/01-epic-project-foundation-story-1-X`
- PRs merged to main
- Story files are created/modified, then dev + review story

### References

- Story ACs: [Source: epics.md#Story 1.5]
- TodoRow component: [Source: frontend/src/components/todo-row.tsx]
- TodoList component: [Source: frontend/src/components/todo-list.tsx]
- useCreateTodo hook (pattern reference): [Source: frontend/src/hooks/use-create-todo.ts]
- useTodoStates hook: [Source: frontend/src/hooks/use-todo-states.ts]
- useTodos hook (query key/cache structure): [Source: frontend/src/hooks/use-todos.ts]
- apiFetch wrapper: [Source: frontend/src/lib/api-fetch.ts]
- Backend PATCH endpoint: [Source: backend/src/routes/todos.ts#PATCH]
- Backend DELETE endpoint: [Source: backend/src/routes/todos.ts#DELETE]
- TodoRepository interface: [Source: backend/src/lib/todo-repository.ts]
- Optimistic mutation pattern: [Source: architecture.md#Communication Patterns]
- Error classification: [Source: architecture.md#Process Patterns — Error classification in frontend]
- Data flow — toggle/delete: [Source: architecture.md#Data Flow]
- Todo state machine: [Source: shared/src/todo-state-machine.ts]
- UpdateTodo schema: [Source: shared/src/todo-schemas.ts]
- Previous story learnings: [Source: implementation-artifacts/1-4-todo-creation-with-optimistic-ui.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
