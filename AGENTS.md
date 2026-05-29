# AGENTS.md

## Project

Project name: tsi-cleanup

This is an internal review and recommendation tool for TSI Cleanup.

The tool helps users process menus attached to scraping clusters that failed scraping. It should reduce manual checking by validating current menu URLs, detecting obvious URL, format, or source issues, suggesting the correct cleanup status, and keeping a human reviewer in control of the final decision.

This app is not a full scraper. It must not automatically detach, exclude, move, or update production records without explicit human confirmation.

---

## Core product goal

Build a low-cost, scalable workflow for 2,000+ failed menu/location checks.

The system should:

1. Accept failed menu records from a CSV upload first.
2. Later support fetching failed menu records from an API.
3. Validate and normalize input data.
4. Run cheap URL and content checks first.
5. Recommend one of the existing cleanup statuses.
6. Show evidence and confidence for each recommendation.
7. Let a human reviewer confirm or override the recommendation.
8. Export a reviewed CSV compatible with the current cleanup workflow.

---

## Existing cleanup statuses

Use only these final statuses unless explicitly instructed otherwise:

- Pending
- URL Updated
- No need to update - Still valid
- Excluded
- Format updated
- Moved to another brand
- Other

Do not invent new final statuses.

Internal reason codes are allowed, for example:

- current_url_valid
- current_url_inaccessible
- candidate_url_found
- format_mismatch_detected
- valid_but_scrape_failed_escalate_to_vilius
- manual_review_required

Internal reason codes must map back to one of the official statuses above.

---

## Domain rules

### General cleanup logic

- Always check the current menu URL first.
- If the current URL works and appears to show the correct menu/source, do not search for a replacement just because another platform has higher priority.
- Only search for a replacement URL when the current URL is invalid, expired, inaccessible, redirected incorrectly, or clearly unusable.
- If a menu/source appears valid but still cannot be scraped, do not recommend a URL update. Recommend human review or escalation.
- Do not automatically exclude a menu. Exclusion must remain human-confirmed.
- Do not automatically move a menu to another brand. Brand movement must remain human-confirmed.
- Do not use screenshots by default. They are too expensive to store and maintain at this scale.

### Platform/source priority

When the current URL is unusable and a replacement must be found, prefer sources in this order:

1. Deliveroo
2. UberEats
3. JustEat
4. Foodhub
5. PDF/Image menu
6. Own website menu

Important: the priority order is only used when looking for a replacement. It should not override a current URL that is already valid.

### Status recommendation rules

Use these first-pass rules:

- Recommend No need to update - Still valid when the current URL loads and appears to show the correct menu/source.
- Recommend URL Updated when the current URL is unusable and a better valid menu URL is found.
- Recommend Format updated when the same URL is valid but the detected content format differs from the stored menu format.
- Recommend Excluded only when the current URL is unusable and no usable replacement source can be found.
- Recommend Moved to another brand only when evidence suggests the menu belongs to a different existing brand.
- Recommend Other when evidence is conflicting, incomplete, or requires special handling.
- Keep Pending for records that have not been checked yet.

---

## Input data v1

The first MVP must support CSV upload.

Required input columns:

- brand_id
- brand_name
- menu_id
- menu_url
- scraping_status
- cluster_id
- template_name

Optional input columns:

- menu_link
- brand_gateway_task_link
- menu_definition_task_link
- scraper
- status
- comment
- menu_format

The app must validate required columns before processing. If required columns are missing, show a clear error and do not process the file.

---

## Output data v1

Each processed row should support these fields:

- menu_id
- brand_id
- brand_name
- cluster_id
- template_name
- current_menu_url
- scraping_status
- current_url_result
- http_status
- final_url
- detected_platform
- content_type
- format_detected
- menu_content_detected
- brand_match
- candidate_new_url
- candidate_source
- recommended_status
- confidence
- recommendation_reason
- human_final_status
- human_comment
- needs_escalation
- escalation_reason

---

## Recommended architecture

Use a boring, maintainable architecture.

Recommended shape:

- Web UI for CSV upload, review table, filters, overrides, and CSV export.
- Core domain module for validation, URL checks, platform detection, and recommendation rules.
- Keep business logic outside UI components.
- Keep URL checking separate from recommendation rules.
- Keep CSV parsing separate from domain logic.
- Keep future API ingestion separate from CSV ingestion.

Preferred logical modules:

- csv-import
- input-validation
- url-checker
- platform-detection
- content-checker
- recommendation-engine
- review-state
- csv-export

Do not couple the UI directly to URL-checking or recommendation rules.

---

## Cost and scale rules

This tool must be designed for thousands of menu checks.

Use this tiered approach:

1. Cheap URL parsing and validation.
2. HTTP status and redirect checks.
3. Lightweight content-type and text checks.
4. Replacement URL discovery only when the current URL is invalid.
5. Playwright/browser fallback only for unclear or JS-heavy cases.

Do not use Playwright as the default checker.

Avoid storing screenshots by default.

Avoid unnecessary background complexity in the MVP.

---

## MVP scope

Build now:

- CSV upload.
- Required column validation.
- Data normalization.
- URL status checking.
- Redirect/final URL detection.
- Content-type detection.
- Basic platform detection.
- Basic recommendation rules.
- Review table.
- Human override.
- CSV export.

Do later:

- API ingestion.
- Production write-back.
- Playwright fallback.
- Replacement URL search automation.
- User roles.
- Persistent job orchestration.
- Screenshot evidence.
- Direct escalation workflow.
- Full AE integration.

Avoid now:

- Automatic exclusion.
- Automatic brand movement.
- Automatic production updates.
- Airflow.
- Complex multi-agent workflows.
- Full scraping reproduction.

---

## UI principles

### Visual quality brief

For any meaningful UI work, read:

- docs/visual-quality-brief.md

Follow that brief before inventing new UI patterns.

Do not create generic AI-looking interfaces. The UI should be restrained, operational, information-dense, and consistent.

For meaningful UI changes, verify the result visually when possible:

- inspect the app in browser with Playwright
- check 1440px desktop
- check mobile layout
- verify loading, empty, error, disabled, hover, focus, and long-content states where relevant
- fix obvious visual mismatches before reporting done

Playwright is for UI verification only unless a task explicitly asks for browser-based URL checking.

Build a clean operational review UI, not a flashy dashboard.

The main screen should help reviewers answer:

- What failed?
- What did the system check?
- What status is recommended?
- Why?
- How confident is it?
- What should I confirm or override?

UI requirements:

- Dense but readable review table.
- Filters for status, confidence, platform, URL result, and escalation needed.
- Clear row-level evidence.
- Clear human override controls.
- No hidden critical information.
- Avoid unnecessary charts.
- Avoid decorative UI that slows review work.

Preferred UI style:

- Simple table-first layout.
- Clear badges for status and confidence.
- Minimal color usage.
- Good empty, error, and loading states.
- Accessible labels and keyboard-friendly controls.

---

## Karpathy-style engineering principles

Follow these principles when implementing:

1. Keep the system simple and inspectable.
2. Prefer small, obvious code over clever abstractions.
3. Make the data flow easy to trace.
4. Build the smallest useful version first.
5. Use deterministic rules before using AI or browser automation.
6. Add complexity only after a real failing case proves it is needed.
7. Make intermediate outputs visible and debuggable.
8. Write code that can be deleted or replaced easily.
9. Prefer boring tools and explicit state.
10. Test the core logic with small golden examples.
11. Do not hide uncertainty; represent it as confidence and reasons.
12. Optimize for reviewer trust, not automation theater.

---

## Context management rules for Codex

Codex should manage context carefully.

Before making changes:

1. Read this AGENTS.md.
2. Read README.md if it exists.
3. Read only the files needed for the current task.
4. Inspect related tests before changing implementation.
5. Summarize the intended change briefly before editing.

While working:

- Keep changes small and local.
- Do not rewrite unrelated files.
- Do not change architecture unless the task asks for it.
- Do not introduce new libraries unless there is a clear need.
- Prefer modifying existing patterns over inventing new ones.
- If context is large, focus on the specific module and ask for clarification instead of guessing.
- Preserve existing public interfaces unless the task explicitly asks to change them.
- When adding a new concept, add or update its type/schema/test in the same change.

When working on UI:

- read docs/visual-quality-brief.md before editing UI files
- inspect existing UI patterns before adding new components
- avoid adding new visual systems, palettes, shadows, or spacing rules unless requested
- keep visual changes local and easy to review

After working:

- Summarize what changed.
- Mention files changed.
- Mention tests/checks run.
- Mention any checks that were skipped and why.
- Mention assumptions or open questions.

If the task becomes too broad, stop and propose a smaller implementation plan.

---

## Coding standards

Use TypeScript or Python with strong validation.

If TypeScript:

- Use strict TypeScript.
- Use Zod or equivalent for schema validation.
- Keep domain types explicit.
- Add unit tests for recommendation rules.
- Avoid any unless there is a documented reason.

If Python:

- Use Pydantic for schemas.
- Use httpx for HTTP checks.
- Use ruff, mypy, and pytest.
- Keep side effects outside pure recommendation functions.

General:

- Pure functions for status recommendation logic.
- Explicit enums/constants for official statuses.
- No magic strings scattered across the codebase.
- No network calls inside pure rule functions.
- No UI-only implementation of business rules.
- No silent failures.
- No hidden global state for business logic.
- No hardcoded production credentials.
- No full-dataset logging.

---

## Testing expectations

Every meaningful change must include or update tests.

Minimum required tests:

- CSV required-column validation.
- CSV normalization.
- Platform detection.
- URL result mapping.
- Recommendation rules.
- Confidence scoring.
- CSV export shape.

Use small fixtures that represent real cleanup cases:

- Current URL valid.
- Current URL inaccessible.
- Current URL redirects.
- Candidate URL found.
- Format mismatch.
- No replacement found.
- Ambiguous/manual review.
- Moved-to-another-brand candidate.

Do not mark work complete unless the relevant checks pass.

If project commands exist, run them before finishing.

Suggested commands for TypeScript projects:

- npm run lint
- npm run typecheck
- npm run test
- npm run build

Suggested commands for Python projects:

- ruff check .
- mypy .
- pytest

If commands are missing, add them before the project grows.

---

## Preferred implementation order

Build in this order:

1. Define statuses and domain types.
2. Define CSV input schema.
3. Define normalized failed-menu record shape.
4. Define processed output row shape.
5. Implement CSV validation.
6. Implement platform detection.
7. Implement URL check result types.
8. Implement recommendation engine as pure functions.
9. Add tests for the above.
10. Build the UI table.
11. Add manual override state.
12. Add CSV export.
13. Add actual async URL checking.
14. Add persistence only when needed.
15. Add API ingestion only after confirmed.

Do not start with Playwright, database design, auth, or orchestration.

---

## Codex working style

Before coding:

- Inspect the repository.
- Identify the smallest safe change.
- State a brief plan.
- Implement only the requested scope.

While coding:

- Make small, reviewable changes.
- Keep domain logic separate from UI.
- Update tests with implementation.
- Avoid large rewrites unless explicitly requested.
- Prefer explicit schemas and typed outputs.

After coding:

- Run relevant checks.
- Summarize what changed.
- Mention skipped checks and why.
- Mention remaining assumptions or open questions.

---

## AI/tooling guardrails

Do not add AI-based classification unless explicitly requested.

This MVP should rely on deterministic checks and transparent rules.

Do not add MCP, plugins, subagents, or complex agent workflows unless the task specifically requires them.

Use skills or reusable workflows only after a pattern has repeated enough times to justify it.

Do not use browser automation as the default evidence collection strategy.

Do not build a multi-agent system for this MVP.

---

## Data safety

Treat uploaded CSV data as operational business data.

- Do not log full datasets unnecessarily.
- Do not expose sensitive internal links in public output.
- Do not send production data to external services unless explicitly approved.
- Keep sample fixtures small and sanitized.
- Do not hardcode credentials, tokens, or internal API keys.
- Do not commit real production CSV files unless explicitly approved.

---

## Open assumptions

These assumptions should remain visible until confirmed:

- Failed menu records may later be fetched from an API.
- The first version uses CSV upload.
- The tool recommends statuses but does not write directly to AE.
- Human confirmation is required for final cleanup decisions.
- Screenshots are excluded from default evidence due to cost.
- Playwright is fallback-only, not the primary validation method.
- Replacement URL discovery is not part of the first implementation unless explicitly requested.

When any assumption changes, update this file and related docs.