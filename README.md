# tsi-cleanup

Internal review scaffold for TSI Cleanup failed-menu checks.

This initial scaffold is intentionally small. It defines the core domain types,
CSV input validation/normalization, official cleanup statuses, and a pure
placeholder recommendation engine. It does not perform live URL checks,
production updates, API ingestion, authentication, screenshot capture, or AI
classification.

## Repository Structure

```text
src/
  csv/
    input-schema.ts          CSV columns, header validation, row normalization
  domain/
    recommendation-engine.ts Pure placeholder recommendation rules
    statuses.ts              Official cleanup status constants and type guard
    types.ts                 Normalized input and processed output row types
tests/
  csv-input-schema.test.ts
  recommendation-engine.test.ts
  statuses.test.ts
```

## Local Setup

```bash
pnpm install
```

## Checks

```bash
pnpm run lint
pnpm test
pnpm run typecheck
pnpm run build
```

## Current Assumptions

- CSV upload is the first ingestion path.
- Recommendations are deterministic placeholders until real URL/content checks
  are added.
- Human confirmation is required for final cleanup decisions.
- No production records are updated by this scaffold.
