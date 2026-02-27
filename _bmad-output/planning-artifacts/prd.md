---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation-skipped', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-27.md'
  - 'user-provided-prd-draft'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
workflowType: 'prd'
date: '2026-02-27'
---

# Product Requirements Document - todo-app

**Author:** dvd
**Date:** 2026-02-27

## Executive Summary

A full-stack todo application for individual task management — create, view, complete, and delete tasks through a responsive, zero-onboarding interface. The product targets a single user managing personal tasks across desktop and mobile browsers, with all interactions feeling instantaneous via optimistic UI backed by a durable REST API and Postgres persistence. No authentication, collaboration, or advanced task features in v1 — the scope is deliberately minimal to deliver a polished, complete-feeling product rather than a feature-rich incomplete one. The architecture (monorepo, shared TypeScript interfaces, cursor-based pagination, idempotent writes) is designed to support future extensions (auth, multi-user, search, real-time sync) without v1 refactoring.

### What Makes This Special

Production-grade engineering applied to the simplest possible domain. The technical choices — per-todo state machines, client-generated UUIDs with server-side upsert, optimistic mutations via TanStack Query, 3-visual-state UI model — are patterns typically reserved for complex applications. Applying them to a todo app creates an artifact that feels like a shipped product: instant feedback, graceful error recovery, no layout jank, no loading spinners on happy paths. The project doubles as a professional development simulation — the value lies equally in the engineering process (structured planning, trade-off analysis, clean implementation) and the final deliverable.

## Project Classification

- **Type:** Full-stack web application (SPA + REST API)
- **Domain:** General productivity / personal task management
- **Complexity:** Low — no compliance, no integrations, no multi-tenancy
- **Context:** Greenfield — built from scratch as a monorepo (`frontend`, `backend`, `shared` packages)

## Success Criteria

### User Success

- **Perceived responsiveness:** All user-initiated actions (create, complete, delete) provide immediate visual feedback. Optimistic updates are the default — the UI reflects the intended state before server confirmation.
- **Transparency on failure:** When a server operation fails, the affected todo enters an error state with a clear visual indicator (red accent) and actionable recovery options: retry the operation or delete the todo. The user is never left in an ambiguous or stuck state.
- **Zero onboarding:** A new user can create, complete, and delete todos on first visit without any instructions, tooltips, or guidance. The interface communicates its affordances through standard UI conventions.
- **Session durability:** Todos persist across browser refreshes, tab closures, and device switches. The user's data is never lost under normal operating conditions.

### Business Success

- **Process completeness:** The project delivers a full artifact trail from PRD through architecture, implementation, and deployment — simulating a professional development lifecycle end-to-end.
- **Code maintainability:** The codebase is clean, well-structured, and onboardable — a new developer could understand the architecture and contribute without extensive context transfer.
- **Deployable artifact:** The application is fully deployable, not just locally runnable. The Docker Compose stack works out of the box for local development, and the app can be demonstrated as a finished product.

### Technical Success

- **Unit test coverage:** 90% code coverage target across backend and frontend logic, with particular emphasis on the per-todo state machine transitions and validation layers.
- **E2E test coverage:** End-to-end tests verify the complete todo lifecycle — create, view, complete, uncomplete, delete — including optimistic update behavior and error recovery flows.
- **3-layer validation:** Input validation enforced consistently at frontend, API, and database constraint levels. No layer trusts upstream validation.
- **Idempotent writes:** Client-generated UUIDs with server-side upsert ensure safe retries without duplicate creation.

### Measurable Outcomes

| Metric | Target |
|---|---|
| Optimistic UI feedback | < 50ms perceived response on user action |
| Server round-trip (p95) | < 500ms under normal conditions |
| Unit test coverage | ≥ 90% |
| E2E lifecycle test | Full create → complete → delete path passing |
| Error recovery | Every error state has at least one user-actionable recovery path |
| Zero-onboarding validation | All CRUD actions discoverable without help text |

## User Journeys

### Journey 1: First-Time User — Task Management Happy Path

**Persona:** Alex, someone who needs a simple place to track personal tasks without signing up for anything or learning a new tool.

**Opening Scene:** Alex opens the app for the first time. The page loads instantly — a clean list with placeholder rows suggesting where todos will appear, and an input field ready at the top. No sign-up wall, no tutorial overlay, no empty-state illustration to dismiss.

**Rising Action:** Alex types "Buy groceries" and hits Enter. The todo appears immediately at the top of the list — no spinner, no delay. They add a few more tasks: "Reply to email," "Book dentist appointment." Each insertion is instant, the new item slides into place while older placeholders disappear. Alex taps the checkbox next to "Reply to email" — it grays out with a subtle status dot confirming the sync, then settles into the completed visual state. They switch to the "Completed" tab and see it there. Back to "Active" — it's gone.

**Climax:** Alex closes the browser, reopens it an hour later. Everything is exactly where they left it. Active tasks are active, completed ones are completed. They delete "Buy groceries" after finishing it — it disappears immediately, no "Are you sure?" dialog.

**Resolution:** Alex has a working personal task list with zero friction. No account, no configuration, no learning curve. The app did exactly what they expected at every step.

**Requirements revealed:** Todo CRUD operations, optimistic UI feedback, active/completed filtering, session persistence, responsive instant interactions, zero-onboarding affordances.

### Journey 2: Unreliable Network — Transient Error Recovery

**Persona:** Alex again, but now on a flaky connection — coffee shop Wi-Fi dropping intermittently.

**Opening Scene:** Alex opens the app and their existing todos load normally (cached or fast enough before the connection degrades). They type "Finish report" and hit Enter.

**Rising Action:** The todo appears optimistically at the top — but the network request fails. The status dot turns red, the row gets a subtle red accent. Alex sees two options: a retry icon and a delete icon. The row is not interactive beyond those actions — they can't check it off while it's in error state. Alex taps retry. The status dot pulses briefly, the request goes through this time, and the todo settles into normal interactive state.

**Climax:** Alex tries to complete another todo, but the network drops again mid-request. The todo shows the syncing state (dot + disabled), then after timeout transitions to error. Alex decides this task isn't worth fighting the network for — they hit delete on the errored todo. It disappears cleanly. No orphaned data, no stuck UI.

**Resolution:** Despite multiple network failures, Alex was never confused about the state of their data. Every failure was visible, every error had a clear action, and no todo got stuck in limbo. When the network stabilized, everything was consistent between what Alex saw and what the server had.

**Requirements revealed:** Per-todo state machine (pending → confirmed → error), transient error state with retry + delete actions, syncing state with disabled interaction, optimistic rollback on failure, idempotent retry via UUID upsert, timeout handling.

### Journey 2b: Validation Failure — Error Display and Recovery

**Persona:** Alex, on a stable connection.

**Opening Scene:** Alex creates a todo with a very long text — they paste a paragraph that exceeds the max length. The frontend validation catches it inline: the input field shows a red border and a message ("Text exceeds maximum length"). Alex trims the text and submits successfully.

**Rising Action:** Later, due to a frontend bug or race condition, a todo with edge-case-invalid data slips past frontend validation and is optimistically inserted. The server responds with a 400. The todo transitions to a permanent error state: a red accent appears with an inline message explaining the issue ("Text exceeds maximum length"). Unlike a transient error, there is no retry button — retrying the same invalid data would fail again. Alex sees a delete action as the recovery path.

**Climax:** Alex deletes the errored todo and recreates it with valid text. The new todo syncs successfully. The distinction between "your data is bad" (delete and recreate) and "the network is bad" (retry) is clear from the available actions.

**Resolution:** If Alex had closed the tab with the errored todo still visible, it would disappear — only server-confirmed todos survive session boundaries. On reopen, the state is clean and consistent with the server.

> **v2 Enhancement:** Error-state inline editing will allow the user to fix invalid data in-place and retry, eliminating the need to delete and recreate. This is scoped as a v2 feature to keep v1 complexity manageable.

**Requirements revealed:** Error type differentiation (transient vs permanent), permanent error → error message + delete only (v1), transient error → retry + delete, frontend validation as first line of defense, no client-side persistence of failed mutations, clean state on session restart.

### Journey 3: Growing List — Pagination and Organization

**Persona:** Alex, a few weeks in, with 40+ todos accumulated — a mix of active and completed.

**Opening Scene:** Alex opens the app. The first page of active todos loads — the list feels the same speed as day one despite the growing dataset. A "Load more" or scroll-triggered pagination pulls the next batch seamlessly via cursor-based fetching.

**Rising Action:** Alex wants to see their oldest tasks first. They flip the sort toggle from descending (newest first, the default) to ascending (oldest first). The list re-renders with the oldest active todos at the top. The toggle lets them switch perspective quickly between "newest impulse" and "oldest obligation."

**Climax:** Alex switches to the Completed tab to review what they've accomplished. The completed list is also paginated and sortable. They delete a few stale completed items — each deletion is instant (optimistic), and importantly, the pagination doesn't shift or re-fetch awkwardly because cursor-based pagination is stable across mutations.

**Resolution:** The app handles scale gracefully. Pagination never stutters, sorting is instant in perception, and mutations (delete, complete) don't break the current view position. Alex never thinks about "how many todos is too many" — the app just works.

**Requirements revealed:** Cursor-based pagination (stable across mutations), server-side sorting by `createdAt`, sort order toggle (asc/desc), active/completed filtered views with independent pagination, performant list rendering at scale, optimistic deletion without pagination disruption.

### Journey 4: Developer Handoff and Release Readiness

**Persona:** Sam, a developer joining the project and validating it for release.

**Opening Scene:** Sam clones the repository, reads the PRD and technical docs, and runs the documented setup flow. The app and supporting services become healthy quickly, with no hidden prerequisites.

**Rising Action:** Sam navigates package boundaries (`shared`, `backend`, `frontend`), updates a small feature, and verifies type checks, linting, and tests. CI confirms the same checks in an automated pipeline.

**Climax:** Sam runs the quality gates before release: unit coverage threshold, integration suite against a production-equivalent relational database, and end-to-end lifecycle tests. All pass with deterministic results.

**Resolution:** The project is onboardable, maintainable, and release-ready. The artifact trail from requirements to implementation and verification is complete and auditable.

**Requirements revealed:** Process completeness from planning through release, maintainable package boundaries, reproducible environment bootstrap, enforceable quality gates, unit coverage target, and full lifecycle E2E coverage.

### Journey Requirements Summary

| Capability | J1 | J2 | J2b | J3 | J4 |
|---|:---:|:---:|:---:|:---:|:---:|
| Todo CRUD operations | ✓ | ✓ | ✓ | ✓ | |
| Optimistic UI (instant feedback) | ✓ | ✓ | ✓ | ✓ | |
| Active/Completed filtering | ✓ | | | ✓ | |
| Per-todo state machine | | ✓ | ✓ | | |
| Transient error → retry + delete | | ✓ | | | |
| Permanent error → message + delete (v1) | | | ✓ | | |
| Frontend validation (first line) | | | ✓ | | |
| Syncing state (disabled + dot) | ✓ | ✓ | ✓ | | |
| Idempotent retry (UUID upsert) | | ✓ | | | |
| No client persistence of failed mutations | | ✓ | ✓ | | |
| Cursor-based pagination | | | | ✓ | |
| Server-side sorting (createdAt) | | | | ✓ | |
| Sort order toggle | | | | ✓ | |
| Session persistence (server-confirmed only) | ✓ | ✓ | ✓ | | |
| Zero-onboarding UX | ✓ | | | | |
| Stable pagination across mutations | | | | ✓ | |
| Process completeness (artifact trail) | | | | | ✓ |
| Maintainability and onboarding readiness | | | | | ✓ |
| Deployable and reproducible setup | | | | | ✓ |
| Unit coverage target enforcement | | | | | ✓ |
| E2E lifecycle coverage enforcement | | | | | ✓ |

## Web App Specific Requirements

### Project-Type Overview

Single-page application (SPA) with a REST API backend. No server-side rendering in v1 — the frontend is a static asset served independently, communicating with the API over HTTP. One HTML entry point, no client-side routing required (single-view app with tab-based filtering), and TanStack Query managing all server state.

### Browser Support

- **Target:** Modern browsers only — last 2 versions of Chrome, Firefox, Safari, Edge
- **Mobile:** Safari iOS, Chrome Android
- **No support for:** IE11, legacy Edge (EdgeHTML), or browsers without ES2020+ support
- **Build target:** ES2020, modern CSS (flexbox/grid, CSS custom properties)

### Responsive Design

- **Breakpoints:** Desktop (≥768px) and mobile (<768px) — two-tier layout
- **Mobile-first approach:** Todo list, input, and controls must be fully functional on a 320px-wide viewport
- **Touch targets:** Minimum 44x44px for interactive elements (checkboxes, buttons, delete/retry actions)
- **No horizontal scrolling** at any breakpoint

### SEO Strategy

Not applicable. Single-user personal tool with no public content. SPA without SSR is acceptable.

### Accessibility (Implementation Guidance)

Measurable accessibility criteria are defined in Non-Functional Requirements. Capability requirements are defined in FR37–FR42. This section provides implementation-level guidance:

- **Semantic HTML:** Proper use of `<main>`, `<button>`, `<input>`, `<ul>`/`<li>` for todo list — no div-soup
- **ARIA attributes:** `aria-label` on icon-only buttons (delete, retry), `aria-live` region for optimistic update announcements, `role="status"` for syncing/error indicators
- **Focus management:** Visible focus indicators on all interactive elements, logical tab order
- **Not in scope (v1):** Full screen reader journey testing, WCAG AAA, skip-to-content links, high contrast mode

### Implementation Considerations

- **Framework decision pending:** Svelte or React — both support the SPA model, TanStack Query, and the required accessibility patterns. Decision deferred to architecture phase.
- **Static hosting:** Frontend builds to static assets (HTML/JS/CSS) — deployable to any static host or served via the backend container.
- **CSS approach:** Decision deferred to architecture — options include CSS Modules, Tailwind, or framework-native (Svelte scoped styles).

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the minimum feature set that delivers a polished, complete-feeling product. Prioritizes perceived quality and engineering rigor over feature breadth. Every included feature works correctly, handles errors gracefully, and feels instant.

**Resource Requirements:** Solo developer. Full-stack TypeScript. Monorepo with shared types eliminates integration friction. Docker Compose eliminates infrastructure setup.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1 (Happy Path): Full CRUD lifecycle with instant feedback
- Journey 2 (Transient Error): Network failure detection, retry, and recovery
- Journey 2b (Validation Error): Error message display + delete (fix-in-place deferred to v2)
- Journey 3 (Scale): Cursor pagination and sorting with stable mutations

**Must-Have Capabilities:**
- Todo CRUD (create, read, complete/uncomplete, delete)
- Optimistic UI with per-todo state machine
- Client-generated UUIDs with server-side upsert for idempotency
- 3 visual states: interactive, syncing (status dot + disabled), error (red accent)
- Error type differentiation: transient (retry + delete) vs permanent (message + delete)
- Active/completed tab filtering
- Cursor-based pagination with server-side sorting by `createdAt`
- Sort order toggle (ascending/descending)
- Input-as-first-row + "Add Todo" button (dual creation UX)
- Placeholder rows for empty state (prevent layout shift)
- 3-layer validation (frontend, API, DB constraint)
- REST API — all writes return full updated object
- Postgres with `updatedAt` trigger and pre-built indexes (text search, `updatedAt` sort)
- Shared TypeScript interfaces and constants (monorepo `shared` package)
- Responsive layout (desktop + mobile)
- Basic ARIA accessibility (semantic HTML, keyboard nav, focus management)
- Docker Compose local dev stack
- 90% unit test coverage, E2E lifecycle tests against real Postgres

**Explicitly excluded from MVP:**
- Sort by `updatedAt` (DB schema ready, no UI)
- Error-state inline editing (v2 — validation errors get delete-only in v1)
- General inline editing
- Text search UI (indexes pre-built)
- TTL auto-deletion
- WebSocket / multi-tab sync
- Authentication / multi-user
- Config endpoint

### Phase 2: Growth

- Error-state inline editing (fix-in-place for validation errors)
- General inline text editing of existing todos
- Sort by `updatedAt` toggle in UI
- TTL auto-deletion of completed todos (configurable, visual countdown)
- Text search UI (leveraging pre-built DB indexes)
- WebSocket for multi-tab / multi-device sync
- Config endpoint for dynamic settings

### Phase 3: Expansion

- User authentication and multi-user support
- SSR migration (SvelteKit path)
- Document attachments on todos
- Collaboration features
- Task prioritization, deadlines, notifications

### Risk Mitigation Strategy

**Technical Risks:**
- *State machine complexity:* Mitigated by unit testing every transition. State machine is the most testable component — pure functions, no side effects.
- *Optimistic UI consistency:* Mitigated by TanStack Query's built-in optimistic mutation + rollback. Well-documented pattern with library support.
- *Cursor pagination correctness:* Mitigated by integration tests against real Postgres. Cursor stability across mutations is the key invariant to test.

**Resource Risks:**
- *Solo developer scope creep:* Mitigated by explicit MVP exclusion list. If timeline pressure emerges, sort toggle and placeholder rows are the first candidates for deferral — they're polish, not function.
- *Absolute minimum viable:* CRUD + optimistic UI + basic error handling. Pagination and sorting can be simplified to client-side as a fallback if server-side implementation proves problematic.

## Functional Requirements

### Task Lifecycle

- **FR1:** User can create a new todo by entering text and submitting it
- **FR2:** User can create a new todo via an always-visible input area at the top of the list
- **FR3:** User can create a new todo via an explicit "Add Todo" action
- **FR4:** User can mark an active todo as completed
- **FR5:** User can mark a completed todo as active (uncomplete)
- **FR6:** User can delete any todo regardless of its current state
- **FR7:** User can delete a todo that is in an error state
- **FR8:** System prevents creation of todos with empty or whitespace-only text
- **FR9:** System prevents creation of todos with text exceeding the maximum allowed length

### Task Display & Organization

- **FR10:** User can view a list of their todos immediately upon opening the application
- **FR11:** User can filter the todo list to show only active (incomplete) todos
- **FR12:** User can filter the todo list to show only completed todos
- **FR13:** User can distinguish active todos from completed todos visually at a glance
- **FR14:** User can sort the todo list in ascending or descending order by creation time
- **FR15:** User can navigate through large todo lists via paginated loading
- **FR16:** System maintains stable list position when todos are mutated (created, completed, deleted) during pagination
- **FR17:** System displays placeholder content when the todo list is empty to indicate where todos will appear
- **FR18:** System displays a loading state while initial data is being fetched

### Real-Time Feedback

- **FR19:** User receives immediate visual feedback when performing any action (create, complete, delete) before server confirmation
- **FR20:** User can see when a todo is actively syncing with the server via a distinct visual indicator
- **FR21:** User cannot interact with a todo while it is syncing (temporarily disabled)
- **FR22:** System transitions a todo to its confirmed state upon successful server response
- **FR23:** System transitions a todo to an error state upon failed server response

### Error Handling & Recovery

- **FR24:** System differentiates between transient errors (network/server failure) and permanent errors (invalid data)
- **FR25:** User can retry a failed operation on a todo that experienced a transient error
- **FR26:** User sees an explanatory error message when a todo fails due to invalid data (permanent error)
- **FR27:** User can delete a todo in any error state as a recovery action
- **FR28:** System retries failed operations using the same todo identity to prevent duplicates
- **FR29:** System displays all error states with a distinct visual treatment that communicates "something went wrong"
- **FR30:** User is never left in an ambiguous state — every todo's current status is visually communicated

### Data Persistence & Integrity

- **FR31:** All server-confirmed todos persist across browser refreshes, tab closures, and device changes
- **FR32:** Todos that failed to sync with the server do not persist across sessions (clean slate on reopen)
- **FR33:** System validates todo data at the point of user input before submission
- **FR34:** System validates todo data at the API level before persistence
- **FR35:** System enforces data constraints at the database level as a final safety net
- **FR36:** System assigns a unique identity to each todo at creation time to support safe retries

### Accessibility & Responsiveness

- **FR37:** User can perform all todo actions (create, complete, delete, retry) using only a keyboard
- **FR38:** User can navigate through all interactive elements in a logical tab order
- **FR39:** System announces state changes (creation, completion, errors) to assistive technologies
- **FR40:** System provides text labels for all icon-only interactive elements
- **FR41:** System provides sufficient color contrast for all text and interactive elements
- **FR42:** User can use the application on both desktop and mobile screen sizes without loss of functionality

## Non-Functional Requirements

### Performance

| Metric | Target | Context |
|---|---|---|
| Optimistic UI feedback | < 50ms | User action → visual state change (client-side only) |
| API response time (p95) | < 500ms | All CRUD operations under normal conditions |
| First Contentful Paint | < 1.5s | On 3G connection |
| Time to Interactive | < 2.5s | On 3G connection |
| Initial bundle size (gzipped) | < 150KB | Total JS + CSS for first load |
| Lighthouse Performance score | ≥ 90 | Desktop and mobile |
| Pagination fetch | < 300ms | Loading next page of todos |

- At least 95% of create/complete/delete interactions must show visual state change within 50ms, measured in automated browser performance tests on representative baseline hardware.
- Cumulative Layout Shift (CLS) during create/delete/pagination flows must remain <= 0.01, measured by automated performance audits on the production build.

### Security

- 100% of API endpoints that accept user input must enforce schema validation and return `400` on invalid payloads, verified by integration tests.
- CORS must allow only the configured frontend origin; preflight and simple requests from non-allowlisted origins must be rejected in 100% of CORS test cases.
- Write endpoints must enforce rate limits of 60 requests/minute per IP (burst 20), returning `429` with `Retry-After` when exceeded, verified by load tests.
- Persisted todo records must contain only `id`, `text`, `completed`, `createdAt`, and `updatedAt`; automated schema-conformance checks must fail on unauthorized fields.
- Data-access logic must prevent injection vulnerabilities for user-provided values, with 0 successful injection attempts in automated security tests.

### Reliability

- In E2E durability tests, 100% of server-confirmed todos must remain retrievable after forced refresh, browser restart, and new-session reopen.
- 100% of non-2xx API responses must follow a consistent error schema (`code`, `message`, optional `details`) and use correct 4xx/5xx status classes, verified by contract tests.
- All multi-step write operations must be atomic; fault-injection tests must show 0 partial writes across 100 failure runs.
- Todo `updatedAt` must change on every successful update in 100% of integration test cases.
- On database outage, write requests must fail with `503` within 5s and the UI must expose a retry affordance within 1s after the failed response.

### Maintainability & Testability

- **Unit test coverage:** ≥ 90% across backend and frontend logic
- **E2E tests:** Complete lifecycle suite (create → complete → uncomplete → delete) must pass in automated verification before merge and release.
- **Integration tests:** 100% of public API endpoints must have integration coverage against a production-equivalent relational database instance (no endpoint left untested).
- **State machine tests:** 100% of allowed transitions and 100% of disallowed transitions must be asserted.
- **Validation tests:** Each validation rule must include at least 1 valid case and at least 1 invalid case at frontend, API, and DB layers.
- **Code structure:** Dependency analysis must report 0 circular dependencies across `shared`, `backend`, and `frontend`.
- **Type safety:** Static type checks must pass in all packages with strict mode enabled.
- **Linting and formatting:** Lint and formatting checks must pass with 0 errors in automated verification.
- **Dev environment:** From a clean checkout, one documented setup command must bring all required services to healthy state within 120s without manual steps.

### Accessibility

- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text and interactive components (WCAG AA)
- All interactive elements reachable and operable via keyboard alone
- Focus indicators visible on all interactive elements during keyboard navigation
- State changes (todo created, completed, error) announced via `aria-live` regions without requiring visual attention
- Touch targets ≥ 44x44px on mobile breakpoints
