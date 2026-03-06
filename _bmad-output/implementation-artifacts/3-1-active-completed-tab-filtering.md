# Story 3.1: Active/Completed Tab Filtering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to filter my todo list by active or completed status,
so that I can focus on what still needs doing or review what I've accomplished.

## Acceptance Criteria

1. **Given** the app is loaded
   **When** the page renders
   **Then** Active and Completed tabs are displayed as full-width equal tabs (shadcn Tabs component)
   **And** the Active tab is selected by default

2. **Given** the Active tab is selected
   **When** the list loads
   **Then** only active (incomplete) todos are displayed

3. **Given** the Completed tab is selected
   **When** the list loads
   **Then** only completed todos are displayed

4. **Given** the user is on the Active tab
   **When** they click the Completed tab
   **Then** the list clears and fetches the first page of completed todos
   **And** the URL updates to `?todo-status=completed` via `history.replaceState`

5. **Given** the user is on the Completed tab
   **When** they click the Active tab
   **Then** the list clears and fetches the first page of active todos
   **And** the URL updates to `?todo-status=active`

6. **Given** a URL with `?todo-status=completed`
   **When** the app loads
   **Then** the Completed tab is selected and completed todos are fetched

7. **Given** a URL with no `todo-status` param or an invalid value
   **When** the app loads
   **Then** the Active tab is selected by default

8. **Given** a todo is completed while viewing the Active tab
   **When** the toggle succeeds
   **Then** the todo is removed from the active list view (it now belongs in completed)

## Tasks / Subtasks

- [x] **Task 1 — Write tests for tab state initialization from URL** (AC: 6, 7)
  - [x] Test: `App` renders with `?todo-status=completed` → Completed tab is active, `useTodos` called with `status: "completed"`
  - [x] Test: `App` renders with no URL param → Active tab is active, `useTodos` called with `status: "active"`
  - [x] Test: `App` renders with `?todo-status=invalid` → Active tab is active (defaults gracefully)

- [x] **Task 2 — Write tests for tab switching behavior** (AC: 4, 5)
  - [x] Test: click Completed tab → `useTodos` refetches with `status: "completed"`
  - [x] Test: click Active tab → `useTodos` refetches with `status: "active"`
  - [x] Test: click Completed tab → `history.replaceState` called with URL containing `?todo-status=completed`
  - [x] Test: click Active tab → `history.replaceState` called with URL containing `?todo-status=active`

- [x] **Task 3 — Write test for todo removal on toggle success** (AC: 8)
  - [x] Test: `useToggleTodo` success calls `invalidateQueries({ queryKey: ["todos"] })` — confirms filtered query is invalidated, triggering refetch with current status

- [x] **Task 4 — Implement controlled tab state in `app.tsx`** (AC: 1, 2, 3, 6, 7)
  - [x] Read initial tab value from `new URLSearchParams(window.location.search).get('todo-status')`
  - [x] Validate parsed value — only accept `"active"` or `"completed"`, default to `"active"`
  - [x] Add `activeTab` state: `const [activeTab, setActiveTab] = useState<"active" | "completed">(initialTab)`
  - [x] Pass `status: activeTab` to `useTodos`
  - [x] Convert `<Tabs>` from uncontrolled to controlled: add `value={activeTab}` and `onValueChange` handler

- [x] **Task 5 — Implement URL sync on tab change** (AC: 4, 5)
  - [x] In `onValueChange` handler: call `history.replaceState(null, '', `?todo-status=${tab}`)` after updating state
  - [x] Validate the value is `"active" | "completed"` before calling `setActiveTab`

- [x] **Task 6 — Verify all checks pass**
  - [x] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [x] `pnpm lint` passes with 0 errors
  - [x] `pnpm --filter @todo-app/frontend test` — all unit tests green

## Dev Notes

### Current State Assessment (Pre-Story 3.1)

The Tabs component already exists in `app.tsx` as an **uncontrolled, cosmetic-only** component. It renders correctly but has no functional wiring. Here's the gap analysis:

| Feature | Status | What's Needed |
|---|---|---|
| **Tabs component rendered** | DONE | `app.tsx:65` — shadcn `<Tabs defaultValue="active">` with Active/Completed triggers |
| **`useTodos` `status` param** | DONE | `use-todos.ts:11` — already accepts `status?: "active" \| "completed"` |
| **Filtering passed to API** | NOT DONE | `app.tsx:16` — `useTodos` called with only `{ order: sortOrder }`, no `status` |
| **Controlled tab state** | NOT DONE | Tabs uses `defaultValue` (uncontrolled) — needs `value` + `onValueChange` |
| **URL sync on tab change** | NOT DONE | No `history.replaceState` call exists |
| **URL reading on init** | NOT DONE | No `window.location.search` parsing |
| **Toggle removes from filtered view** | DONE (implicit) | `useToggleTodo` `onSuccess` calls `invalidateQueries({ queryKey: ["todos"] })` — refetch with current status filter removes the todo automatically |

**Net result: This is a small, focused wiring story. Almost no new logic, just connecting existing pieces.**

### Key Implementation: `app.tsx` Changes

**Before (current):**

```tsx
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

const { todos, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
  useTodos({
    order: sortOrder,
  });
// ...
<Tabs defaultValue="active">
  <TabsList ...>
    <TabsTrigger value="active" ...>Active</TabsTrigger>
    <TabsTrigger value="completed" ...>Completed</TabsTrigger>
  </TabsList>
</Tabs>
```

**After (target):**

```tsx
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

const rawStatus = new URLSearchParams(window.location.search).get("todo-status");
const initialTab: "active" | "completed" =
  rawStatus === "completed" ? "completed" : "active";
const [activeTab, setActiveTab] = useState<"active" | "completed">(initialTab);

const { todos, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
  useTodos({
    status: activeTab,
    order: sortOrder,
  });

const handleTabChange = (value: string) => {
  if (value !== "active" && value !== "completed") return;
  setActiveTab(value);
  history.replaceState(null, "", `?todo-status=${value}`);
};
// ...
<Tabs value={activeTab} onValueChange={handleTabChange}>
  <TabsList ...>
    <TabsTrigger value="active" ...>Active</TabsTrigger>
    <TabsTrigger value="completed" ...>Completed</TabsTrigger>
  </TabsList>
</Tabs>
```

### How "Todo Removed from Active View" Works (AC 8)

No extra code needed. The mechanism is already in place:

```
User clicks checkbox on Active tab
  → useToggleTodo.mutate({ id, completed: true })
  → onMutate: optimistic update — todo.completed = true in cache (still visible, shows strikethrough + syncing dot)
  → PATCH /api/todos/:id → 200 success
  → onSuccess: queryClient.invalidateQueries({ queryKey: ["todos"] })
  → TanStack Query refetches ["todos", { status: "active", order: "desc" }]
  → API returns todos WHERE completed = false → todo no longer in response
  → Todo disappears from the active list
```

The `useToggleTodo.onSuccess` already invalidates ALL queries matching `["todos"]` (partial key match). Since the active-tab query key is `["todos", { status: "active", order: "desc" }]`, it gets invalidated and refetched with the status filter, which removes the now-completed todo.

### TanStack Query Key Strategy

Query keys include `status`, so each tab has its own cache:
- Active tab: `["todos", { status: "active", order: "desc" }]`
- Completed tab: `["todos", { status: "completed", order: "desc" }]`

Switching tabs hits TanStack Query's cache — if the completed list was fetched before, it's served instantly from cache while revalidating in background. This is the correct behavior.

### `useTodos` — No Changes Required

The hook already handles `status` correctly:

```ts
// use-todos.ts:14-19
queryFn: async ({ pageParam }) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);   // ← already there
  if (order) params.set("order", order);
  if (pageParam) params.set("cursor", pageParam);
  // ...
```

Passing `status: "active"` to `useTodos` will append `?status=active` to the API call. The backend `GET /api/todos` already supports `status` as a query param (from shared `TodoListQuery` schema).

### Backend Support (Already Implemented)

From architecture.md and `TodoListQuery` schema:
```
GET /api/todos?status=active&order=desc
GET /api/todos?status=completed&order=asc
```
The `status` param filters by `completed = false` (active) or `completed = true` (completed).

### Testing Strategy

**Framework:** Vitest 3.x + `@testing-library/react` + jsdom
**Pattern:** Mock `apiFetch`, mock `window.location`, spy on `history.replaceState`

**New test file:** `packages/frontend/src/app.test.tsx` (or `app-tab-filtering.test.tsx` — check if `app-retry.test.ts` has a companion test file pattern)

> Note: `app-retry.test.ts` already exists at `packages/frontend/src/app-retry.test.ts`. Add new tab tests to a new file `app-tab-filtering.test.tsx` or extend existing app test if one exists. If creating new, follow same wrapper pattern.

**Test patterns to follow** (from `use-todos.test.ts`):
```ts
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}
```

**Mocking `history.replaceState`:**
```ts
const replaceStateSpy = vi.spyOn(history, 'replaceState');
// assert:
expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '?todo-status=completed');
```

**Mocking `window.location.search`:**
```ts
// In test setup, set search params before rendering
Object.defineProperty(window, 'location', {
  value: { ...window.location, search: '?todo-status=completed' },
  writable: true,
});
```

### Files to Touch

```
packages/frontend/src/
  app.tsx                           ← MODIFY: add activeTab state, URL sync, wire to useTodos
  app-tab-filtering.test.tsx        ← CREATE: tab initialization and switching tests
  hooks/
    use-toggle-todo.test.ts         ← VERIFY: invalidateQueries already tested
```

**No changes expected to:**
- `use-todos.ts` — already handles `status` param
- `todo-list.tsx` — no changes needed
- `app-header.tsx` — no changes needed
- `shared` package — no schema changes
- `backend` — no changes needed

### Key Constraints

**Do NOT:**
- Add URL routing library — `history.replaceState` only (architecture decision: no client-side routing lib)
- Persist sort order to URL — sort is session-only per architecture spec
- Add `useEffect` to sync URL reactively — only update URL on explicit tab click
- Use `router.push` or Next.js-style navigation — this is a plain Vite SPA
- Filter todos on the frontend — filtering is server-side via the `status` query param
- Re-implement the `invalidateQueries` logic — it already works for the toggle-removes-from-view case

**DO:**
- Use `history.replaceState` (not `pushState`) — replaces current URL entry, no new browser history entry
- Initialize from URL param at component mount (synchronous read in `useState` initializer — no `useEffect` needed)
- Treat any invalid `todo-status` param value as `"active"` (graceful default)

### Previous Story Learnings (from Epic 2)

**From Story 2.3:**
- All 141 frontend tests passing as of last story
- Commit convention: `feat(impl):` prefix
- Branch pattern: `feat/03-filtering-sorting-pagination-3-1`
- Test patterns: explicit imports, `vi.mock` at top of file, `makeWrapper()` utility pattern
- Named exports only, no default exports
- `apiFetch` is always mocked in hook tests via `vi.mock("@/lib/api-fetch.js", ...)`

**From app-retry.test.ts pattern:**
- App-level tests render the full `<App />` component
- All hooks' API calls are mocked via `apiFetch` mock
- Check `app-retry.test.ts` for wrapper setup before creating new app test file

### Project Structure Notes

- All new test files: co-located with source (`.test.tsx` next to `.tsx`)
- File names: kebab-case (`app-tab-filtering.test.tsx`)
- Exports: named only
- `@/` alias maps to `packages/frontend/src/`

### References

- Story ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- Epic 3 context: [Source: _bmad-output/planning-artifacts/epics.md#Epic 3]
- Current Tabs implementation: [Source: packages/frontend/src/app.tsx#L65-L80]
- `useTodos` hook: [Source: packages/frontend/src/hooks/use-todos.ts]
- `useToggleTodo` invalidation: [Source: packages/frontend/src/hooks/use-toggle-todo.ts#L41-L44]
- Architecture URL strategy: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — "No client-side routing library — single-screen app, history.replaceState for query param only"
- Architecture query keys: [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — `['todos', { status, order, cursor }]`
- UX spec tab behavior: [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — "Tab state reflected in URL via ?todo-status=active|completed query parameter (history.replaceState)"
- Previous story: [Source: _bmad-output/implementation-artifacts/2-3-permanent-error-display-message-and-delete.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Radix UI `TabsTrigger` fires `onValueChange` in `onMouseDown` (not `onClick`). Tests must use `fireEvent.mouseDown(el, { button: 0 })` to trigger tab switching.

### Completion Notes List

- Wired `activeTab` state from `window.location.search` into `useTodos({ status: activeTab })`
- Converted `<Tabs>` from uncontrolled (`defaultValue`) to controlled (`value` + `onValueChange`)
- `handleTabChange` validates value then calls `setActiveTab` and `history.replaceState`
- Task 3 (`invalidateQueries`) already covered by existing `use-toggle-todo.test.ts:98`
- 7 new tests in `app-tab-filtering.test.tsx`; all 161 tests pass

### File List

- `packages/frontend/src/app.tsx` (modified)
- `packages/frontend/src/app-tab-filtering.test.tsx` (created)

### Change Log

- 2026-03-06: Implemented Story 3.1 — wired active/completed tab filtering with URL sync
  - `app.tsx`: converted Tabs to controlled component; added lazy `useState` URL initializer; wired `status: activeTab` into `useTodos`; added `handleTabChange` with `history.replaceState`
  - `app-tab-filtering.test.tsx`: 7 new tests covering URL init (AC 6,7) and tab switching (AC 4,5)
- 2026-03-06: Code review fix — refactored `rawStatus`/`initialTab` into lazy `useState` initializer to avoid redundant computation on every render
