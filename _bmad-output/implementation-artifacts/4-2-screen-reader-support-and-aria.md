# Story 4.2: Screen Reader Support & ARIA

Status: done

## Story

As a user relying on assistive technology,
I want state changes announced automatically,
so that I can track what's happening without visual attention.

## Acceptance Criteria

1. **Given** the TodoList container
   **When** it renders
   **Then** it has role="list" and aria-live="polite"
   **And** new todo insertions are announced to screen readers

2. **Given** a TodoRow
   **When** it renders
   **Then** it has role="listitem"
   **And** aria-disabled="true" when in syncing state

3. **Given** the delete icon button
   **When** it renders
   **Then** it has aria-label="Delete todo: [todo text]"

4. **Given** the retry icon button
   **When** it renders
   **Then** it has aria-label="Retry todo: [todo text]"

5. **Given** the StatusDot component
   **When** it renders in syncing state
   **Then** it has role="status" and aria-label="Syncing"

6. **Given** the StatusDot component
   **When** it renders in error state
   **Then** it has role="status" and aria-label="Error"

7. **Given** the sort toggle button
   **When** the sort is newest first
   **Then** it has aria-label="Sort order: newest first"
   **And** the label updates dynamically when toggled

8. **Given** the input field
   **When** it renders
   **Then** it has aria-label="New todo text"
   **And** aria-describedby links to the validation error message when present

9. **Given** the shadcn Tabs component
   **When** it renders
   **Then** it provides role="tablist", role="tab", and aria-selected automatically

## Tasks / Subtasks

- [x] Task 1 — Audit existing ARIA implementation against all ACs
  - [x] TodoList: role="list" + aria-live="polite" — `todo-list.tsx:38` ✓
  - [x] TodoRow: role="listitem" + aria-disabled on syncing — `todo-row.tsx:26-27` ✓
  - [x] Delete button: aria-label="Delete todo: [text]" — `todo-row.tsx:81` ✓
  - [x] Retry button: aria-label="Retry todo: [text]" — `todo-row.tsx:68` ✓
  - [x] StatusDot: role="status" + aria-label — `status-dot.tsx:14-15` ✓
  - [x] Sort toggle: aria-label="Sort order: [label]" — `app-header.tsx:19` ✓
  - [x] Input: aria-label + aria-describedby + aria-invalid — `input-area.tsx:53-55` ✓
  - [x] Tabs: Radix TabsPrimitive provides role="tablist", role="tab", aria-selected natively ✓
- [x] Task 2 — Verify existing tests cover each AC
  - [x] `todo-list.test.tsx:96-110` covers AC 1 (role="list", aria-live="polite") ✓
  - [x] `todo-row.test.tsx:17-31` covers AC 2 (role="listitem") ✓
  - [x] `todo-row.test.tsx:48-59` covers AC 2 (aria-disabled on syncing) ✓
  - [x] `todo-row.test.tsx:84` covers AC 3 (delete aria-label) ✓
  - [x] `todo-row.test.tsx:71` covers AC 4 (retry aria-label) ✓
  - [x] `status-dot.test.tsx:11-16` covers AC 5 (syncing role="status" + aria-label) ✓
  - [x] `status-dot.test.tsx:18-23` covers AC 6 (error role="status" + aria-label) ✓
  - [x] `app-header.test.tsx:30-34` covers AC 7 (sort toggle dynamic aria-label) ✓
  - [x] `input-area.test.tsx:13-16` covers AC 8 (input aria-label) ✓
  - [x] `input-area.test.tsx:121-130` covers AC 8 (aria-describedby) ✓
  - [x] Radix TabsPrimitive handles AC 9 natively (verified in app-tab-filtering tests) ✓
- [x] Task 3 — No gaps found — all ARIA already implemented in prior epics
- [x] Task 4 — Full test suite passes: 176/176 tests, 0 type errors, 0 lint errors

## Dev Notes

### Current State Assessment

Based on codebase analysis, ALL ARIA requirements are ALREADY IMPLEMENTED:

| AC | Feature | Status | Location |
|----|---------|--------|----------|
| 1 | TodoList role="list" + aria-live="polite" | DONE | `todo-list.tsx:38` |
| 2 | TodoRow role="listitem" + aria-disabled | DONE | `todo-row.tsx:26-27` |
| 3 | Delete button aria-label | DONE | `todo-row.tsx:81` |
| 4 | Retry button aria-label | DONE | `todo-row.tsx:68` |
| 5 | StatusDot syncing: role="status" + aria-label="Syncing" | DONE | `status-dot.tsx:14-15` |
| 6 | StatusDot error: role="status" + aria-label="Error" | DONE | `status-dot.tsx:14-15` |
| 7 | Sort toggle aria-label | DONE | `app-header.tsx:19` |
| 8 | Input aria-label + aria-describedby + aria-invalid | DONE | `input-area.tsx:53-55` |
| 9 | Tabs role="tablist" + role="tab" + aria-selected | DONE | Radix TabsPrimitive handles this natively |

### Existing Test Coverage

Most ARIA attributes are already tested in existing test files:
- `todo-list.test.tsx:96-110` — role="list", aria-live="polite"
- `todo-row.test.tsx:48-59` — aria-disabled on syncing
- `todo-row.test.tsx:131-147` — aria-describedby for error message
- `todo-row.test.tsx:71,84` — aria-label on retry/delete buttons
- `status-dot.test.tsx` — role="status" and aria-label
- `app-header.test.tsx` — aria-label on sort toggle
- `input-area.test.tsx:13-16,121-130` — aria-label, aria-describedby

### Strategy

This story is primarily a VERIFICATION story. All ACs are already implemented.
The work is: verify existing tests cover all ACs, add any missing test assertions.

### References

- Story ACs: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- Architecture: [Source: _bmad-output/planning-artifacts/architecture.md#Accessibility]
- Previous story: [Source: _bmad-output/implementation-artifacts/4-1-keyboard-navigation-and-focus-management.md]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- All 9 ARIA ACs were already fully implemented during Epics 1-3
- All ARIA attributes are covered by existing tests (verified across 6 test files)
- No new code or tests needed — pure verification story
- 176/176 tests pass, 0 type errors, 0 lint errors

### Change Log

- 2026-03-07: Verified Story 4.2 — All ARIA requirements already satisfied by existing implementation

### File List

No files modified — all ACs were already implemented.
