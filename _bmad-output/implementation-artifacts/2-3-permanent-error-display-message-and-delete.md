# Story 2.3: Permanent Error Display — Message & Delete

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see why my todo failed validation so I can recreate it correctly,
so that I understand what went wrong and can fix it.

## Acceptance Criteria

1. **Given** a todo is in permanent error state
   **When** the row renders
   **Then** an inline error message is displayed below the todo text (e.g., "Text exceeds maximum length")
   **And** only a delete button (x) is visible — no retry button
   **And** the error message uses 13px font in destructive color

2. **Given** a todo is in permanent error state
   **When** I click the delete button
   **Then** the row is removed from the UI with no server call (it was never confirmed)

3. **Given** a todo was in permanent error state
   **When** I delete it and recreate with valid text
   **Then** the new todo syncs successfully to confirmed state

4. **Given** the ErrorMessage component renders
   **When** the error text is displayed
   **Then** it is linked to the TodoRow via aria-describedby
   **And** it has role="alert" for screen reader announcement

## Tasks / Subtasks

- [ ] **Task 1 — Verify permanent error classification end-to-end** (AC: 1)
  - [ ] Write integration-style test: `useCreateTodo` receives 400/422 from API -> `classifyError` returns `permanent-error` + `errorMessage` -> `useTodoStates` stores entry -> `getTodoState` returns `permanent-error` -> `getErrorMessage` returns server message
  - [ ] Test: `useCreateTodo` receives 400 with `{ code: "VALIDATION_ERROR", message: "Text exceeds maximum length" }` -> errorMessage is "Text exceeds maximum length"
  - [ ] Test: `useCreateTodo` receives 422 -> classified as permanent-error (not transient)

- [ ] **Task 2 — Verify ErrorMessage rendering in TodoRow** (AC: 1, 4)
  - [ ] Verify existing test: `todo-row.test.tsx` — permanent-error state shows ErrorMessage text below todo text
  - [ ] Verify existing test: `error-message.test.tsx` — renders role="alert" with message text
  - [ ] Verify existing test: `todo-row.test.tsx` — permanent-error links error via aria-describedby
  - [ ] Add test: permanent-error without errorMessage -> ErrorMessage not rendered, no aria-describedby
  - [ ] Add test: verify 13px destructive color class is applied (`text-[13px] text-destructive`)

- [ ] **Task 3 — Verify no retry button on permanent error** (AC: 1)
  - [ ] Verify existing test: `todo-row.test.tsx` — permanent-error shows delete but no retry button
  - [ ] Add test: permanent-error with `onRetry` prop provided -> retry button still NOT rendered (only transient-error triggers retry)

- [ ] **Task 4 — Verify delete-on-permanent-error removes without server call** (AC: 2)
  - [ ] Verify existing test: `use-delete-todo.test.ts` — unconfirmed todo (wasConfirmed=false) delete calls clearTodoState, no DELETE request
  - [ ] Verify existing test: `use-delete-todo.test.ts` — unconfirmed todo delete removes row from query cache
  - [ ] Add test: permanent-error todo create -> fails with 400 -> wasConfirmed is false -> click delete -> no fetch call, row removed from cache, state cleared

- [ ] **Task 5 — Test delete-and-recreate flow** (AC: 3)
  - [ ] Add test: create todo -> fails (400 permanent) -> delete from UI -> create new todo with valid text -> server returns 201 -> todo in confirmed state
  - [ ] Verify the new todo gets a fresh UUID (crypto.randomUUID) and does not reuse the failed todo's ID

- [ ] **Task 6 — Verify all checks pass** (AC: all)
  - [ ] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [ ] `pnpm lint` passes with 0 errors
  - [ ] `pnpm --filter @todo-app/frontend test` — all unit tests green
  - [ ] `pnpm --filter @todo-app/shared test` — all shared tests green

## Dev Notes

### Current State Assessment (Post-Story 2.2)

**The permanent error display infrastructure is already fully implemented.** Stories 2.1 and 2.2 built all the plumbing as part of the general error handling system. This story is primarily about **verifying and testing** the permanent error flow end-to-end, plus filling any test gaps.

| Feature | Status | Location |
|---|---|---|
| **ErrorMessage component** | DONE | `components/error-message.tsx` — renders only for `permanent-error` state with message |
| **ErrorMessage in TodoRow** | DONE | `components/todo-row.tsx:85` — `<ErrorMessage id={errorId} state={state} message={errorMessage} />` |
| **aria-describedby linking** | DONE | `todo-row.tsx:22,28` — errorId computed + linked to row |
| **role="alert"** | DONE | `error-message.tsx:14` — `role="alert"` on the `<p>` element |
| **13px destructive styling** | DONE | `error-message.tsx:16` — `text-[13px] text-destructive pt-1 px-4 pb-2` |
| **No retry on permanent** | DONE | `todo-row.tsx:64` — retry only renders when `state === "transient-error"` |
| **Delete always visible on error** | DONE | `todo-row.tsx:80` — error rows skip hover-reveal class |
| **classifyError for permanent** | DONE | `classify-error.ts:28-29` — 400/404/422/VALIDATION_ERROR -> permanent-error + errorMessage |
| **wasConfirmed=false on create** | DONE | `use-create-todo.ts` — onMutate sets wasConfirmed: false |
| **Delete skip server for unconfirmed** | DONE | `use-delete-todo.ts` — handleDelete checks wasConfirmed before firing mutation |
| **errorMessage storage** | DONE | `use-todo-states.ts:11` — `errorMessage?: string` in TodoStateEntry |
| **getErrorMessage getter** | DONE | `use-todo-states.ts:51-54` — returns errorMessage from stateMap |
| **App wiring** | DONE | `app.tsx` — passes getErrorMessage to TodoList -> TodoRow |

### What This Story Adds

Since all implementation is in place, this story focuses on:

1. **End-to-end test coverage** for the permanent error flow (create -> 400 -> error display -> delete -> recreate)
2. **Edge case tests** for permanent error without message, permanent error with onRetry prop
3. **Verification** that existing tests adequately cover all ACs

### Permanent Error Flow (Already Working)

```
User types todo text -> submits
  -> useCreateTodo.mutate({ id: uuid(), text })
  -> optimistic insert (syncing state, wasConfirmed: false)
  -> apiFetch('POST', '/api/todos', body)
  -> Server returns 400 { code: "VALIDATION_ERROR", message: "Text exceeds maximum length" }
  -> onError: classifyError(error) -> { state: "permanent-error", errorMessage: "Text exceeds..." }
  -> setTodoState(id, { state: "permanent-error", errorMessage, wasConfirmed: false, pendingOperation })
  -> TodoRow re-renders:
     - Red background tint (bg-[hsl(var(--destructive-bg))])
     - Red static status dot
     - Checkbox frozen (disabled)
     - NO retry button (only shows for transient-error)
     - Delete button always visible
     - ErrorMessage rendered below text: "Text exceeds maximum length"
     - aria-describedby links row to error message
     - role="alert" on error message for screen readers

User clicks delete:
  -> handleDelete(id)
  -> getTodoStateEntry(id) -> wasConfirmed: false
  -> No DELETE request (never confirmed)
  -> Remove from query cache
  -> clearTodoState(id)
  -> Row disappears
```

### Files to Touch

```
packages/frontend/src/
  hooks/
    use-create-todo.test.ts         <- ADD permanent error classification tests
    use-delete-todo.test.ts         <- ADD permanent error delete flow test
  components/
    todo-row.test.tsx               <- ADD edge case tests (no message, onRetry ignored)
    error-message.test.tsx          <- ADD styling class verification test
```

**No production code changes expected.** All implementation is complete from Stories 2.1 and 2.2.

### Testing Strategy

**Framework:** Vitest 3.x + `@testing-library/react` + jsdom
**Pattern:** Explicit imports, mocked API via `test-utils/mock-api.ts`

**New Tests to Add:**

1. **`use-create-todo.test.ts`** — permanent error path:
   - Create with 400 response -> state is `permanent-error`, errorMessage populated
   - Create with 422 response -> classified as permanent (not transient)
   - Verify wasConfirmed remains false after permanent error

2. **`use-delete-todo.test.ts`** — permanent error delete:
   - Create fails (permanent) -> delete -> no server call, cache cleared
   - Delete-and-recreate flow: delete permanent error todo -> create new with valid text -> confirmed

3. **`todo-row.test.tsx`** — edge cases:
   - Permanent-error with onRetry prop: retry button NOT rendered
   - Permanent-error without errorMessage: no ErrorMessage rendered, no aria-describedby

4. **`error-message.test.tsx`** — styling:
   - Verify CSS classes: `text-[13px]`, `text-destructive`

### Key Implementation Constraints

**Do NOT:**
- Add any new production code unless a test reveals a gap
- Add retry behavior for permanent errors — permanent means "retry would fail again"
- Add confirmation dialogs — all feedback is inline per UX spec
- Change ErrorMessage component behavior — it's already correct
- Add auto-dismiss or timeout on error messages — they persist until user deletes

**DO:**
- Run existing tests first to confirm all pass
- Add tests that specifically target the permanent error ACs
- Verify wasConfirmed=false is preserved through permanent error transitions
- Test with mocked 400 and 422 responses from ApiFetchError
- Keep test patterns consistent with Story 2.2 (same test utilities, same mock patterns)

### Previous Story Learnings (from 2.2 & 2.1)

**From Story 2.2:**
- `wasConfirmed` tracking works: false on create, true on toggle/delete of confirmed todos
- `handleDelete` checks wasConfirmed before making DELETE request
- Unconfirmed delete removes from cache + clears state (no server call)
- 134 frontend + 58 shared tests pass after 2.2 + code review

**From Story 2.1:**
- `classifyError` handles both transient and permanent errors
- `errorMessage` is stored and passed through the entire chain
- ErrorMessage component, StatusDot, and TodoRow visual states all implemented
- `apiFetch` normalizes errors to `ApiFetchError` with status, code, message

**Commit convention:** `feat(impl):` prefix. Branch: `feat/02-error-handling-and-recovering-2-3`

### Project Structure Notes

- Alignment with unified project structure: all files are in expected locations per architecture.md
- No conflicts or variances detected
- Test co-location pattern maintained (`.test.ts`/`.test.tsx` next to source)

### References

- Story ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- Error classification: [Source: packages/frontend/src/lib/classify-error.ts]
- ErrorMessage component: [Source: packages/frontend/src/components/error-message.tsx]
- TodoRow error rendering: [Source: packages/frontend/src/components/todo-row.tsx]
- Todo state tracking: [Source: packages/frontend/src/hooks/use-todo-states.ts]
- Delete mutation hook: [Source: packages/frontend/src/hooks/use-delete-todo.ts]
- Create mutation hook: [Source: packages/frontend/src/hooks/use-create-todo.ts]
- App wiring: [Source: packages/frontend/src/app.tsx]
- TodoList error prop passing: [Source: packages/frontend/src/components/todo-list.tsx]
- UX error spec: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ErrorMessage]
- Architecture error handling: [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns]
- Story 2.2: [Source: _bmad-output/implementation-artifacts/2-2-transient-error-recovery-retry-and-delete.md]
- Story 2.1: [Source: _bmad-output/implementation-artifacts/2-1-error-type-classification-and-visual-states.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
