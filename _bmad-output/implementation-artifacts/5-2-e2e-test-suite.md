# Story 5.2: E2E Test Suite

Status: done

## Story

As a developer,
I want end-to-end tests that verify the complete user experience,
so that I can confirm the full stack works together before release.

## Acceptance Criteria

1. **Given** the full stack is running (frontend + backend + Postgres)
   **When** the Playwright E2E suite executes
   **Then** the todo lifecycle test passes: create → complete → uncomplete → delete

2. **Given** the E2E suite runs
   **When** the error recovery tests execute
   **Then** transient error flow is verified: simulated network failure → error state → retry → success
   **And** permanent error flow is verified: validation error → error message displayed → delete → recreate

3. **Given** the E2E suite runs
   **When** the pagination tests execute
   **Then** cursor-based pagination is verified: seed data → load more → stable positioning → sort toggle

4. **Given** the E2E suite runs
   **When** all tests complete
   **Then** the suite passes deterministically with no flaky tests
   **And** results are reported in the GitHub Actions pipeline

5. **Given** the E2E test fixtures
   **When** test data is seeded
   **Then** the seed script creates a known dataset for reproducible test runs

## Tasks / Subtasks

- [x] Task 1: Install and configure Playwright (AC: 4)
  - [x] Install `@playwright/test` as root devDependency
  - [x] Create `playwright.config.ts` at repo root
  - [x] Configure baseURL to `http://localhost:5173`
  - [x] Configure webServer to start frontend + backend
  - [x] Add `test:e2e` script to root package.json
  - [x] Update CI workflow with E2E job
- [x] Task 2: Create test fixtures and seed utility (AC: 5)
  - [x] Create `e2e/fixtures/` directory
  - [x] Create seed utility that inserts known todos via API
  - [x] Create cleanup utility that deletes all todos via API
- [x] Task 3: Todo lifecycle E2E test (AC: 1)
  - [x] Test: create a todo → verify it appears in list
  - [x] Test: complete the todo → verify strikethrough
  - [x] Test: uncomplete the todo → verify restored
  - [x] Test: delete the todo → verify removed from list
- [x] Task 4: Error recovery E2E tests (AC: 2)
  - [x] Test: simulate API failure on create → verify error state → retry → success
  - [x] Test: submit todo exceeding max length → verify validation error → delete → recreate
- [x] Task 5: Pagination and filtering E2E tests (AC: 3)
  - [x] Test: seed 25+ todos → verify "Load more" button → load next page
  - [x] Test: toggle sort order → verify list reorders
  - [x] Test: switch between Active/Completed tabs → verify filtering
- [x] Task 6: Validate full suite passes (AC: 4)
  - [x] Run E2E tests against running stack
  - [x] Verify no flaky tests (run 2x)

## Dev Notes

### Architecture

The E2E tests run against the full stack: Vite dev server (port 5173) → Fastify API (port 3000) → Postgres (port 5432).

Playwright `webServer` config can start both services. The frontend Vite dev server proxies to the backend at `VITE_API_BASE_URL=http://localhost:3000`.

### Key UI Selectors

From the component analysis:
- **Input area**: `input` with `aria-label="New todo text"`, "Add Todo" button
- **Tabs**: "Active" and "Completed" tab buttons (shadcn Tabs)
- **Sort toggle**: button with `aria-label` containing "Sort order"
- **Todo rows**: `role="listitem"` inside `role="list"` container with `aria-live="polite"`
- **Checkbox**: Radix checkbox inside each todo row
- **Delete button**: `aria-label="Delete todo: [text]"`
- **Retry button**: `aria-label="Retry todo: [text]"`
- **Error message**: `role="alert"` elements
- **Status dot**: `role="status"` with aria-label "Syncing" or "Error"
- **Load more**: button with text "Load more"
- **Placeholder rows**: skeleton elements during loading

### API Endpoints for Fixtures

```
POST /api/todos     { id: uuid, text: string }          → 201 Todo
GET  /api/todos     ?status=active|completed&order=...   → { data: Todo[], cursor: string|null }
PATCH /api/todos/:id { completed: boolean }              → 200 Todo
DELETE /api/todos/:id                                    → 204
```

### Error Simulation Strategy

For transient errors: Use Playwright's `page.route()` to intercept API calls and return 500 for the first attempt, then let subsequent requests through.

For permanent errors: Submit text exceeding `maxTextLength` (500 chars from shared constants). The frontend validates this but we can test the error display.

Actually — the frontend prevents submission of text > maxTextLength. For permanent error E2E testing, we need to use `page.route()` to intercept the POST and return a 400 response to simulate a server-side validation error.

### Pagination Setup

`pageSize` is 20 (from shared constants). Seed 25+ todos to trigger pagination. Use the API directly to seed via `POST /api/todos` in a `beforeEach`.

### Directory Structure

```
e2e/
  todo-lifecycle.spec.ts
  error-recovery.spec.ts
  pagination.spec.ts
  fixtures/
    seed.ts
playwright.config.ts
```

### CI Integration

Add an E2E job to `.github/workflows/ci.yml` that:
1. Starts Postgres service container
2. Starts backend + frontend
3. Runs Playwright tests
4. Uploads test artifacts on failure

### Previous Story Learnings (from 5-1)

- CI pipeline established with lint → typecheck → unit-tests → integration-tests
- All 269 tests passing with coverage >= 90%
- `packageManager` field added to root package.json
- Integration tests use service container in CI (not Docker Compose)

### References

- Architecture E2E requirements: [Source: _bmad-output/planning-artifacts/architecture.md#Testing Framework]
- Epics AC: [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2]
- Frontend components: packages/frontend/src/components/
- API routes: packages/backend/src/routes/todos.ts
- Shared constants: packages/shared/src/constants.ts

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- All 9 E2E tests passing deterministically
- Fixed `deleteAllTodos` to loop through pages (server caps limit at pageSize=20)
- Lifecycle test correctly navigates between Active/Completed tabs
- Tests cover: lifecycle, error recovery (transient + permanent), pagination, sorting, tab filtering

### File List

- `playwright.config.ts` — Playwright configuration with webServer setup
- `e2e/fixtures/seed.ts` — Test utilities: createTodo, seedTodos, deleteAllTodos
- `e2e/todo-lifecycle.spec.ts` — 3 tests: create→complete→uncomplete→delete, focus retention, empty prevention
- `e2e/error-recovery.spec.ts` — 2 tests: transient error retry, permanent error flow
- `e2e/pagination.spec.ts` — 4 tests: load more, sort toggle, tab filtering, stable positioning
- `package.json` — Added test:e2e script and @playwright/test devDependency
- `.github/workflows/ci.yml` — Added E2E test job with Playwright and RATE_LIMIT_MAX
- `.gitignore` — Added test-results and playwright-report exclusions
