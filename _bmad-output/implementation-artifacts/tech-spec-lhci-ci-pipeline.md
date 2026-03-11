---
title: 'LHCI Autorun in CI Pipeline'
slug: 'lhci-ci-pipeline'
created: '2026-03-11'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['@lhci/cli', 'GitHub Actions', 'Docker Compose', 'Nginx', 'Fastify', 'Playwright Chromium']
files_to_modify: ['.github/workflows/ci.yml', 'lighthouserc.cjs']
code_patterns: ['CI jobs: checkout → pnpm setup → node setup → pnpm install', 'lighthouserc.cjs uses startServerCommand for docker compose']
test_patterns: ['LHCI assertions as quality gate — pipeline fails on score regression']
---

# Tech-Spec: LHCI Autorun in CI Pipeline

**Created:** 2026-03-11

## Overview

### Problem Statement

Lighthouse audits aren't part of the CI pipeline — there's no automated quality gate for performance, accessibility, best-practices, or SEO regressions. The `@lhci/cli` package and `lighthouserc.cjs` are already configured, but the CI workflow doesn't run `npx lhci autorun`.

### Solution

Add a new `lighthouse` job to `ci.yml` that runs `npx lhci autorun`. The job has no `services:` block — docker compose handles all infrastructure (postgres, backend, frontend/nginx). Add LHCI assertion thresholds to `lighthouserc.cjs` so the pipeline fails on score regressions. Results publish to temporary-public-storage (link in job logs).

### Scope

**In Scope:**

- Add a new `lighthouse` job to the CI pipeline (no services, compose handles everything)
- Add assertion thresholds to `lighthouserc.cjs` (pipeline fails on score regression)

**Out of Scope:**

- PR comment integration for lighthouse links
- LHCI server (self-hosted) setup
- Changing the existing `check-lighthouse.ts` CLS validation script
- Modifying `docker-compose.yml` or Dockerfiles

## Context for Development

### Codebase Patterns

- CI jobs use `pnpm/action-setup@v4`, `actions/setup-node@v4` with node 24, `pnpm install --frozen-lockfile`
- `lighthouserc.cjs` already configured with:
  - `startServerCommand: "docker compose up -d --wait && echo 'Server ready'"` — builds and starts postgres + backend + frontend via compose
  - `url: ["http://localhost:80"]` — hits nginx-served frontend
  - `chromePath` detection using Playwright's installed chromium binary
  - `chromeFlags: "--no-sandbox --disable-setuid-sandbox"` — required for CI
  - `upload.target: "temporary-public-storage"`
- `docker-compose.yml` defines: postgres (5432), backend (3001), frontend/nginx (80)
- Backend connects to postgres via Docker network hostname `postgres`, not localhost
- Frontend Dockerfile: multi-stage build → nginx on port 80

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.github/workflows/ci.yml` | CI pipeline — add new `lighthouse` job |
| `lighthouserc.cjs` | LHCI config — add `assert` section for thresholds |
| `docker-compose.yml` | Compose config — used as-is by LHCI's startServerCommand |

### Technical Decisions

- **Separate job, no services**: A dedicated `lighthouse` job with no `services:` block. Docker compose manages all infrastructure (postgres, backend, frontend). No port conflicts, clean separation of concerns.
- **Job placement**: Runs after `e2e-tests` (parallel with `performance`), since it's independent — it doesn't need the performance job's postgres service or any of its outputs.
- **Assertion thresholds**: Conservative starting points to avoid false failures — tighten over time.
- `temporary-public-storage` upload target is sufficient (no LHCI server needed).

## Implementation Plan

### Tasks

- [ ] Task 1: Add LHCI assertion thresholds to `lighthouserc.cjs`
  - File: `lighthouserc.cjs`
  - Action: Add an `assert` section to the `ci` config object with minimum score thresholds:
    ```js
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
      },
    },
    ```
  - Notes: Conservative performance threshold (0.7) since CI runners have variable compute. Accessibility, best-practices, and SEO set higher (0.9) since they're not hardware-dependent.

- [ ] Task 2: Add `lighthouse` job to CI pipeline
  - File: `.github/workflows/ci.yml`
  - Action: Add a new job after `performance` (or parallel to it):
    ```yaml
    lighthouse:
      name: Lighthouse Audit
      needs: e2e-tests
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4

        - uses: pnpm/action-setup@v4

        - uses: actions/setup-node@v4
          with:
            node-version: "24"
            cache: "pnpm"

        - run: pnpm install --frozen-lockfile

        - name: Install Playwright browsers
          run: npx playwright install --with-deps chromium

        - name: Lighthouse CI audit
          run: npx lhci autorun
    ```
  - Notes: No `services:` block — `lhci autorun` reads `lighthouserc.cjs`, which runs `docker compose up -d --wait` as `startServerCommand`. Compose builds images and starts postgres + backend + frontend. LHCI manages the server lifecycle (starts before collect, shuts down after). Playwright chromium install is needed so `lighthouserc.cjs` can find the chrome binary.

### Acceptance Criteria

- [ ] AC 1: Given the CI pipeline runs, when the `lighthouse` job executes, then `npx lhci autorun` runs successfully: docker compose builds and starts all services, lighthouse audits `localhost:80`, results upload to temporary-public-storage, and a report URL appears in the job logs.
- [ ] AC 2: Given lighthouse scores are above the configured thresholds (performance >= 0.7, accessibility >= 0.9, best-practices >= 0.9, SEO >= 0.9), when `lhci autorun` completes, then the step exits with code 0 and the job passes.
- [ ] AC 3: Given a lighthouse score drops below a configured threshold, when `lhci autorun` completes, then the step exits with a non-zero code and the pipeline fails.
- [ ] AC 4: Given the `lighthouse` job runs in parallel with the `performance` job (both need `e2e-tests`), when both execute, then they do not interfere with each other since the `lighthouse` job uses compose-managed containers and the `performance` job uses GitHub Actions services.

## Additional Context

### Dependencies

- `@lhci/cli` ^0.15.1 — already in devDependencies
- Playwright chromium — installed in the job step
- Docker Compose — available on `ubuntu-latest` runners by default
- Docker images build during `lhci autorun` — first run will be slower due to image builds (no cache)

### Testing Strategy

- **No unit/integration tests needed** — this is CI pipeline configuration, not application code.
- **Manual verification**: Push branch, open PR against `main`, observe the `lighthouse` job:
  1. Verify `lighthouse` job appears in the pipeline and runs after `e2e-tests`
  2. Verify docker compose builds and starts services successfully
  3. Verify lighthouse report URL appears in logs
  4. Verify assertion results appear (pass/fail per category)
  5. Verify `performance` job still passes independently

### Notes

- **Docker image build time**: First CI run will be slower since images need building. GitHub Actions Docker layer caching could help but is out of scope.
- **Flaky scores**: CI runner performance varies. If performance score is flaky around 0.7, consider lowering to 0.6 or adding `numberOfRuns: 3` to the collect config for median-based scoring.
- **Future improvements**: PR comments with lighthouse scores, LHCI server for historical tracking, Docker layer caching in CI.
