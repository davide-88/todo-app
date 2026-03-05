# Story 2.2: Transient Error Recovery — Retry & Delete

Status: ready-for-dev

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

- [ ] **Task 1 — Add `wasConfirmed` tracking to `useTodoStates`** (AC: 5, 6)
  - [ ] Extend `TodoStateEntry` to track `wasConfirmed: boolean` (default false on new todos)
  - [ ] Set `wasConfirmed: true` when todo transitions to syncing→confirmed successfully
  - [ ] Preserve `wasConfirmed` through error state transitions (e.g., syncing→transient-error keeps wasConfirmed=true)
  - [ ] Test that wasConfirmed persists across state transitions

- [ ] **Task 2 — Update `useDeleteTodo` to check `wasConfirmed`** (AC: 5, 6)
  - [ ] In `useDeleteTodo` mutation setup, check if `wasConfirmed` is true before making DELETE request
  - [ ] If `wasConfirmed=false` (never confirmed): skip DELETE request, just call `clearTodoState`
  - [ ] If `wasConfirmed=true` (previously confirmed): proceed with DELETE request (existing behavior)
  - [ ] Test both paths: unconfirmed error delete (no server call) and confirmed error delete (with server call)

- [ ] **Task 3 — Ensure retry button always visible on transient error** (AC: 1)
  - [ ] Verify `TodoRow` renders retry button (↻) when `state === "transient-error"` and `onRetry` is provided
  - [ ] Verify delete button (×) always visible on error rows (regardless of hover state)
  - [ ] Mobile: buttons always visible (no hover-reveal on mobile)
  - [ ] Desktop: error rows show retry + delete always-visible, normal rows show delete only on hover
  - [ ] Test visual states in isolation and in list context

- [ ] **Task 4 — Test retry flow end-to-end** (AC: 2, 3, 4)
  - [ ] **AC 2 test:** Click retry on transient-error → mutation fires with same UUID → row enters syncing state
  - [ ] **AC 3 test:** Retry succeeds (200/201) → syncing→confirmed transition, row becomes interactive
  - [ ] **AC 4 test:** Retry fails (5xx) → syncing→transient-error transition, retry button reappears
  - [ ] **Error recovery sequence:** Create → fails (transient) → click retry → succeeds → confirmed
  - [ ] **Repeated retries:** Retry fails multiple times → error persists, user can keep retrying
  - [ ] **Concurrent retries:** Multiple todos in transient-error, retry one → others unaffected
  - [ ] Test with mocked network (abort) and mocked API (5xx) failures

- [ ] **Task 5 — Test delete-on-error behavior (confirmed vs unconfirmed)** (AC: 5, 6)
  - [ ] **AC 5 path:** Create todo → fails immediately (never confirmed) → click delete → row removed, no DELETE request
  - [ ] **AC 6 path:** Create → succeeds (confirmed) → toggle fails (transient-error, wasConfirmed=true) → click delete → DELETE request sent, row optimistically removed
  - [ ] Test: DELETE request completes successfully → list updated
  - [ ] Test: DELETE request fails → error handling (row remains, error state updated)
  - [ ] Verify mutation cache invalidation after delete

- [ ] **Task 6 — Verify** (AC: all)
  - [ ] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [ ] `pnpm lint` passes with 0 errors
  - [ ] `pnpm --filter @todo-app/frontend test` — all unit tests green
  - [ ] `pnpm --filter @todo-app/shared test` — all shared tests green

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

// Set to true when mutation succeeds
setTodoState(id, {
  state: "confirmed",
  wasConfirmed: true, // Promoted to confirmed
});

// Preserve wasConfirmed through error transitions
setTodoState(id, {
  ...classifyError(error),
  wasConfirmed: getTodoStateEntry(id)?.wasConfirmed ?? false, // Keep existing
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
  app.tsx                           ← NO CHANGE (handleRetry already wired)
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

Claude Haiku 4.5

### Debug Log References

(To be filled after implementation)

### Completion Notes

(To be filled after implementation)

### File List

(To be filled after implementation)
