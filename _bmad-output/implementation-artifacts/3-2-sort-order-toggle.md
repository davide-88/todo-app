# Story 3.2: Sort Order Toggle

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to switch between newest-first and oldest-first ordering,
so that I can view my most recent tasks or find my oldest obligations.

## Acceptance Criteria

1. **Given** the app is loaded
   **When** the AppHeader renders
   **Then** the sort toggle button displays "↕ Newest first" (default descending order)

2. **Given** the sort is set to newest first (descending)
   **When** I click the sort toggle
   **Then** the button text changes to "↕ Oldest first"
   **And** the list clears and fetches the first page sorted ascending by createdAt

3. **Given** the sort is set to oldest first (ascending)
   **When** I click the sort toggle
   **Then** the button text changes to "↕ Newest first"
   **And** the list clears and fetches the first page sorted descending by createdAt

4. **Given** the sort preference is set
   **When** I switch between Active and Completed tabs
   **Then** the sort preference is preserved across tab switches within the session

5. **Given** the user refreshes the page
   **When** the app reloads
   **Then** the sort resets to newest first (default) — sort is session-only, not URL-persisted

## Tasks / Subtasks

- [x] **Task 1 — Write tests for sort toggle UI rendering** (AC: 1)
  - [x] Test: AppHeader renders with `sortOrder="desc"` → button shows "Newest first"
  - [x] Test: AppHeader renders with `sortOrder="asc"` → button shows "Oldest first"
  - [x] Note: These are ALREADY in `app-header.test.tsx` — verified, existing coverage is sufficient

- [x] **Task 2 — Write App-level integration tests for sort toggle** (AC: 2, 3)
  - [x] Test: App loads → `apiFetch` called with `order=desc` (default)
  - [x] Test: Click sort toggle → `apiFetch` refetches with `order=asc`
  - [x] Test: Click sort toggle again → `apiFetch` refetches with `order=desc`

- [x] **Task 3 — Write test for sort preservation across tab switches** (AC: 4)
  - [x] Test: Set sort to `asc` → switch to Completed tab → `apiFetch` called with `order=asc&status=completed`
  - [x] Test: Sort order does not reset when switching between Active and Completed tabs

- [x] **Task 4 — Write test for sort session-only behavior** (AC: 5)
  - [x] Test: Fresh App render (no URL param) → sort is `desc` — sort is NOT read from URL

- [x] **Task 5 — Verify implementation (no code changes expected)** (AC: 1–5)
  - [x] Confirm `app.tsx` already has `sortOrder` state defaulting to `"desc"`
  - [x] Confirm `useTodos` is called with `order: sortOrder` — done in Story 3.1
  - [x] Confirm `AppHeader` receives `sortOrder` and `onToggleSort` props
  - [x] Confirm `handleTabChange` does NOT reset `sortOrder`
  - [x] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [x] `pnpm lint` passes with 0 errors
  - [x] `pnpm --filter @todo-app/frontend test` — all unit tests green

## Dev Notes

### Current State Assessment (Pre-Story 3.2)

The sort order feature is **already fully implemented** as of Story 3.1. This story is primarily about writing integration tests to formally verify AC coverage.

| Feature | Status | Notes |
|---------|--------|-------|
| Sort toggle button renders | DONE | `app-header.tsx` — renders "Newest first"/"Oldest first" via `sortOrder` prop |
| `sortOrder` state in App | DONE | `app.tsx:13` — `useState<"asc" | "desc">("desc")` |
| `order: sortOrder` passed to `useTodos` | DONE | `app.tsx:22` — `useTodos({ status: activeTab, order: sortOrder })` |
| `onToggleSort` handler | DONE | `app.tsx` — `setSortOrder(o => o === "desc" ? "asc" : "desc")` |
| Sort preserved across tab switches | DONE (implicit) | `sortOrder` is independent state from `activeTab` — tab changes don't reset it |
| Sort resets on refresh | DONE (implicit) | React state only, no URL persistence (architecture constraint) |
| App-level integration test for sort | NOT DONE | `app-header.test.tsx` tests UI only; no App-level sort+status combo test |

**Net result: ~5 lines of code may be needed (if any). This is a test-writing story.**

### Key Architecture Constraints

- **Sort is session-only** — no URL persistence. Architecture doc explicitly states: "Sort preference session-only, not URL-persisted, defaults to newest-first". Do NOT add `?order=` to URL.
- **No new dependencies** — sort is already fully wired
- **Tab switch must NOT reset sort** — `handleTabChange` only calls `setActiveTab`, never `setSortOrder`

### Key Files

```
packages/frontend/src/
  app.tsx                           ← VERIFY: sortOrder state, useTodos call, onToggleSort handler
  components/app-header.tsx         ← VERIFY: no changes needed
  components/app-header.test.tsx    ← VERIFY: existing sort UI tests
  app-tab-filtering.test.tsx        ← REFERENCE: App-level test pattern to follow
  hooks/use-todos.ts                ← VERIFY: order param already handled
```

### Test Patterns to Follow

Follow the pattern from `app-tab-filtering.test.tsx` for App-level integration tests:

```tsx
vi.mock("@/lib/api-fetch.js", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-fetch.js")>("@/lib/api-fetch.js");
  return { ...actual, apiFetch: vi.fn() };
});

// Render App with fresh QueryClient + QueryClientProvider wrapper
// Use fireEvent.mouseDown for Radix UI tab interactions (onMouseDown not onClick)
// Use fireEvent.click for regular buttons (AppHeader sort toggle uses <button onClick={...}>)
// Use waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(...)) for async API calls
```

**New test file:** `packages/frontend/src/app-sort-toggle.test.tsx`

**Sort toggle interaction:** AppHeader uses a plain `<button onClick={onToggleSort}>` (NOT Radix UI), so `fireEvent.click` works directly (unlike Radix UI tabs which need `fireEvent.mouseDown`).

### What `apiFetch` URL looks like

| Sort | Status | Expected URL |
|------|--------|--------------|
| desc (default) | active (default) | `/api/todos?status=active&order=desc` |
| asc | active | `/api/todos?status=active&order=asc` |
| desc | completed | `/api/todos?status=completed&order=desc` |
| asc | completed | `/api/todos?status=completed&order=asc` |

`expect.stringContaining("order=asc")` or `expect.stringContaining("order=desc")` is sufficient for assertions.

### existing `app-header.test.tsx` coverage (Task 1)

Already covered:
- `sortOrder="desc"` → renders "Newest first" button
- `sortOrder="asc"` → renders "Oldest first" button
- click sort button → `onToggleSort` called once

**No new tests needed for Task 1.** Just verify these tests exist (they do).

### Previous Story Learnings (from Story 3.1)

- All 161 frontend tests passing after Story 3.1
- Radix UI `TabsTrigger` → use `fireEvent.mouseDown(el, { button: 0 })`; plain buttons → use `fireEvent.click`
- `afterEach` must reset URL with `window.history.replaceState({}, "", "/")` and `vi.restoreAllMocks()`
- `mockApiFetch.mockResolvedValue({ data: [], cursor: null })` in `beforeEach` for App-level tests
- Each test gets a fresh `QueryClient` via `makeQueryClient()` to avoid cache pollution

### Commit Convention

- Prefix: `feat(impl):`
- Branch: `feat/03-filtering-sorting-pagination-3-2`

### References

- Story ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- Sort state: [Source: packages/frontend/src/app.tsx:13] — `useState<"asc" | "desc">("desc")`
- Sort in useTodos: [Source: packages/frontend/src/app.tsx:22] — `useTodos({ status: activeTab, order: sortOrder })`
- AppHeader sort button: [Source: packages/frontend/src/components/app-header.tsx]
- Architecture URL strategy: [Source: _bmad-output/planning-artifacts/architecture.md] — "Sort preference session-only, not URL-persisted"
- Test pattern reference: [Source: packages/frontend/src/app-tab-filtering.test.tsx]
- Previous story: [Source: _bmad-output/implementation-artifacts/3-1-active-completed-tab-filtering.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Sort toggle was already implemented in app.tsx from Epic 1; Story 3.2 is purely test coverage
- 6 new App-level integration tests in `app-sort-toggle.test.tsx`
- Existing `app-header.test.tsx` already covers sort UI (3 tests)
- All 167 tests pass; 0 typecheck/lint errors

### File List

- `packages/frontend/src/app-sort-toggle.test.tsx` (created)

### Change Log

- 2026-03-06: Implemented Story 3.2 — wrote App-level integration tests for sort toggle
  - `app-sort-toggle.test.tsx`: 6 tests covering sort default (AC 1), sort toggle forward/back (AC 2,3), sort preserved across tabs (AC 4), sort session-only (AC 5)
  - No implementation code changes needed — sort was already fully wired in app.tsx from Story 3.1
