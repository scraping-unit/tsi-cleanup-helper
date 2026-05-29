# Product Scope

## Product

`tsi-cleanup` is an internal review and recommendation tool for TSI Cleanup.

It helps reviewers process menus attached to scraping clusters that failed scraping by checking the current menu URL, detecting obvious issues, suggesting a cleanup status, and allowing a human reviewer to confirm or override the recommendation.

The tool should reduce manual checking, but it should not make irreversible production decisions automatically.

---

## Problem

Failed scraping menus are currently reviewed manually.

Reviewers need to check whether the current menu URL is still usable, whether the menu needs a URL update, whether the format is wrong, whether the menu should be excluded, or whether it belongs to another brand.

This becomes time-consuming when there are many failed menus.

---

## MVP goal

The MVP should provide a simple workflow:

1. Upload a CSV of failed menus.
2. Validate the required columns.
3. Normalize the rows.
4. Run basic URL/source checks.
5. Recommend one of the existing cleanup statuses.
6. Show a clear reason and confidence level.
7. Let the reviewer confirm or override the recommendation.
8. Export a reviewed CSV.

---

## MVP input

The first version uses CSV upload.

Required columns:

- brand_id
- brand_name
- menu_id
- menu_url
- scraping_status
- cluster_id
- template_name

Optional columns:

- menu_link
- brand_gateway_task_link
- menu_definition_task_link
- scraper
- status
- comment
- menu_format

Future versions may fetch failed menu records directly from an API, but API ingestion is not part of the first build.

---

## MVP output

Each processed row should support:

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

## Official cleanup statuses

The tool must use only these final statuses:

- Pending
- URL Updated
- No need to update - Still valid
- Excluded
- Format updated
- Moved to another brand
- Other

Internal reason codes are allowed, but they must map back to one of these statuses.

---

## MVP recommendation behavior

The first version should follow simple, transparent rules:

- If the current URL works and appears valid, recommend `No need to update - Still valid`.
- If the current URL is unusable and a valid replacement URL is found, recommend `URL Updated`.
- If the same URL works but the detected format differs from the stored format, recommend `Format updated`.
- If the current URL is unusable and no usable replacement source is found, recommend `Excluded`.
- If the menu appears to belong to another existing brand, recommend `Moved to another brand`.
- If the result is unclear, recommend `Other`.
- If the row has not been checked yet, keep it as `Pending`.

---

## Source priority

Always check the current URL first.

If the current URL is valid, do not search for a replacement just because another platform has higher priority.

If the current URL is unusable and a replacement is needed, use this priority:

1. Deliveroo
2. UberEats
3. JustEat
4. Foodhub
5. PDF/Image menu
6. Own website menu

---

## Human confirmation

The tool may recommend a status, but a human reviewer must confirm the final decision.

The tool must not automatically:

- exclude a menu
- move a menu to another brand
- update production records
- detach menus from clusters
- write back to AE or any production system

---

## In scope for MVP

Build now:

- CSV upload
- Required column validation
- Row normalization
- Official status constants/types
- Basic platform detection
- Basic URL check result model
- Basic recommendation engine
- Review table
- Human status override
- Human comment field
- CSV export
- Unit tests for core logic

---

## Out of scope for MVP

Do not build yet:

- API ingestion
- Production write-back
- Authentication or user roles
- Database persistence
- Playwright-based menu checking
- Screenshot storage
- Automated Google/search replacement discovery
- Full scraping reproduction
- Direct Vilius escalation workflow
- Airflow, Prefect, or complex orchestration
- AI-based classification
- Multi-agent workflows

---

## Later phases

Potential future improvements:

- Fetch failed menus directly from an API.
- Save review sessions in a database.
- Add background URL checking jobs.
- Add replacement URL discovery.
- Add Playwright fallback only for unclear or JavaScript-heavy cases.
- Add AE integration for controlled write-back.
- Add role-based permissions.
- Add audit history.
- Add escalation tracking.

---

## Non-goals

This project is not:

- a full scraper
- a replacement for human QC judgment
- a tool for automatic production updates
- a visual analytics dashboard
- a general-purpose crawling platform
- a multi-agent AI system

---

## Success criteria

The MVP is successful if a reviewer can:

1. Upload a failed-menu CSV.
2. See which rows are valid or invalid.
3. See a suggested cleanup status for each row.
4. Understand the reason for the recommendation.
5. Override the recommendation when needed.
6. Export a reviewed CSV.
7. Review failed menus faster than with the current manual-only process.

---

## Design expectation

The UI should be simple, restrained, and operational.

It should prioritize review speed, clarity, and trust.

It should not look like a generic AI-generated dashboard.