# TSI Cleanup — Failed Menu Validation Spec

## Purpose
For each menu that failed scraping or clustering, determine whether its URL is
valid and what the reviewer should do next. Automate every cheap, reliable
determination; surface only genuinely ambiguous cases for human review. The tool
recommends — the reviewer decides.

## In scope (this step)
- Read failed-menu records from a source (CSV now, API later).
- Check each URL for reachability and platform-specific validity.
- Emit one recommended action per record with evidence, confidence, and reason.
- Save only decision-relevant fields (CSV download now; same fields shaped for an
  API payload later).

## Out of scope (do not build now)
- Writing back to / updating any production system. Recommend only.
- Searching for replacement URLs unless the current URL is confirmed unusable.
- The concrete API client (define the interface; stub the adapter).
- Playwright, paid APIs, paid scraping services, headless browsers.

## Input
Records come through a thin source interface so the origin is swappable:

```typescript
interface MenuRecordSource {
  read(): Promise<NormalizedFailedMenuRecord[]>;
}
// CsvSource — implemented (current behavior).
// ApiSource — interface-only stub with `// TODO`. Not built this step.
```

## Platforms and validity rules (source of truth)
Scrape priority: Deliveroo > UberEats > JustEat > Foodhub.
Source priority: Delivery website > PDF/Image > Own website.

| Platform   | "Valid" means                                                  | Automatable? | Action when not clean |
|------------|----------------------------------------------------------------|--------------|-----------------------|
| Deliveroo  | Reachable + live menu                                          | No (Cloudflare JS challenge fires for all HTTP clients, live and dead) → `not_verifiable`; corroborate via sibling UberEats/JustEat URL if present in record | sibling live → `manual_verify` medium confidence; all siblings closed → `exclude_no_website` candidate medium confidence (human-gated); no sibling → `manual_verify` low confidence + UberEats search hint; malformed URL → `update_url` |
| UberEats   | HTTP 200 AND body does NOT contain "Closed on Uber Eats"       | Yes          | closed marker → `exclude` (human-gated); if sole 3rd-party, expired, no alternative → `exclude_no_website` |
| JustEat    | Reachable AND matches the defined URL                          | Reachability yes; equality No (new URLs differ slightly) | reachable but uncertain → `google_doublecheck` |
| Foodhub    | Unknown                                                        | Unknown      | `investigate` until characterized (see harness) |
| Wix        | URL contains an online-ordering path (`/order-online` or `/menu`) | Yes       | reachable but no ordering path → `update_url` to the ordering path |
| Grub24     | URL contains the sensitive collection key suffix `/key-…`      | Yes          | missing suffix → `update_url` |
| PDF/Image  | Reachable + correct content-type + loads                      | Yes          | valid file but unscrapable → `escalate_vilius`; same URL, format changed → `update_format` |
| OwnWebsite | Heterogeneous (no single rule)                                | Partial (reachability only) | per-URL heuristics; lowest source priority |
| Unknown    | Platform detection failed                                     | Reachability only | flag for manual review |

Reference examples:
- Grub24 invalid `https://bigbenpizza.online/Menu/View/collection`
- Grub24 valid   `https://bigbenpizza.online/Menu/View/collection/key-46e93d13`
- Wix valid path contains `/order-online` or `/menu`.

## Recommended action enum
`no_change | update_url | update_format | manual_verify | google_doublecheck |
exclude | exclude_no_website | moved_to_brand | escalate_vilius | investigate`

`exclude`, `exclude_no_website`, and `moved_to_brand` are recommendations only —
flagged for human confirmation in the UI, never finalized by the tool.

## Decision rules
- Reachable 200 + platform structural rule passes → `no_change`, high confidence.
- Reachable 200, structural rule fails (Wix path / Grub24 suffix) → `update_url`
  (or `update_format` for PDF/Image format-only changes), high confidence.
- 404 / 410 / malformed → URL confirmed unusable → `update_url`; a replacement
  hint may be generated following the priority order. High confidence on "unusable".
- `not_verifiable` (Deliveroo Cloudflare block) → corroborate via sibling platform URLs
  (`ubereats_url` / `justeat_url` optional fields in input record):
  - Sibling URL present and shows brand live (HTTP 200, no closed signal) →
    `manual_verify`, **medium** confidence. Brand is operating; exact Deliveroo URL
    unconfirmed. MUST NOT be treated as an exclusion candidate.
  - All present sibling URLs show closed signal → `exclude_no_website` candidate,
    **medium** confidence. Human-gated; reviewer must confirm expiry and no alternatives.
  - Sibling URLs present but inconclusive (blocked, unknown, no signal) →
    `manual_verify`, **low** confidence.
  - No sibling URLs in record → `manual_verify`, **low** confidence + UberEats search
    link in `replacementHint` (built from `brandName`). A block is NOT "confirmed
    unusable" — do NOT auto-search for replacement URLs.
  MUST NOT collapse to a generic dead-end/escalation in any of the above branches.
- `not_verifiable` + malformed URL → `update_url`, medium confidence (malformed is
  unusable regardless of bot protection).
- `blocked` (403/429, actively refused) → `manual_verify`/retry, low confidence.
  Keep `blocked` distinct from `unverifiable`.
- UberEats closed marker present → `exclude` candidate; if it is the only
  third-party source, expired, and no other website exists → `exclude_no_website`.
- File appears valid but cannot be scraped → `escalate_vilius`.

Replacement-URL hints: only when the current URL is confirmed unusable
(404/malformed), never on a mere `blocked`/`unverifiable`. Choose candidates by
source priority then platform priority above.

## Output schema (save only this)
```typescript
interface ValidationResult {
  menuId: string;
  currentUrl: string;
  platform: MenuPlatform;
  urlResult: "valid" | "inaccessible" | "redirected" | "invalid"
           | "unknown" | "blocked" | "not_verifiable" | "not_checked";
  structuralRulePass: boolean | null;   // null when no rule applies
  contentSignal: string | null;         // e.g. "ubereats_closed"
  verifiability: "verifiable" | "partial" | "unverifiable";
  recommendedAction: RecommendedAction;
  confidence: "low" | "medium" | "high";
  reason: string;                        // human-readable, evidence-backed
  replacementHint?: string;              // only if current URL confirmed unusable
}
```
Emitted as CSV (download) now; the same fields are the API payload later.

## Evidence, confidence, reason
Every result carries evidence (status, structural pass/fail, content signal),
a confidence level, and a reason string that names the cause. Never recommend
`exclude`, `exclude_no_website`, `moved_to_brand`, `update_url`, or
`escalate_vilius` without stating why in `reason`.

## Constraints
- Recommend only; never write to any production system.
- No Playwright, no paid APIs/scraping services, no headless browsers.
- No replacement URL search unless the current URL is confirmed unusable.
- Exclusion and brand moves require human confirmation in the UI.
- Prefer the simplest approach; add no abstractions not required by this spec.

## End-to-end verification
A reviewer confirms the tool works by running it against a sample CSV that
includes at least one of each: a clean Wix `/order-online` URL (→ `no_change`),
a Grub24 URL missing `/key-…` (→ `update_url`), a Deliveroo URL
(→ `manual_verify`, `unverifiable`, never a dead-end), a UberEats closed page
(→ `exclude` candidate), a 404 (→ `update_url`, confirmed unusable), and a
JustEat URL (→ `google_doublecheck`). Pass = each row's `recommendedAction`,
`verifiability`, and `confidence` match the rules above, every row has a non-empty
`reason`, and no exclusion/brand-move is auto-finalized.