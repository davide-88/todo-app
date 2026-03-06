# Story 3.3: Cursor-Based Pagination

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to load more todos as I browse a large list,
so that the app stays fast regardless of how many todos I have.

## Acceptance Criteria

1. **Given** the first page of todos is loaded and more pages exist
   **When** the list renders
   **Then** a "Load more" button is visible at the bottom of the list

2. **Given** the "Load more" button is visible
   **When** I click it
   **Then** the button shows a loading state (disabled, text change)
   **And** the next page is fetched using the cursor from the last item's createdAt (base64-encoded)
   **And** new rows are appended below existing rows

3. **Given** the next page is loaded
   **When** more pages still exist
   **Then** the "Load more" button remains visible

4. **Given** the last page is loaded (no more items)
   **When** the response cursor is null
   **Then** the "Load more" button is hidden

5. **Given** I delete a todo from the middle of a paginated list
   **When** the deletion completes
   **Then** the remaining items stay in their current positions
   **And** no re-fetch of existing pages occurs
   **And** the list does not jump or shift

6. **Given** I complete a todo while viewing a paginated active list
   **When** the toggle succeeds
   **Then** the todo is removed from the view without disrupting pagination position

7. **Given** I switch tabs or toggle sort order
   **When** the new view loads
   **Then** pagination resets to the first page with a fresh cursor

## Tasks / Subtasks

- [x] **Task 1 — Write tests for pagination ACs 1–4 (Load more behavior)** (AC: 1, 2, 3, 4)
  - [x] Test: `useTodos` with cursor in response → `hasNextPage=true` (already in use-todos.test.ts)
  - [x] Test: `useTodos` with `cursor: null` → `hasNextPage=false` (already in use-todos.test.ts)
  - [x] Test: `fetchNextPage` appends page 2 data after page 1 (new test in use-todos.test.ts)
  - [x] Test: `fetchNextPage` passes cursor as query param to `apiFetch` (new test in use-todos.test.ts)
  - [x] AC 1 ("Load more" button visible), AC 3 (button remains), AC 4 (button hidden) are in `todo-list.test.tsx` ✓

- [x] **Task 2 — Write failing test for delete pagination stability** (AC: 5)
  - [x] Test: After delete success, `invalidateQueries` is NOT called (pagination preserved)
  - [x] Test: After delete success with 2 pages in cache, both pages remain intact (only deleted todo removed)
  - [x] Updated existing test: "successful delete → todo stays removed" to verify no invalidateQueries

- [x] **Task 3 — Write failing test for toggle pagination stability** (AC: 6)
  - [x] Test: After toggle success, `invalidateQueries` is NOT called (pagination preserved)
  - [x] Test: After toggle success, the toggled todo is removed from all cached query pages
  - [x] Updated existing test: `use-toggle-todo.test.ts` "invalidateQueries on success" → now verifies `setQueriesData` removes todo and no invalidateQueries called

- [x] **Task 4 — Fix `useDeleteTodo.onSuccess` — remove invalidateQueries** (AC: 5)
  - [x] Removed `void queryClient.invalidateQueries({ queryKey: ["todos"] })` from `onSuccess`
  - [x] Optimistic removal in `onMutate` is sufficient — no refetch needed after confirmed delete

- [x] **Task 5 — Fix `useToggleTodo.onSuccess` — replace invalidateQueries with setQueriesData** (AC: 6)
  - [x] Replaced `void queryClient.invalidateQueries({ queryKey: ["todos"] })` with targeted cache removal via `setQueriesData`
  - [x] Removes toggled todo from all cached query pages (both active and completed caches)
  - [x] Preserves pagination — does NOT trigger refetch of any pages

- [x] **Task 6 — Verify AC 7 (pagination resets on tab/sort switch)** (AC: 7)
  - [x] Automatic via TanStack Query: new query key = fresh infinite query starting at page 1 ✓

- [x] **Task 7 — Validate all checks pass**
  - [x] `pnpm --filter @todo-app/frontend typecheck` passes with 0 errors
  - [x] `pnpm lint` passes with 0 errors
  - [x] `pnpm --filter @todo-app/frontend test` — all 170 unit tests green

## Dev Notes

### Current State Assessment (Pre-Story 3.3)

| Feature | Status | Notes |
|---------|--------|-------|
| `useInfiniteQuery` in `useTodos` | DONE | `use-todos.ts:12` — cursor pagination wired |
| `getNextPageParam` from cursor | DONE | `use-todos.ts:23` — `lastPage.cursor ?? undefined` |
| `hasNextPage` exposed from hook | DONE | `use-todos.ts:30` |
| `fetchNextPage` exposed from hook | DONE | `use-todos.ts:31` |
| "Load more" button in `TodoList` | DONE | `todo-list.tsx:53-63` — visible when `hasNextPage`, disabled when `isFetchingNextPage` |
| `fetchNextPage` wired in `App` | DONE | `app.tsx:96` — passed to `TodoList` |
| Pagination resets on tab/sort switch | DONE | Automatic — new query key starts fresh |
| **Delete pagination stability** | **BUG** | `use-delete-todo.ts:40` — `invalidateQueries` resets pagination after delete success |
| **Toggle pagination stability** | **BUG** | `use-toggle-todo.ts:42` — `invalidateQueries` resets pagination after toggle success |

### Critical Bug: `invalidateQueries` Disrupts Pagination

Both `useDeleteTodo.onSuccess` and `useToggleTodo.onSuccess` call `invalidateQueries({ queryKey: ["todos"] })`. In TanStack Query v5, when an infinite query is invalidated, it **restarts from page 1** — all loaded pages beyond page 1 are lost.

**Scenario (AC 5 failure):**
1. User loads page 1 (10 todos) → clicks "Load more" → page 2 loaded (10 more)
2. User deletes a todo from page 1
3. Optimistic update removes todo from cache ✓
4. Delete succeeds → `invalidateQueries` triggers refetch from page 1 → pages 2+ gone
5. User must click "Load more" again (pagination position disrupted)

**Fix for AC 5** (`useDeleteTodo`):
- Remove `invalidateQueries` from `onSuccess`. The optimistic `setQueriesData` in `onMutate` already removes the todo from all cached pages. Server confirmed the deletion — no refetch needed. Cache state is correct.

**Fix for AC 6** (`useToggleTodo`):
- Replace `invalidateQueries` with `setQueriesData` to remove the toggled todo from all cache pages.
- This preserves: pagination position, pages 2+, cursor state
- This correctly: removes toggled todo from active-tab cache (it's now completed) and from completed-tab cache if user toggles back to active
- The `onMutate` optimistic update set `completed: true/false` in cache. `onSuccess` then removes it from ALL cached pages — correct because after toggle, the todo no longer belongs in the current filtered view.

**Why this preserves Story 3.1 AC 8:**
AC 8: "toggle removes todo from active view". Previously: `invalidateQueries` caused refetch that excludes toggled-to-completed todo. New behavior: `setQueriesData` directly removes it. Same end result — todo gone from active cache — but without the pagination reset.

### Impact on Existing Tests

`use-toggle-todo.test.ts` line 84: Tests `invalidateSpy.toHaveBeenCalledWith({ queryKey: ["todos"] })`. This will BREAK when we change `onSuccess`. Must update to test `setQueriesData` behavior instead:
```ts
// Old expectation (will break):
expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["todos"] });

// New behavior to verify:
// After toggle success, the toggled todo is no longer in the cache
const data = queryClient.getQueryData(QUERY_KEY);
expect(data?.pages[0]?.data.find(t => t.id === "a")).toBeUndefined();
```

`use-delete-todo.test.ts` does NOT test `invalidateQueries` being called in `onSuccess` — no changes needed to that file's existing tests.

### Key Files to Touch

```
packages/frontend/src/
  hooks/
    use-delete-todo.ts             ← MODIFY: remove invalidateQueries from onSuccess
    use-toggle-todo.ts             ← MODIFY: replace invalidateQueries with setQueriesData
    use-todos.test.ts              ← MODIFY: add fetchNextPage / cursor pagination tests
    use-delete-todo.test.ts        ← ADD: pagination stability test
    use-toggle-todo.test.ts        ← MODIFY: update "invalidateQueries" test → setQueriesData test
```

### Cursor Pagination Mechanics

From architecture: "cursor pagination: base64-encoded createdAt ISO string, configurable page size from shared constant"

- `pageParam` is a cursor string (base64 createdAt)
- First page: `pageParam = undefined` → no cursor param in URL
- Next pages: `pageParam = cursor` → `?cursor=<base64>` appended to URL
- `cursor: null` in response → no next page → `hasNextPage = false`
- `cursor: "abc123"` in response → more pages → `hasNextPage = true`

### TanStack Query Key Strategy (Reference)

When query key changes (tab or sort toggle), TanStack Query creates a new infinite query starting from page 1. The old paginated cache for the previous key is kept but unused. No explicit "reset" needed — it's automatic.

- Active desc: `["todos", { status: "active", order: "desc" }]`
- Completed asc: `["todos", { status: "completed", order: "asc" }]`

Each combination has its own independent infinite query cache.

### Previous Story Learnings (from Story 3.2)

- All 168 tests pass after Story 3.2
- `fireEvent.mouseDown(el, { button: 0 })` for Radix UI tab interactions
- `fireEvent.click` for regular buttons (AppHeader, TodoList buttons)
- Each test gets a fresh `QueryClient` to avoid cache pollution
- Test file pattern: `app-*.test.tsx` for App-level, `use-*.test.ts` for hooks

### Commit Convention

- Prefix: `feat(impl):`
- Branch: `feat/03-filtering-sorting-pagination-3-3`

### References

- Story ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- useTodos hook: [Source: packages/frontend/src/hooks/use-todos.ts]
- useDeleteTodo hook: [Source: packages/frontend/src/hooks/use-delete-todo.ts:40] — invalidateQueries bug
- useToggleTodo hook: [Source: packages/frontend/src/hooks/use-toggle-todo.ts:42] — invalidateQueries bug
- TodoList pagination UI: [Source: packages/frontend/src/components/todo-list.tsx:53-63]
- Existing pagination tests: [Source: packages/frontend/src/components/todo-list.test.tsx:64-93]
- Architecture cursor pagination: [Source: _bmad-output/planning-artifacts/architecture.md]
- Previous story: [Source: _bmad-output/implementation-artifacts/3-2-sort-order-toggle.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- **Critical bug fixed:** `useDeleteTodo.onSuccess` was calling `invalidateQueries` which reset infinite query pagination. Removed — optimistic `setQueriesData` in `onMutate` is sufficient.
- **Critical bug fixed:** `useToggleTodo.onSuccess` was calling `invalidateQueries` which reset pagination. Changed to `setQueriesData` filter-removal — removes toggled todo from all cached pages without refetch.
- Story 3.1 AC 8 preserved: toggled todo removed from active view via `setQueriesData` (not refetch).
- 4 new/updated tests in `use-todos.test.ts`, `use-delete-todo.test.ts`, `use-toggle-todo.test.ts`.
- All 170 tests pass; 0 typecheck/lint errors.

### File List

- `packages/frontend/src/hooks/use-delete-todo.ts` (modified — removed invalidateQueries from onSuccess)
- `packages/frontend/src/hooks/use-toggle-todo.ts` (modified — replaced invalidateQueries with setQueriesData)
- `packages/frontend/src/hooks/use-todos.test.ts` (modified — added fetchNextPage/cursor test)
- `packages/frontend/src/hooks/use-delete-todo.test.ts` (modified — updated "successful delete" test + pagination stability test)
- `packages/frontend/src/hooks/use-toggle-todo.test.ts` (modified — updated "invalidateQueries" test to verify setQueriesData behavior)

### Change Log

- 2026-03-06: Implemented Story 3.3 — cursor pagination stability fixes
  - `use-delete-todo.ts`: removed `invalidateQueries` from `onSuccess`
  - `use-toggle-todo.ts`: replaced `invalidateQueries` with `setQueriesData` filter-removal in `onSuccess`
  - Added fetchNextPage cursor test to `use-todos.test.ts`
  - Updated pagination stability tests in delete and toggle hook tests
