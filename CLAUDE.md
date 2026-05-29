# CLAUDE.md

## Project

`tsi-cleanup` is an internal review and recommendation tool for TSI Cleanup.

It helps reviewers process menus attached to scraping clusters that failed scraping by checking menu URLs, detecting obvious issues, recommending a cleanup status, and keeping a human reviewer in control.

This is not a full scraper. Do not automatically exclude, move, detach, update production records, or write back to AE unless explicitly asked.

## Read first

Before meaningful changes, read:

- `docs/product-scope.md`
- `docs/visual-quality-brief.md`
- `AGENTS.md` if present

Follow the current user request first, then this file, then existing docs/tests.

## MVP scope

In scope:

- CSV import
- required column validation
- row normalization
- platform/source detection
- cheap URL evidence modeling
- pure recommendation rules
- review table
- human override
- CSV export

Out of scope unless explicitly requested:

- production write-back
- auth/user roles
- database persistence
- API ingestion
- Playwright menu checking
- screenshots
- automated search discovery
- full scraping reproduction
- AI classification
- orchestration tools

## Official statuses

Use only these final statuses:

- `Pending`
- `URL Updated`
- `No need to update - Still valid`
- `Excluded`
- `Format updated`
- `Moved to another brand`
- `Other`

Internal reason codes are allowed, but they must map to one of these statuses.

## Domain rules

Always check the current menu URL first.

If the current URL works, do not search for a replacement just because another platform has higher priority.

Only look for a replacement when the current URL is invalid, expired, inaccessible, redirected incorrectly, or clearly unusable.

If a menu/source appears valid but still cannot be scraped, recommend review/escalation, not a URL update.

Exclusion and brand movement must remain human-confirmed.

Do not use screenshots by default.

## Source priority

When the current URL is unusable and a replacement is needed:

1. Deliveroo
2. UberEats
3. JustEat
4. Foodhub
5. PDF/Image
6. Own website

This priority must not override a current URL that already works.

## Architecture rules

Keep business logic outside UI components.

Keep recommendation rules pure and deterministic.

Keep URL checking separate from recommendation rules.

Keep CSV parsing separate from domain logic.

Keep future API ingestion separate from CSV ingestion.

Avoid dependencies unless they clearly reduce complexity.

`src/index.ts` should mostly re-export public modules, not contain business logic.

## Karpathy-style principles

- Keep it simple and inspectable.
- Prefer small obvious code over clever abstractions.
- Make data flow easy to trace.
- Build the smallest useful version first.
- Use deterministic rules before AI/browser automation.
- Add complexity only after a real failing case proves it is needed.
- Make intermediate outputs visible and debuggable.
- Write code that can be deleted or replaced easily.
- Prefer boring tools and explicit state.
- Test core logic with small golden examples.
- Represent uncertainty with confidence and reason codes.
- Optimize for reviewer trust, not automation theater.

## Context management

Before editing:

- inspect the existing structure
- read only files needed for the task
- inspect related tests
- state a short plan

While editing:

- keep changes small
- do not rewrite unrelated files
- do not change architecture unless asked
- preserve public interfaces unless necessary
- add/update tests with implementation

After editing:

- run relevant checks
- summarize changed files
- mention commands run
- mention skipped checks and assumptions

If the task becomes broad, stop and propose a smaller plan.

## Commands

Use actual `package.json` scripts.

Expected checks:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm test`
- `pnpm run build`

Do not mark work complete until relevant checks pass.

## UI rules

For UI work, read `docs/visual-quality-brief.md`.

Build an operational review interface, not a generic dashboard.

Avoid fake metrics, decorative cards, gradients, glassmorphism, emoji-heavy UI, generic SaaS styling, low-contrast text, and unnecessary animations.

Use Playwright for visual verification only, unless explicitly asked otherwise.

## Data safety

Treat uploaded CSVs as operational business data.

Do not log full datasets, commit real production CSV files, hardcode secrets, or send production data to external services unless approved.

Use small sanitized fixtures for tests.

## Development sequence

Continue in this order unless the user changes direction:

1. platform/source detection
2. URL check result types
3. cheap HTTP checker
4. CSV parser/importer
5. CSV export
6. minimal review UI
7. manual override state

Do not jump to Playwright, database, auth, API ingestion, or orchestration before core logic is stable.