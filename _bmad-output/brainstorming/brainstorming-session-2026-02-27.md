---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Refining PRD for a simple full-stack Todo application'
session_goals: 'Identify gaps, sharpen design/technical decisions, explore angles to strengthen the PRD'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'SCAMPER Method']
ideas_generated: [34]
context_file: ''
technique_execution_complete: true
session_active: false
workflow_completed: true
facilitation_notes: 'User demonstrated strong architectural instincts with pragmatic scoping. Consistently chose simplicity over cleverness while maintaining extensibility. Key strength: identifying when a v2 deferral is the right call.'
---

# Brainstorming Session Results

**Facilitator:** dvd
**Date:** 2026-02-27

## Session Overview

**Topic:** Refining PRD for a simple full-stack Todo application
**Goals:** Identify gaps, sharpen design/technical decisions, and explore angles to strengthen the PRD before formal planning

### Context Guidance

_User has an existing PRD draft covering: CRUD operations for personal tasks, responsive frontend with instant feedback, small RESTful API with persistence, no auth/multi-user in v1 but architecture should allow it later. Intentionally excludes prioritization, deadlines, notifications, collaboration. Success = usable without guidance, stable across sessions, clear UX._

### Session Setup

_Fresh brainstorming session to refine and stress-test an existing PRD for a minimal todo app. Focus areas include UX polish, API design decisions, data model clarity, deployment simplicity, and future extensibility considerations._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Refining PRD for a simple full-stack Todo application with focus on identifying gaps and sharpening decisions

**Recommended Techniques:**

- **Question Storming:** Surface blind spots, undefined edge cases, and unstated assumptions in the PRD
- **SCAMPER Method:** Systematically refine each PRD decision through 7 lenses
- **Assumption Reversal:** Deferred — sufficient coverage achieved through first two techniques

## Technique Execution Results

### Question Storming (24 ideas)

**Interactive Focus:** UX edge cases, error handling & resilience, API design, data model, testing strategy, infrastructure

**Key Decisions Made:**

**UX Architecture:**
- **Empty state:** Placeholder todos filling the page to prevent layout shifts, replaced as real todos are created
- **List structure:** Single list with toggle/tab to switch between active and completed todos
- **Pagination:** Cursor-based, server-side sorting by `createdAt` (default) or `updatedAt`
- **Sort order:** Toggle button for ascending/descending
- **Visual states:** 3 treatments only — interactive (active/completed), syncing (status dot, row disabled), error (red accent, retry/dismiss)

**Optimistic UI & State Management:**
- Client-generated UUIDs as todo IDs
- Optimistic insertion at top of list, hide overflow beyond page size
- State machine per todo managing transitions (pending → confirmed → error)
- TanStack Query with optimistic mutations
- Backend upsert using UUID for idempotency on retry
- Todo is non-interactive (disabled, grayed out) during syncing state — no FE update queue
- Error state shows retry/review action
- API returns full updated object on all write operations

**API Design:**
- REST API for v1 (WebSocket deferred)
- Endpoints: CRUD for todos, sort/pagination via query params
- All writes return the mutated object
- Plan DB indexes for future text search but defer search UI to v2

**Data Model (Postgres):**
- `id` (UUID, client-generated)
- `text` (string, max length from shared env var)
- `completed` (boolean)
- `createdAt` (timestamp)
- `updatedAt` (timestamp, auto-updated via trigger)
- Postgres chosen over MongoDB for: referential integrity, B-tree indexes for sort/pagination, triggers for updatedAt, GIN indexes for future text search

**Configuration:**
- Static env vars in shared package for `pageSize` and `maxTextLength`
- No config endpoint in v1 — shared constants are source of truth
- Validation enforced at 3 layers: frontend, API, DB constraint

**Infrastructure:**
- Monorepo: `packages/frontend` (Svelte or React SPA), `packages/backend` (Fastify + Node.js), `packages/shared` (TypeScript interfaces, constants)
- Docker Compose for local dev: FE, BE, Postgres services
- Tests run against real Postgres instance with seed scripts
- Unit tests for state machine; integration tests for optimistic flow

**Deferred to v2:**
- TTL auto-deletion of completed todos (configurable, with visual indicators)
- Text search UI (indexes planned in v1 DB schema)
- Document attachments on todos
- Inline text editing
- WebSocket for multi-tab sync
- SSR migration (Svelte → SvelteKit path noted as smooth)

### SCAMPER Method (10 ideas)

**Building on Question Storming:** Systematically challenged settled decisions

**Key Refinements:**

- **Substitute:** Shared TypeScript interfaces in monorepo instead of tRPC — transport-agnostic type safety. SPA confirmed over SSR (SSR defeats caching purpose once auth is added).
- **Combine:** Input-as-first-row for todo creation + explicit "Add Todo" button — dual creation UX for different user preferences.
- **Adapt:** GitHub-style status dots for syncing/success/error states — less visually disruptive than full-row graying. Row still disabled during sync.
- **Eliminate:** Config endpoint removed in v1 — static shared constants sufficient until config becomes dynamic.
- **Modify:** Immediate deletion without confirmation (v1). Cursor-based pagination to avoid item shifting on mutations. Inline editing deferred to v2.
- **Reverse:** Sort toggle button (asc/desc) lets user choose mental model — "newest impulse" vs. "oldest obligation."

### Creative Facilitation Narrative

_Session started with UX edge cases (empty state, pagination, completed todo lifecycle) and quickly revealed that the TTL auto-deletion feature was deceptively complex — touching UI, data, API, and architecture simultaneously. User made the pragmatic call to defer it. The optimistic UI discussion produced the session's most architecturally significant decisions: client UUIDs, state machine per todo, 3-visual-state model, and upsert-based idempotency. SCAMPER refined rather than revolutionized, confirming that Question Storming had already surfaced the critical gaps. The MongoDB vs Postgres discussion validated the original instinct with concrete reasoning._

### Session Highlights

**User Creative Strengths:** Strong scoping instinct — consistently identified when a feature was v2 material. Excellent at seeing interaction between decisions (pagination + TTL conflict, SSR + auth conflict).
**Breakthrough Moments:** The 3-visual-state simplification (collapsing 5 internal states into 3 UI treatments), the input-as-placeholder pattern, cursor-based pagination as a natural fit for optimistic insertion.
**Energy Flow:** High and sustained throughout — user engaged deeply with every thread and made decisive calls.

## Idea Organization and Prioritization

**Thematic Organization:**

### Theme 1: UX & Interaction Design
- Empty state as input row with "Add Todo" button as alternative path
- Single list with active/completed toggle
- 3 visual states: interactive, syncing (status dot + disabled), error (red + retry)
- Placeholder rows fill page to prevent layout shift
- Sort toggle button (asc/desc), `createdAt` default, `updatedAt` alternate
- Immediate deletion without confirmation
- Inline editing deferred to v2

### Theme 2: Optimistic UI & Frontend Architecture
- Client-generated UUIDs as todo IDs
- Optimistic insertion at top of list, hide overflow beyond page size
- State machine per todo managing transitions
- TanStack Query with optimistic mutations
- Row disabled during sync, no FE update queue
- Error state with retry/review action

### Theme 3: API & Backend Design
- REST API with CRUD endpoints
- Upsert on UUID for idempotent writes
- All writes return full updated object
- Cursor-based pagination with server-side sorting
- DB indexes for future text search planned in v1

### Theme 4: Data Model & Persistence
- Postgres: `id` (UUID), `text`, `completed`, `createdAt`, `updatedAt`
- `updatedAt` auto-updated via Postgres trigger
- Validation at 3 layers: frontend, API, DB
- Max text length from shared env var

### Theme 5: Infrastructure & Developer Experience
- Monorepo: frontend (SPA), backend (Fastify), shared (interfaces + constants)
- Docker Compose for local dev (FE, BE, Postgres)
- Tests against real Postgres with seed scripts
- Unit tests for state machine, integration tests for optimistic flow
- Static shared env vars for config

### Theme 6: Deferred to v2
- TTL auto-deletion, text search UI, document attachments, inline editing, WebSocket sync, SSR migration, config endpoint

**Prioritization Results:**

- **Top Priority:** State machine + 3 visual states, client UUID + upsert idempotency, cursor-based pagination + server-side sort
- **Quick Wins:** Shared TypeScript interfaces, Docker Compose stack, `updatedAt` Postgres trigger
- **Most Innovative:** Input-as-first-row creation UX, pre-built search indexes without search UI

## Session Summary and Insights

**Key Achievements:**
- Transformed a high-level PRD into 34 concrete, actionable technical decisions
- Identified and deferred 7 features that were adding hidden complexity to v1
- Established a coherent architectural vision: optimistic UI with state machines, cursor pagination, shared type safety

**Session Reflections:**
The most valuable outcome was discovering that seemingly "simple" features (TTL deletion, inline editing, config endpoint) were actually complex enough to jeopardize v1 scope. The PRD now has clear boundaries, an explicit v2 backlog, and technical decisions grounded in trade-off analysis rather than assumption.
