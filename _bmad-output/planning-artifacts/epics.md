---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete'
completedAt: '2026-02-27'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# todo-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for todo-app, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Task Lifecycle (FR1–FR9)**

- FR1: User can create a new todo by entering text and submitting it
- FR2: User can create a new todo via an always-visible input area at the top of the list
- FR3: User can create a new todo via an explicit "Add Todo" action
- FR4: User can mark an active todo as completed
- FR5: User can mark a completed todo as active (uncomplete)
- FR6: User can delete any todo regardless of its current state
- FR7: User can delete a todo that is in an error state
- FR8: System prevents creation of todos with empty or whitespace-only text
- FR9: System prevents creation of todos with text exceeding the maximum allowed length

**Task Display & Organization (FR10–FR18)**

- FR10: User can view a list of their todos immediately upon opening the application
- FR11: User can filter the todo list to show only active (incomplete) todos
- FR12: User can filter the todo list to show only completed todos
- FR13: User can distinguish active todos from completed todos visually at a glance
- FR14: User can sort the todo list in ascending or descending order by creation time
- FR15: User can navigate through large todo lists via paginated loading
- FR16: System maintains stable list position when todos are mutated (created, completed, deleted) during pagination
- FR17: System displays placeholder content when the todo list is empty to indicate where todos will appear
- FR18: System displays a loading state while initial data is being fetched

**Real-Time Feedback (FR19–FR23)**

- FR19: User receives immediate visual feedback when performing any action (create, complete, delete) before server confirmation
- FR20: User can see when a todo is actively syncing with the server via a distinct visual indicator
- FR21: User cannot interact with a todo while it is syncing (temporarily disabled)
- FR22: System transitions a todo to its confirmed state upon successful server response
- FR23: System transitions a todo to an error state upon failed server response

**Error Handling & Recovery (FR24–FR30)**

- FR24: System differentiates between transient errors (network/server failure) and permanent errors (invalid data)
- FR25: User can retry a failed operation on a todo that experienced a transient error
- FR26: User sees an explanatory error message when a todo fails due to invalid data (permanent error)
- FR27: User can delete a todo in any error state as a recovery action
- FR28: System retries failed operations using the same todo identity to prevent duplicates
- FR29: System displays all error states with a distinct visual treatment that communicates "something went wrong"
- FR30: User is never left in an ambiguous state — every todo's current status is visually communicated

**Data Persistence & Integrity (FR31–FR36)**

- FR31: All server-confirmed todos persist across browser refreshes, tab closures, and device changes
- FR32: Todos that failed to sync with the server do not persist across sessions (clean slate on reopen)
- FR33: System validates todo data at the point of user input before submission
- FR34: System validates todo data at the API level before persistence
- FR35: System enforces data constraints at the database level as a final safety net
- FR36: System assigns a unique identity to each todo at creation time to support safe retries

**Accessibility & Responsiveness (FR37–FR42)**

- FR37: User can perform all todo actions (create, complete, delete, retry) using only a keyboard
- FR38: User can navigate through all interactive elements in a logical tab order
- FR39: System announces state changes (creation, completion, errors) to assistive technologies
- FR40: System provides text labels for all icon-only interactive elements
- FR41: System provides sufficient color contrast for all text and interactive elements
- FR42: User can use the application on both desktop and mobile screen sizes without loss of functionality

### NonFunctional Requirements

**Performance**

- NFR1: Optimistic UI feedback < 50ms (user action → visual state change, client-side only)
- NFR2: API response time (p95) < 500ms for all CRUD operations under normal conditions
- NFR3: First Contentful Paint < 1.5s on 3G connection
- NFR4: Time to Interactive < 2.5s on 3G connection
- NFR5: Initial bundle size (gzipped) < 150KB total JS + CSS
- NFR6: Lighthouse Performance score ≥ 90 (desktop and mobile)
- NFR7: Pagination fetch < 300ms for loading next page
- NFR8: ≥ 95% of create/complete/delete interactions show visual state change within 50ms
- NFR9: Cumulative Layout Shift (CLS) during create/delete/pagination flows ≤ 0.01

**Security**

- NFR10: 100% of API endpoints accepting user input enforce schema validation, return 400 on invalid payloads
- NFR11: CORS allows only configured frontend origin; non-allowlisted origins rejected in 100% of test cases
- NFR12: Write endpoints enforce rate limits of 60 req/min per IP (burst 20), return 429 with Retry-After
- NFR13: Persisted todo records contain only id, text, completed, createdAt, updatedAt — no unauthorized fields
- NFR14: Data-access logic prevents injection vulnerabilities, with 0 successful injection attempts in tests

**Reliability**

- NFR15: 100% of server-confirmed todos retrievable after forced refresh, browser restart, new-session reopen
- NFR16: 100% of non-2xx API responses follow consistent error schema (code, message, details?) with correct status classes
- NFR17: All multi-step write operations are atomic; 0 partial writes across fault-injection tests
- NFR18: Todo updatedAt changes on every successful update in 100% of integration test cases
- NFR19: On database outage, write requests fail with 503 within 5s and UI exposes retry affordance within 1s

**Maintainability & Testability**

- NFR20: Unit test coverage ≥ 90% across backend and frontend logic
- NFR21: E2E tests: complete lifecycle suite (create → complete → uncomplete → delete) passes before merge/release
- NFR22: 100% of public API endpoints have integration coverage against production-equivalent Postgres
- NFR23: 100% of allowed and disallowed state machine transitions asserted
- NFR24: Each validation rule has at least 1 valid and 1 invalid case at frontend, API, and DB layers
- NFR25: 0 circular dependencies across shared, backend, and frontend
- NFR26: Static type checks pass in all packages with strict mode enabled
- NFR27: Lint and formatting checks pass with 0 errors in automated verification
- NFR28: From clean checkout, one setup command brings all services to healthy state within 120s

**Accessibility**

- NFR29: Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text and interactive components (WCAG AA)
- NFR30: All interactive elements reachable and operable via keyboard alone
- NFR31: Focus indicators visible on all interactive elements during keyboard navigation
- NFR32: State changes announced via aria-live regions without requiring visual attention
- NFR33: Touch targets ≥ 44x44px on mobile breakpoints

### Additional Requirements

**From Architecture — Starter Template & Infrastructure:**

- Composed pnpm monorepo: packages/frontend (Vite + React 19), packages/backend (Fastify v5), packages/shared (TypeBox schemas, constants, state machine)
- Node.js 24.x LTS, React 19.x, TypeScript strict mode across all packages
- Drizzle ORM v0.45.1 with pg driver for Postgres; Drizzle Kit for migrations
- Postgres updatedAt trigger via raw SQL in initial migration
- Drizzle upsert (onConflictDoUpdate) for idempotent writes with client-generated UUIDs
- TypeBox schemas as single source of truth for types + validation across all layers
- TanStack Query v5 for server state management (caching, optimistic mutations, pagination)
- shadcn/ui (Radix UI primitives) + Tailwind CSS for design system (React variant)
- Security middleware stack: @fastify/cors, @fastify/rate-limit, @fastify/helmet
- @fastify/swagger + @fastify/swagger-ui for auto-generated OpenAPI docs
- Docker Compose for local dev (backend + frontend + Postgres containers)
- GitHub Actions CI/CD: lint → type-check → unit tests → integration tests (Postgres service container) → E2E (Playwright)
- Health check endpoint: GET /api/health with DB connectivity check + Docker HEALTHCHECK
- Pino structured JSON logging (Fastify built-in)
- Environment variables: DATABASE_URL, PORT, CORS_ORIGIN, RATE_LIMIT_MAX, VITE_API_BASE_URL
- Unidirectional dependency graph: shared ← backend, shared ← frontend (no circular deps)
- Named exports only, no default exports across entire codebase
- kebab-case file names, co-located tests (.test.ts/.test.tsx suffix)
- Vitest v4.x unified test runner, @testing-library/react for components, Playwright for E2E
- API response shapes: list → { data: Todo[], cursor: string | null }, single → Todo, delete → 204, errors → { code, message, details? }
- Cursor pagination: base64-encoded createdAt ISO string, configurable page size from shared constant

**From UX Design — Responsive & Accessibility:**

- Two-tier responsive layout: mobile (<768px) and desktop (≥768px), mobile-first CSS
- Content max-width: 640px centered on desktop
- Touch targets ≥ 44x44px enforced via row height (48px) and button sizing
- Base spacing unit: 4px; all spacing in multiples of 4
- Font loading: Roboto 400/500 from Google Fonts with font-display: swap
- WCAG 2.1 AA compliance target
- Semantic HTML: main, ul/li, button, input — no div-soup
- ARIA: aria-label on icon-only buttons, aria-live="polite" on todo list, role="status" on StatusDot, role="alert" on ErrorMessage
- Keyboard navigation: Tab/Shift+Tab, Enter/Space to activate, Arrow Left/Right for tabs
- Focus management: focus stays on input after creation, moves to next row after deletion
- prefers-reduced-motion: disable StatusDot pulse animation when set
- Hover-reveal delete on normal desktop rows; always-visible actions on mobile and error rows
- No confirmation dialogs, no toasts, no modals — all feedback inline and per-item
- Tab state reflected in URL via ?todo-status=active|completed query parameter (history.replaceState)
- Sort preference session-only, not URL-persisted, defaults to newest-first

### FR Coverage Map

- FR1: Epic 1 — Create todo by entering text and submitting
- FR2: Epic 1 — Always-visible input area at top of list
- FR3: Epic 1 — Explicit "Add Todo" action
- FR4: Epic 1 — Mark active todo as completed
- FR5: Epic 1 — Mark completed todo as active (uncomplete)
- FR6: Epic 1 — Delete any todo regardless of state
- FR7: Epic 2 — Delete a todo in error state
- FR8: Epic 1 — Prevent empty/whitespace-only todo creation
- FR9: Epic 1 — Prevent todo text exceeding max length
- FR10: Epic 1 — View todo list on app open
- FR11: Epic 3 — Filter to show only active todos
- FR12: Epic 3 — Filter to show only completed todos
- FR13: Epic 1 — Visually distinguish active from completed todos
- FR14: Epic 3 — Sort by creation time (asc/desc)
- FR15: Epic 3 — Paginated loading for large lists
- FR16: Epic 3 — Stable list position during mutations with pagination
- FR17: Epic 1 — Placeholder content for empty list
- FR18: Epic 1 — Loading state during initial data fetch
- FR19: Epic 1 — Immediate visual feedback before server confirmation
- FR20: Epic 1 — Syncing indicator visible during server communication
- FR21: Epic 1 — Todo disabled while syncing
- FR22: Epic 1 — Transition to confirmed state on success
- FR23: Epic 1 — Transition to error state on failure
- FR24: Epic 2 — Differentiate transient vs permanent errors
- FR25: Epic 2 — Retry failed operation on transient error
- FR26: Epic 2 — Error message on permanent error
- FR27: Epic 2 — Delete todo in any error state as recovery
- FR28: Epic 2 — Retry using same identity to prevent duplicates
- FR29: Epic 2 — Distinct visual treatment for all error states
- FR30: Epic 1 — Every todo's status visually communicated (no ambiguity)
- FR31: Epic 1 — Server-confirmed todos persist across sessions
- FR32: Epic 1 — Failed-sync todos don't persist across sessions
- FR33: Epic 1 — Frontend validation before submission
- FR34: Epic 1 — API-level validation before persistence
- FR35: Epic 1 — Database constraint enforcement
- FR36: Epic 1 — Unique identity at creation time (UUID)
- FR37: Epic 4 — All actions via keyboard only
- FR38: Epic 4 — Logical tab order
- FR39: Epic 4 — State changes announced to assistive technologies
- FR40: Epic 4 — Text labels for icon-only elements
- FR41: Epic 4 — Sufficient color contrast
- FR42: Epic 4 — Desktop and mobile without loss of functionality

## Epic List

### Epic 1: Project Foundation & Core Todo Management
User can create, view, complete/uncomplete, and delete todos through a fully working full-stack application with instant visual feedback. Includes monorepo scaffold, shared types/validation/state machine, backend API with Postgres, frontend with React + shadcn/ui + TanStack Query, optimistic mutations, syncing states, 3-layer validation, placeholder rows, and data persistence via Docker Compose local dev stack.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR8, FR9, FR10, FR13, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR30, FR31, FR32, FR33, FR34, FR35, FR36

### Epic 2: Error Handling & Recovery
User can recover from any failure — retry network errors, delete validation errors — and is never left in an ambiguous state. Transient errors (network/5xx) show retry + delete actions. Permanent errors (400 validation) show error message + delete only. Error states have distinct red accent visual treatment. Retry uses same UUID for idempotent upsert.
**FRs covered:** FR7, FR24, FR25, FR26, FR27, FR28, FR29

### Epic 3: Filtering, Sorting & Pagination
User can filter between active/completed views via tabs, toggle sort order (newest/oldest first), and browse large lists via cursor-based pagination with a "Load more" button. Tab state reflected in URL query parameter. Pagination remains stable across mutations.
**FRs covered:** FR11, FR12, FR14, FR15, FR16

### Epic 4: Accessibility & Responsive Polish
User can operate the entire app via keyboard on any device, with screen reader support and a consistent experience across mobile and desktop. WCAG 2.1 AA compliance — keyboard navigation, logical tab order, aria-live announcements, icon button labels, contrast validation, touch targets, focus management, and prefers-reduced-motion support.
**FRs covered:** FR37, FR38, FR39, FR40, FR41, FR42

### Epic 5: Quality Assurance & CI/CD
Developer can validate release readiness through automated quality gates. GitHub Actions CI/CD pipeline (lint → type-check → unit tests → integration tests → E2E). ≥90% unit coverage target, E2E lifecycle tests via Playwright, integration tests against real Postgres, state machine transition coverage, performance validation (Lighthouse ≥90, bundle <150KB), and documented one-command setup.
**NFRs primarily addressed:** NFR2–9, NFR11, NFR15–28

## Epic 1: Project Foundation & Core Todo Management

User can create, view, complete/uncomplete, and delete todos through a fully working full-stack application with instant visual feedback.

### Story 1.1: Project Scaffold & Shared Package

As a developer,
I want a working monorepo with shared types, validation schemas, and todo state machine,
So that all packages share a single source of truth for contracts, constants, and state logic.

**Acceptance Criteria:**

**Given** a clean checkout of the repository
**When** I run the documented setup command
**Then** pnpm workspaces are configured with packages/frontend, packages/backend, and packages/shared
**And** Docker Compose starts Postgres with health check passing
**And** all three packages type-check with TypeScript strict mode
**And** ESLint and Prettier pass with 0 errors

**Given** the shared package is built
**When** I import from @todo-app/shared
**Then** I can access TypeBox schemas: Todo, CreateTodo, UpdateTodo, TodoListQuery, TodoListResponse, ApiError
**And** I can access constants: maxTextLength, pageSize, errorCodes
**And** I can access the todo state machine function

**Given** the todo state machine
**When** I call it with valid (currentState, event) pairs
**Then** it returns the correct next state for all allowed transitions
**And** it rejects disallowed transitions
**And** 100% of allowed and disallowed transitions are covered by unit tests

**Given** the monorepo dependency graph
**When** analyzed for circular dependencies
**Then** the dependency flow is unidirectional: shared ← backend, shared ← frontend
**And** shared has zero imports from backend or frontend

### Story 1.2: Backend API — Todo CRUD Endpoints

As a user,
I want a REST API that stores my todos durably in a database,
So that my data persists across browser sessions and devices.

**Acceptance Criteria:**

**Given** the backend server is running with Postgres
**When** I send POST /api/todos with { id: uuid, text: "Buy groceries" }
**Then** a new todo is created and returned with id, text, completed: false, createdAt, updatedAt
**And** the response status is 201

**Given** a todo with the same id already exists
**When** I send POST /api/todos with that id
**Then** the existing todo is upserted (not duplicated)
**And** the response returns the updated todo

**Given** todos exist in the database
**When** I send GET /api/todos
**Then** I receive { data: Todo[], cursor: string | null } with todos sorted by createdAt descending

**Given** a todo exists
**When** I send PATCH /api/todos/:id with { completed: true }
**Then** the todo is updated and returned with completed: true and updatedAt changed

**Given** a todo exists
**When** I send DELETE /api/todos/:id
**Then** the todo is deleted and 204 No Content is returned

**Given** the API receives invalid input (empty text, text exceeding maxTextLength)
**When** the request is processed
**Then** a 400 response is returned with { code: "VALIDATION_ERROR", message: "...", details: [...] }

**Given** a non-existent todo id
**When** I send PATCH /api/todos/:id
**Then** a 404 response is returned with { code: "NOT_FOUND", message: "..." }

**Given** a non-existent todo id
**When** I send DELETE /api/todos/:id
**Then** 204 No Content is returned (delete is idempotent — no error if already gone)

**Given** any non-2xx response
**When** the error handler processes it
**Then** the response body follows { code: string, message: string, details?: unknown } with correct HTTP status class

**Given** the backend is running
**When** I send GET /api/health
**Then** I receive { status: "ok" } with 200 when DB is connected
**And** { status: "error", message: "..." } with 503 when DB is unreachable

**Given** requests arrive from non-allowlisted origins
**When** CORS processes them
**Then** they are rejected

**Given** write endpoints receive > 60 requests/minute from one IP
**When** the rate limit is exceeded
**Then** 429 is returned with Retry-After header

**Given** the Drizzle migration runs
**When** the todos table is created
**Then** it includes the updatedAt trigger via raw SQL
**And** the table schema conforms to shared TypeBox types via satisfies

**Given** unit tests run via `pnpm --filter @todo-app/backend test`
**When** all route and error handler tests execute with mocked DB
**Then** all tests pass without requiring a Postgres connection

**Given** integration tests run via `pnpm --filter @todo-app/backend integration-test`
**When** the script starts Postgres via Docker Compose and executes integration tests
**Then** all CRUD endpoints and health check are verified against a real Postgres instance

### Story 1.3: Frontend Shell & Todo List Display

As a user,
I want to see my todos when I open the app,
So that I can immediately review what I need to do.

**Acceptance Criteria:**

**Given** the frontend app is loaded
**When** the initial data fetch is in progress
**Then** placeholder rows (static skeleton) are displayed
**And** the input area is visible and ready

**Given** todos exist on the server
**When** the fetch completes
**Then** todos are displayed in a list with text and timestamps visible
**And** active todos show normal text with unchecked checkbox
**And** completed todos show strikethrough text, muted color, and checked checkbox

**Given** no todos exist on the server
**When** the fetch completes
**Then** placeholder rows remain visible indicating where todos will appear

**Given** the app shell renders
**When** the page loads
**Then** AppHeader displays the app title
**And** the layout is centered with max-width 640px on desktop (≥768px)
**And** full-width with 16px padding on mobile (<768px)

**Given** the frontend makes API requests
**When** any request is sent
**Then** it goes through the apiFetch wrapper with base URL from VITE_API_BASE_URL
**And** errors are normalized to the { code, message, details? } shape

### Story 1.4: Todo Creation with Optimistic UI

As a user,
I want to type a task and press Enter to see it appear instantly,
So that I can capture todos without waiting for the server.

**Acceptance Criteria:**

**Given** the input area is focused
**When** I type todo text and press Enter (or click "Add Todo")
**Then** the todo appears immediately at the top of the list in syncing state (blue pulsing dot, row muted/disabled)
**And** the input clears and retains focus for the next todo
**And** a client-generated UUID is assigned via crypto.randomUUID()

**Given** a todo is in syncing state
**When** the server responds with 201
**Then** the syncing dot disappears silently
**And** the row becomes fully interactive (confirmed state)

**Given** a todo is in syncing state
**When** the server responds with an error
**Then** the todo transitions to error state visually (red accent)

**Given** the input field is empty or contains only whitespace
**When** I attempt to submit
**Then** submission is prevented
**And** a validation error message appears below input: "Todo text is required"
**And** the input border turns red

**Given** the input text exceeds maxTextLength
**When** I type beyond the limit
**Then** a validation error message appears: "Text exceeds maximum length"
**And** the input border turns red
**And** submission is prevented

**Given** a validation error is displayed
**When** I modify the input text
**Then** the error message clears on the next keystroke

**Given** I create 5 todos in rapid succession
**When** all are submitted
**Then** all 5 appear in the list without spinner, delay, or layout shift
**And** each has an independent syncing state

### Story 1.5: Todo Completion & Deletion with Optimistic UI

As a user,
I want to check off and delete todos with instant feedback,
So that I can manage my list without waiting for server confirmation.

**Acceptance Criteria:**

**Given** an active confirmed todo
**When** I click the checkbox
**Then** the todo immediately shows as completed (strikethrough, muted text, checked checkbox)
**And** the row enters syncing state (blue dot, disabled)
**And** a PATCH request is sent to toggle completed

**Given** a completed confirmed todo
**When** I click the checkbox
**Then** the todo immediately shows as active (normal text, unchecked checkbox)
**And** the row enters syncing state
**And** a PATCH request is sent to toggle completed

**Given** a confirmed todo (active or completed)
**When** I click the delete button
**Then** the row is immediately removed from the list
**And** a DELETE request is sent to the server

**Given** a toggle or delete is in syncing state
**When** the server responds successfully
**Then** the syncing state resolves to confirmed
**And** the row becomes fully interactive

**Given** a toggle is in syncing state
**When** the server responds with an error
**Then** the optimistic change is rolled back (checkbox reverts to previous state)
**And** the todo transitions to error state

**Given** a delete is in syncing state
**When** the server responds with an error
**Then** the todo row reappears in error state

**Given** a todo was optimistically inserted but never confirmed by the server
**When** the user refreshes the page
**Then** the todo does not appear (only server-confirmed todos load from the API)

## Epic 2: Error Handling & Recovery

User can recover from any failure — retry network errors, delete validation errors — and is never left in an ambiguous state.

### Story 2.1: Error Type Classification & Visual States

As a user,
I want to clearly see when a todo has failed to sync and understand what kind of failure occurred,
So that I know whether to retry or take a different action.

**Acceptance Criteria:**

**Given** a todo mutation (create, toggle, delete) fails with a 5xx, 429, network error, or timeout
**When** the error response is processed
**Then** the error is classified as transient
**And** the todo row shows red background tint, red static status dot, and frozen checkbox

**Given** a todo mutation fails with a 400 or 422 (validation error)
**When** the error response is processed
**Then** the error is classified as permanent
**And** the todo row shows red background tint, red static status dot, and frozen checkbox

**Given** a todo is in any error state
**When** the user views the list
**Then** the error row is visually distinct from confirmed and syncing rows
**And** the todo's status is never ambiguous — it is clearly in error state

**Given** multiple todos exist in the list
**When** one todo enters error state
**Then** all other todos remain unaffected and fully interactive

### Story 2.2: Transient Error Recovery — Retry & Delete

As a user,
I want to retry a failed todo when the network recovers,
So that I don't lose my data due to temporary connectivity issues.

**Acceptance Criteria:**

**Given** a todo is in transient error state
**When** the row renders
**Then** a retry button (↻) and a delete button (×) are both visible (always visible, not hover-reveal)

**Given** a todo is in transient error state
**When** I click the retry button
**Then** the todo transitions to syncing state (blue dot, row disabled)
**And** the same UUID is used for the retry request (idempotent upsert)

**Given** a retry is in syncing state
**When** the server responds successfully
**Then** the todo transitions to confirmed state (interactive, no dot)

**Given** a retry is in syncing state
**When** the server responds with another error
**Then** the todo returns to transient error state with retry and delete still available

**Given** a todo is in transient error state
**When** I click the delete button
**And** the todo was never confirmed by the server
**Then** the row is removed from the UI with no server call

**Given** a todo is in transient error state
**When** I click the delete button
**And** the todo was previously confirmed by the server
**Then** a DELETE request is sent to the server
**And** the row is optimistically removed

### Story 2.3: Permanent Error Display — Message & Delete

As a user,
I want to see why my todo failed validation so I can recreate it correctly,
So that I understand what went wrong and can fix it.

**Acceptance Criteria:**

**Given** a todo is in permanent error state
**When** the row renders
**Then** an inline error message is displayed below the todo text (e.g., "Text exceeds maximum length")
**And** only a delete button (×) is visible — no retry button
**And** the error message uses 13px font in destructive color

**Given** a todo is in permanent error state
**When** I click the delete button
**Then** the row is removed from the UI with no server call (it was never confirmed)

**Given** a todo was in permanent error state
**When** I delete it and recreate with valid text
**Then** the new todo syncs successfully to confirmed state

**Given** the ErrorMessage component renders
**When** the error text is displayed
**Then** it is linked to the TodoRow via aria-describedby
**And** it has role="alert" for screen reader announcement

## Epic 3: Filtering, Sorting & Pagination

User can filter between active/completed views via tabs, toggle sort order, and browse large lists via cursor-based pagination with stable positioning across mutations.

### Story 3.1: Active/Completed Tab Filtering

As a user,
I want to filter my todo list by active or completed status,
So that I can focus on what still needs doing or review what I've accomplished.

**Acceptance Criteria:**

**Given** the app is loaded
**When** the page renders
**Then** Active and Completed tabs are displayed as full-width equal tabs (shadcn Tabs component)
**And** the Active tab is selected by default

**Given** the Active tab is selected
**When** the list loads
**Then** only active (incomplete) todos are displayed

**Given** the Completed tab is selected
**When** the list loads
**Then** only completed todos are displayed

**Given** the user is on the Active tab
**When** they click the Completed tab
**Then** the list clears and fetches the first page of completed todos
**And** the URL updates to ?todo-status=completed via history.replaceState

**Given** the user is on the Completed tab
**When** they click the Active tab
**Then** the list clears and fetches the first page of active todos
**And** the URL updates to ?todo-status=active

**Given** a URL with ?todo-status=completed
**When** the app loads
**Then** the Completed tab is selected and completed todos are fetched

**Given** a URL with no todo-status param or an invalid value
**When** the app loads
**Then** the Active tab is selected by default

**Given** a todo is completed while viewing the Active tab
**When** the toggle succeeds
**Then** the todo is removed from the active list view (it now belongs in completed)

### Story 3.2: Sort Order Toggle

As a user,
I want to switch between newest-first and oldest-first ordering,
So that I can view my most recent tasks or find my oldest obligations.

**Acceptance Criteria:**

**Given** the app is loaded
**When** the AppHeader renders
**Then** the sort toggle button displays "↕ Newest first" (default descending order)

**Given** the sort is set to newest first (descending)
**When** I click the sort toggle
**Then** the button text changes to "↕ Oldest first"
**And** the list clears and fetches the first page sorted ascending by createdAt

**Given** the sort is set to oldest first (ascending)
**When** I click the sort toggle
**Then** the button text changes to "↕ Newest first"
**And** the list clears and fetches the first page sorted descending by createdAt

**Given** the sort preference is set
**When** I switch between Active and Completed tabs
**Then** the sort preference is preserved across tab switches within the session

**Given** the user refreshes the page
**When** the app reloads
**Then** the sort resets to newest first (default) — sort is session-only, not URL-persisted

### Story 3.3: Cursor-Based Pagination

As a user,
I want to load more todos as I browse a large list,
So that the app stays fast regardless of how many todos I have.

**Acceptance Criteria:**

**Given** the first page of todos is loaded and more pages exist
**When** the list renders
**Then** a "Load more" button is visible at the bottom of the list

**Given** the "Load more" button is visible
**When** I click it
**Then** the button shows a loading state (disabled, text change)
**And** the next page is fetched using the cursor from the last item's createdAt (base64-encoded)
**And** new rows are appended below existing rows

**Given** the next page is loaded
**When** more pages still exist
**Then** the "Load more" button remains visible

**Given** the last page is loaded (no more items)
**When** the response cursor is null
**Then** the "Load more" button is hidden

**Given** I delete a todo from the middle of a paginated list
**When** the deletion completes
**Then** the remaining items stay in their current positions
**And** no re-fetch of existing pages occurs
**And** the list does not jump or shift

**Given** I complete a todo while viewing a paginated active list
**When** the toggle succeeds
**Then** the todo is removed from the view without disrupting pagination position

**Given** I switch tabs or toggle sort order
**When** the new view loads
**Then** pagination resets to the first page with a fresh cursor

## Epic 4: Accessibility & Responsive Polish

User can operate the entire app via keyboard on any device, with screen reader support and a consistent experience across mobile and desktop.

### Story 4.1: Keyboard Navigation & Focus Management

As a user,
I want to operate the entire app using only my keyboard,
So that I can manage todos without relying on a mouse or touch input.

**Acceptance Criteria:**

**Given** the app is loaded
**When** I press Tab repeatedly
**Then** focus moves through interactive elements in logical order: sort toggle → input field → "Add Todo" button → Active tab → Completed tab → first TodoRow checkbox → first TodoRow delete → next TodoRow → ... → "Load more" button

**Given** any interactive element is focused
**When** I press Shift+Tab
**Then** focus moves to the previous interactive element in the order

**Given** a Button, Checkbox, or action is focused
**When** I press Enter or Space
**Then** the action is activated (same as click)

**Given** the Active tab is focused
**When** I press Arrow Right
**Then** focus moves to the Completed tab
**And** pressing Arrow Left moves back to Active tab

**Given** I just created a todo via Enter
**When** the todo is inserted into the list
**Then** focus remains on the input field for rapid sequential creation

**Given** I just deleted a todo
**When** the row is removed
**Then** focus moves to the next todo row's checkbox (or previous if last item)

**Given** any interactive element is focused
**When** the focus ring renders
**Then** a 2px solid primary-color ring with 2px offset is visible

**Given** a todo is in syncing state
**When** I Tab to its row
**Then** the checkbox and action buttons are not focusable (skipped in tab order)

### Story 4.2: Screen Reader Support & ARIA

As a user relying on assistive technology,
I want state changes announced automatically,
So that I can track what's happening without visual attention.

**Acceptance Criteria:**

**Given** the TodoList container
**When** it renders
**Then** it has role="list" and aria-live="polite"
**And** new todo insertions are announced to screen readers

**Given** a TodoRow
**When** it renders
**Then** it has role="listitem"
**And** aria-disabled="true" when in syncing state

**Given** the delete icon button
**When** it renders
**Then** it has aria-label="Delete todo: [todo text]"

**Given** the retry icon button
**When** it renders
**Then** it has aria-label="Retry todo: [todo text]"

**Given** the StatusDot component
**When** it renders in syncing state
**Then** it has role="status" and aria-label="Syncing"

**Given** the StatusDot component
**When** it renders in error state
**Then** it has role="status" and aria-label="Error"

**Given** the sort toggle button
**When** the sort is newest first
**Then** it has aria-label="Sort order: newest first"
**And** the label updates dynamically when toggled

**Given** the input field
**When** it renders
**Then** it has aria-label="New todo text"
**And** aria-describedby links to the validation error message when present

**Given** the shadcn Tabs component
**When** it renders
**Then** it provides role="tablist", role="tab", and aria-selected automatically

### Story 4.3: Responsive Layout & Touch Optimization

As a user,
I want the app to work seamlessly on my phone and desktop,
So that I can manage todos on any device without loss of functionality.

**Acceptance Criteria:**

**Given** a mobile viewport (<768px)
**When** the app renders
**Then** the layout is full-width with 16px padding
**And** todo row action buttons (delete ×, retry ↻) are always visible (no hover-reveal)
**And** all touch targets are ≥ 44x44px

**Given** a desktop viewport (≥768px)
**When** the app renders
**Then** the content is centered with max-width 640px
**And** delete button on normal rows appears on hover only
**And** error row actions are always visible regardless of hover

**Given** a 320px viewport (iPhone SE)
**When** the app renders
**Then** there is no horizontal scrolling
**And** the input area, tabs, and todo rows all fit within the viewport
**And** all features remain fully functional

**Given** the user has prefers-reduced-motion enabled
**When** the StatusDot renders in syncing state
**Then** the pulse animation is disabled (static blue dot instead)

**Given** all text and interactive elements
**When** color contrast is measured
**Then** primary text (#0A0A0A on #FFFFFF) meets AAA (19.4:1)
**And** completed/secondary text (#737373 on #FFFFFF) meets AA (4.56:1)
**And** error text (#DC2626 on #FFFFFF) meets AA (5.58:1)
**And** interactive components meet ≥ 3:1 contrast ratio

## Epic 5: Quality Assurance & CI/CD

Developer can validate release readiness through automated quality gates — tests, type checks, linting, and CI pipeline all pass with documented targets.

### Story 5.1: CI/CD Pipeline & Automated Quality Gates

As a developer,
I want an automated pipeline that validates code quality on every push,
So that regressions are caught before merge and release readiness is enforced.

**Acceptance Criteria:**

**Given** a push or pull request to the repository
**When** GitHub Actions triggers
**Then** the pipeline runs in order: lint → type-check → unit tests → integration tests → E2E tests

**Given** the lint stage runs
**When** ESLint and Prettier check all packages
**Then** the stage passes with 0 errors across shared, backend, and frontend

**Given** the type-check stage runs
**When** TypeScript strict mode checks all packages
**Then** the stage passes with 0 type errors

**Given** the unit test stage runs
**When** Vitest executes across all packages
**Then** the stage passes with ≥ 90% code coverage across backend and frontend logic
**And** 100% of state machine transitions (allowed and disallowed) are asserted
**And** each validation rule has at least 1 valid and 1 invalid test case

**Given** the integration test stage runs
**When** backend tests execute against a Postgres service container
**Then** 100% of public API endpoints have integration coverage
**And** all tests pass against production-equivalent Postgres

**Given** a clean checkout of the repository
**When** a developer runs the documented setup command
**Then** all services reach healthy state within 120 seconds
**And** the README documents the setup flow clearly

**Given** the monorepo dependency graph
**When** analyzed
**Then** 0 circular dependencies exist across shared, backend, and frontend

### Story 5.2: E2E Test Suite

As a developer,
I want end-to-end tests that verify the complete user experience,
So that I can confirm the full stack works together before release.

**Acceptance Criteria:**

**Given** the full Docker Compose stack is running (frontend + backend + Postgres)
**When** the Playwright E2E suite executes
**Then** the todo lifecycle test passes: create → complete → uncomplete → delete

**Given** the E2E suite runs
**When** the error recovery tests execute
**Then** transient error flow is verified: simulated network failure → error state → retry → success
**And** permanent error flow is verified: validation error → error message displayed → delete → recreate

**Given** the E2E suite runs
**When** the pagination tests execute
**Then** cursor-based pagination is verified: seed data → load more → stable positioning → sort toggle

**Given** the E2E suite runs
**When** all tests complete
**Then** the suite passes deterministically with no flaky tests
**And** results are reported in the GitHub Actions pipeline

**Given** the E2E test fixtures
**When** test data is seeded
**Then** the seed script creates a known dataset for reproducible test runs

### Story 5.3: Performance Validation

As a developer,
I want automated performance checks,
So that I can verify the app meets its performance targets before release.

**Acceptance Criteria:**

**Given** a production build of the frontend
**When** Lighthouse audits run against desktop and mobile profiles
**Then** the Performance score is ≥ 90

**Given** a production build of the frontend
**When** the bundle is analyzed
**Then** total gzipped JS + CSS is < 150KB

**Given** a production build running with real data
**When** CLS is measured during create, delete, and pagination flows
**Then** CLS remains ≤ 0.01

**Given** the backend is running under normal conditions
**When** API response times are measured
**Then** p95 latency for all CRUD operations is < 500ms
**And** pagination fetch latency is < 300ms

**Given** the performance validation results
**When** they are documented
**Then** validation steps (automated or manual) are described in the README or CI configuration
**And** thresholds are enforceable as pass/fail gates
