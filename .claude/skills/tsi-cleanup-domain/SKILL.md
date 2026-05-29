---
name: tsi-cleanup-domain
description: Use when implementing or reviewing TSI Cleanup domain logic: statuses, CSV fields, platform detection, URL evidence, recommendation rules, confidence, review state, or CSV export.
---

# TSI Cleanup Domain Skill

## Purpose

Keep TSI Cleanup domain behavior consistent and simple.

Use this skill for changes touching:

- cleanup statuses
- CSV input/output fields
- platform/source detection
- URL/format evidence
- recommendation rules
- confidence scoring
- human review behavior
- CSV export

## Core rule

The tool recommends actions. A human confirms final decisions.

Never implement automatic production write-back, exclusion, brand movement, detach, or AE updates unless explicitly requested.

## Official statuses

Use only:

- `Pending`
- `URL Updated`
- `No need to update - Still valid`
- `Excluded`
- `Format updated`
- `Moved to another brand`
- `Other`

Do not add final statuses without asking.

## Recommendation rules

- No check performed → `Pending`
- Current URL valid → `No need to update - Still valid`
- Current URL valid but scrape still fails → `No need to update - Still valid` with escalation
- Current URL unusable + valid candidate URL → `URL Updated`
- Valid URL + format mismatch → `Format updated`
- Current URL unusable + no replacement → `Excluded`
- Belongs to another existing brand → `Moved to another brand`
- Conflicting/incomplete evidence → `Other`

Prefer safe outcomes for ambiguity. Exclusion and brand movement must remain human-confirmed.

## Source priority

Check the current URL first.

Only when replacement is needed:

1. Deliveroo
2. UberEats
3. JustEat
4. Foodhub
5. PDF/Image
6. Own website

## Evidence rules

Recommendation logic should consume structured evidence, not raw network responses.

Keep the recommendation engine pure.

Do not do HTTP calls, file reads, browser automation, or CSV parsing inside recommendation logic.

## Confidence

Use:

- `High`
- `Medium`
- `Low`

Represent uncertainty with `confidence` and `recommendation_reason`.

## CSV input

Required:

- `brand_id`
- `brand_name`
- `menu_id`
- `menu_url`
- `scraping_status`
- `cluster_id`
- `template_name`

Optional:

- `menu_link`
- `brand_gateway_task_link`
- `menu_definition_task_link`
- `scraper`
- `status`
- `comment`
- `menu_format`

## Testing

When changing domain logic, add/update tests.

Run:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm test`
- `pnpm run build`

## Style

Prefer explicit TypeScript types, small pure functions, constants for statuses, reason codes over free text, and deterministic behavior.

Avoid magic strings, UI-only business rules, network calls in pure logic, Playwright as default checking, AI classification, broad rewrites, and unnecessary dependencies.