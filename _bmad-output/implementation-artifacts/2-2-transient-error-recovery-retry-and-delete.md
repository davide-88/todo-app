# Story 2.2: Transient Error Recovery — Retry & Delete

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to retry a failed todo when the network recovers,
so that I don't lose my data due to temporary connectivity issues.

## Acceptance Criteria

1. **Given** a todo is in transient error state
   **When** the row renders
   **Then** a retry button (↻) and a delete button (×) are both visible (always visible, not hover-reveal)

2. **Given** a todo is in transient error state
   **When** I click the retry button
   **Then** the todo transitions to syncing state (blue dot, row disabled)
   **And** the same UUID is used for the retry request (idempotent upsert)

3. **Given** a retry is in syncing state
   **When** the server responds successfully
   **Then** the todo transitions to confirmed state (interactive, no dot)

4. **Given** a retry is in syncing state
   **When** the server responds with another error
   **Then** the todo returns to transient error state with retry and delete still available

5. **Given** a todo is in transient error state
   **When** I click the delete button
   **And** the todo was never confirmed by the server
   **Then** the row is removed from the UI with no server call

6. **Given** a todo is in transient error state
   **When** I click the delete button
   **And** the todo was previously confirmed by the server
   **Then** a DELETE request is sent to the server
   **And** the row is optimistically removed

## Tasks / Subtasks

- [x] **Task 1 — Add `wasConfirmed` tracking to `useTodoStates`** (AC: 5, 6)
  - [x] Extend `TodoStateEntry` to track `wasConfirmed: boolean` (default false on new todos)
  - [x] Set `wasConfirmed: true` when todo transitions to syncing→confirmed successfully
  - [x] Preserve `wasConfirmed` through error state transitions (e.g., syncing→transient-error keeps wasConfirmed=true)
  - [x] Test that wasConfirmed persists across state transitions

- [x] **Task 2 — Update `useDeleteTodo` to check `wasConfirmed`** (AC: 5, 6)
  - [x] In `useDeleteTodo` mutation setup, check if `wasConfirmed` is true before making DELETE request
  - [x] If `wasConfirmed=false` (never confirmed): skip DELETE request, just call `clearTodoState`
  - [x] If `wasConfirmed=true` (previously confirmed): proceed with DELETE request (existing behavior)
  - [x] Test both paths: unconfirmed error delete (no server call) and confirmed error delete (with server call)

- [x] **Task 3 — Ensure retry button always visible on transient error** (AC: 1)
  - [x] Verify `TodoRow` renders retry button (↻) when `state === "transient-error"` and `onRetry` is provided
  - [x] Verify delete button (×) always visible on error rows (regardless of hover state)
  - [x] Mobile: buttons always visible (no hover-reveal on mobile)
  - [x] Desktop: error rows show retry + delete always-visible, normal rows show delete only on hover
  - [x] Test visual states in isolation and in list context

- [x] **Task 4 — Test retry flow end-to-end** (AC: 2, 3, 4)
  - [x] **AC 2 test:** Click retry on transient-error → mutation fires with same UUID → row enters syncing state
  - [x] **AC 3 test:** Retry succeeds (200/201) → syncing→confirmed transition, row becomes interactive
  - [x] **AC 4 test:** Retry fails (5xx) → syncing→transient-error transition, retry button reappears
  - [x] **Error recovery sequence:** Create → fails (transient) → click retry → succeeds → confirmed
  - [x] **Repeated retries:** Retry fails multiple times → error persists, user can keep retrying
  - [x] **Concurrent retries:** Multiple todos in transient-error, retry one → others unaffected
  - [x] Test with mocked network (abort) and mocked API (5xx) failures

- [x] **Task 5 — Test delete-on-error behavior (confirmed vs unconfirmed)** (AC: 5, 6)
  - [x] **AC 5 path:** Create todo → fails immediately (never confirmed) → click delete → row removed, no DELETE request
  - [x] **AC 6 path:** Create → succeeds (confirmed) → toggle fails (transient-error, wasConfirmed=true) → click delete → DELETE request sent, row optimistically removed
  - [x] Test: DELETE request completes successfully → list updated
  - [x] Test: DELETE request fails → error handling (row remains, error state updated)
  - [x] Verify mutation cache invalidation after delete

- [x] **Task 6 — Verify** (AC: all)
  - [x] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [x] `pnpm lint` passes with 0 errors
  - [x] `pnpm --filter @todo-app/frontend test` — all unit tests green
  - [x] `pnpm --filter @todo-app/shared test` — all shared tests green

## Dev Notes

### Current State Assessment (Post-Story 2.1)

**Story 2.1 completed:** Retry handler wiring is done. The `app.tsx` `handleRetry` function exists and re-invokes mutations with stored `pendingOperation`. However, Story 2.2 has **two critical gaps**:

| Feature | Status | What's Missing |
|---|---|---|
| **Retry button visibility** | DONE | Already renders on transient-error when `onRetry` prop provided. |
| **Delete button on error rows** | DONE | Already always-visible in TodoRow (no hover-reveal on error). |
| **Retry mutation flow** | PARTIAL | `handleRetry` exists, but **needs wasConfirmed tracking**. |
| **Delete unconfirmed error todo** | MISSING | Delete always sends DELETE request, even for never-confirmed todos. Should be client-side only. |
| **Delete confirmed error todo** | DONE | Existing `useDeleteTodo` already handles DELETE requests for confirmed todos. |
| **wasConfirmed persistence** | MISSING | No tracking of whether a todo was ever successfully synced to server. |

### Critical Gap: `wasConfirmed` Tracking

**The problem:** When a todo fails before confirming (e.g., create request times out), and user clicks delete, the current code sends a DELETE request to the server. But the todo was never on the server — the DELETE returns 204 (idempotent), but it's an unnecessary request and muddles the intent.

**The solution:** Extend `TodoStateEntry` to track `wasConfirmed: boolean`:

```typescript
// In use-todo-states.ts
interface TodoStateEntry {
  state: TodoUiState;
  errorMessage?: string;
  pendingOperation?: PendingOperation;
  wasConfirmed: boolean; // NEW: track if ever successfully synced
}

// Initialize new entries with wasConfirmed: false
const newEntry: TodoStateEntry = {
  state: "syncing",
  wasConfirmed: false,
  pendingOperation: { type: "create", args: { id, text } },
};

// On success: clear state entirely (getTodoState defaults to "confirmed" for unknown IDs)
clearTodoState(id);

// Preserve wasConfirmed through error transitions (setTodoState auto-preserves if omitted)
setTodoState(id, {
  ...classifyError(error),
  wasConfirmed: true, // or false for create — explicitly set per hook
  pendingOperation: { type: "toggle", args: { id, completed } },
});
```

### Implementation Pattern: useDeleteTodo Conditional DELETE

In `use-delete-todo.ts`, **before** calling `deleteMutation.mutate()`, check `wasConfirmed`:

```typescript
const handleDelete = (id: string) => {
  const entry = getTodoStateEntry(id);

  // Never-confirmed unsynced todo: no DELETE request needed
  if (!entry?.wasConfirmed) {
    clearTodoState(id); // Just remove from UI
    return;
  }

  // Previously confirmed todo: send DELETE request
  deleteMutation.mutate({ id });
};
```

This satisfies both AC 5 (unconfirmed → no server call) and AC 6 (confirmed → DELETE request).

### Dependency on Story 2.1

Story 2.1 completed the following prerequisites:
- `apiFetch` with timeout handling
- `classifyError` classification (transient vs permanent)
- `handleRetry` wiring in `app.tsx`
- `pendingOperation` storage in `useTodoStates`
- All 3 mutation hooks store operation context on error
- TodoRow render behavior for retry/delete button visibility

**This story builds on:** Error classification, pendingOperation context, and handleRetry wiring. No dependencies on permanent-error handling (Story 2.3).

### State Machine Flow (Retry & Delete)

```
confirmed
  ↓ (MUTATE: toggle/delete)
syncing ← confirmed todo
  ↓ (network error)
transient-error (wasConfirmed=true, pendingOperation stored)
  ├─ click retry → (RETRY event) → syncing (re-invoke mutation with same UUID)
  │                ├─ success (SUCCESS) → confirmed
  │                └─ error (TRANSIENT_ERROR) → transient-error (retry again)
  └─ click delete → (DELETE event) → DELETE request → removed

unconfirmed
  ↓ (MUTATE: create)
syncing ← NEW todo
  ↓ (network error)
transient-error (wasConfirmed=false, pendingOperation stored)
  ├─ click retry → (RETRY event) → syncing (re-invoke with same UUID)
  │                ├─ success (SUCCESS) → confirmed (wasConfirmed=true)
  │                └─ error (TRANSIENT_ERROR) → transient-error (retry again)
  └─ click delete → (DELETE event) → no server call, UI cleared
```

### Files to Modify

```
packages/frontend/src/
  hooks/
    use-todo-states.ts              ← MODIFY (add wasConfirmed tracking, getter)
    use-todo-states.test.ts         ← MODIFY (test wasConfirmed persistence)
    use-delete-todo.ts              ← MODIFY (check wasConfirmed before DELETE)
    use-delete-todo.test.ts         ← MODIFY (test both unconfirmed/confirmed delete paths)
    use-toggle-todo.ts              ← MODIFY (set wasConfirmed: true on success)
    use-toggle-todo.test.ts         ← MODIFY (verify wasConfirmed in success case)
    use-create-todo.ts              ← MODIFY (set wasConfirmed: true on success)
    use-create-todo.test.ts         ← MODIFY (verify wasConfirmed in success case)
  components/
    todo-row.tsx                    ← NO CHANGE (retry button already visible)
    todo-row.test.tsx               ← MODIFY (test error row button visibility)
  app.tsx                           ← MODIFY (wire handleRetry, handleDelete via wrapper, pass onRetry)
```

### Testing Strategy

**Framework:** Vitest 3.x + `@testing-library/react` + jsdom
**Pattern:** Explicit imports, mocked API via `test-utils/mock-api.ts`

**New/Modified Tests:**

1. **`use-todo-states.test.ts`** — wasConfirmed tracking:
   - `setTodoState` initializes new entry with `wasConfirmed: false`
   - Success transition: sets `wasConfirmed: true`
   - Error transition: preserves existing `wasConfirmed` value
   - `getTodoStateEntry` returns full entry with wasConfirmed

2. **`use-delete-todo.test.ts`** — conditional DELETE:
   - Unconfirmed todo (wasConfirmed=false) deleted: no DELETE request, clearTodoState called
   - Confirmed todo (wasConfirmed=true) deleted: DELETE request sent, optimistic removal
   - DELETE request success: todo removed from list
   - DELETE request failure: todo remains with updated error state

3. **`use-toggle-todo.test.ts`** — wasConfirmed on success:
   - Toggle success: sets `wasConfirmed: true` in success callback
   - Toggle failure on confirmed todo: preserves `wasConfirmed: true` through error

4. **`use-create-todo.test.ts`** — wasConfirmed on success:
   - Create success: sets `wasConfirmed: true`
   - Create failure (never confirmed): keeps `wasConfirmed: false`

5. **`todo-row.test.tsx`** — button visibility on error:
   - Transient-error state: retry button visible (if onRetry provided), delete always visible
   - Permanent-error state: delete only, no retry button
   - Normal/syncing rows: existing visibility rules (delete on hover desktop, always on mobile)

### Key Implementation Constraints

**Do NOT:**
- Auto-retry with exponential backoff — retry is user-initiated per UX spec
- Change component signatures for TodoRow/TodoList — they already support needed props
- Add confirmation dialogs — all feedback inline per UX spec
- Use `any` type — use `unknown` and narrow
- Export default anything — use named exports only

**DO:**
- Use native `crypto.randomUUID()` for client UUID (no library needed)
- Store `wasConfirmed` as part of `TodoStateEntry` in `useTodoStates`
- Check `wasConfirmed` in `useDeleteTodo` before calling mutation
- Preserve `wasConfirmed` through error transitions
- Use existing `getTodoStateEntry` from Story 2.1
- Test with mocked API errors (abort, 5xx, 429, network)
- Keep `pendingOperation` behavior unchanged from Story 2.1

### Previous Story Learnings (from 2.1 & Epic 1)

**From Story 2.1:**
- `handleRetry` reads `pendingOperation` and re-invokes mutations
- `getTodoStateEntry` returns full `TodoStateEntry` (added in 2.1)
- `pendingOperation` stores mutation type + original args
- Retry button only renders when `onRetry` prop + `state === "transient-error"`

**From Story 1.5:**
- `classifyError` pattern: shared by all mutation hooks
- Rollback behavior: create=no rollback, toggle/delete=optimistic removal then error state
- `TodoMutationCallbacks` interface for state updates
- Test utilities: `MockApiFetchError`, `makeQueryClient`, `makeWrapper`

**Commit convention:** `feat(impl):` prefix. Branch: `feat/02-error-handling-and-recovering-story-2-2`

### References

- Story ACs: [Source: epics.md#Story 2.2]
- Transient error state: [Source: implementation-artifacts/2-1-error-type-classification-and-visual-states.md]
- Retry handler wiring: [Source: implementation-artifacts/2-1-error-type-classification-and-visual-states.md#Gap 2]
- Todo state tracking: [Source: frontend/src/hooks/use-todo-states.ts]
- Delete mutation hook: [Source: frontend/src/hooks/use-delete-todo.ts]
- Toggle mutation hook: [Source: frontend/src/hooks/use-toggle-todo.ts]
- Create mutation hook: [Source: frontend/src/hooks/use-create-todo.ts]
- TodoRow component: [Source: frontend/src/components/todo-row.tsx]
- App shell: [Source: frontend/src/app.tsx]
- UX error recovery: [Source: ux-design-specification.md#Transient Error Recovery]
- Architecture error handling: [Source: architecture.md#API & Communication Patterns]
- Story 2.1: [Source: implementation-artifacts/2-1-error-type-classification-and-visual-states.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Story 2.1 was listed as `backlog` in sprint-status but its visual/classification work (classifyError, TodoRow retry button, apiFetch) was already implemented. The `pendingOperation` and `handleRetry` wiring described as "done in 2.1" were NOT present and were implemented here.
- `useDeleteTodo` `handleDelete` exposes a named wrapper (not replacing `mutate`) to preserve backwards-compatible internal mutation access for retry-of-delete use case in `handleRetry`.

### Completion Notes

- Added `PendingOperation` union type and `wasConfirmed: boolean` to `TodoStateEntry` in `use-todo-states.ts`; added `getTodoStateEntry` getter
- Updated `TodoMutationCallbacks.setTodoState` in `classify-error.ts` to accept optional `wasConfirmed` and `pendingOperation` fields
- `useCreateTodo`: onMutate sets `wasConfirmed: false` + `pendingOperation`; onError preserves both
- `useToggleTodo`: onMutate sets `wasConfirmed: true` + `pendingOperation`; onError preserves both
- `useDeleteTodo`: onMutate sets `wasConfirmed: true` + `pendingOperation`; onError preserves both; new `handleDelete` wrapper checks `wasConfirmed` before firing DELETE
- `app.tsx`: wired `handleRetry` (reads `pendingOperation`, re-invokes correct mutation), `handleDelete` now calls `deleteMutation.handleDelete`, `onRetry={handleRetry}` passed to TodoList
- All 6 ACs satisfied; 132 frontend tests + 58 shared tests pass; typecheck and lint clean

### File List

- `packages/frontend/src/hooks/use-todo-states.ts`
- `packages/frontend/src/hooks/use-todo-states.test.ts`
- `packages/frontend/src/hooks/use-delete-todo.ts`
- `packages/frontend/src/hooks/use-delete-todo.test.ts`
- `packages/frontend/src/hooks/use-toggle-todo.ts`
- `packages/frontend/src/hooks/use-toggle-todo.test.ts`
- `packages/frontend/src/hooks/use-create-todo.ts`
- `packages/frontend/src/hooks/use-create-todo.test.ts`
- `packages/frontend/src/components/todo-row.test.tsx`
- `packages/frontend/src/lib/classify-error.ts`
- `packages/frontend/src/app.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-06: Implemented Story 2.2 — transient error recovery (retry & delete). Added wasConfirmed tracking, pendingOperation storage, handleRetry wiring, and conditional DELETE logic.
- 2026-03-06: **Code Review (Claude Opus 4.6)** — Found 7 issues (1 Critical, 2 High, 2 Medium, 2 Low). Fixed 5:
  - [CRITICAL] AC 5 violation: unconfirmed delete now removes optimistic entry from query cache (was ghost row bug)
  - [HIGH] handleRetry for delete now routes through handleDelete wrapper (wasConfirmed safety check)
  - [MEDIUM] setTodoState preserves previous wasConfirmed when not explicitly provided
  - [MEDIUM] classifyError now includes errorMessage for transient errors (diagnostic info)
  - [LOW] Fixed story "Files to Modify" section: app.tsx correctly listed as MODIFY
  - [LOW] Fixed Dev Notes code sample: success path uses clearTodoState (not setTodoState with wasConfirmed: true)
  - 134 frontend + 58 shared tests pass.
