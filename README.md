# tsi-cleanup

Internal tool for reviewing failed menus from TSI scraping clusters. Reviewers upload a CSV of failed menus, the tool checks each URL and returns a recommendation per row, and the processed results can be downloaded as a CSV.

This tool gathers evidence and recommends. It does not write back to any production system.

---

## What It Does

When a scraping cluster completes, some menus fail. Before this tool, a reviewer had to open each failed URL by hand, check whether the restaurant was still active, and decide what to do. For a cluster with a typical failure rate that means 30 to 50 manual checks per run.

tsi-cleanup automates the evidence step:

1. Reviewer uploads a CSV of failed menus
2. The tool checks each URL (HTTP status, redirects, bot protection detection, platform-specific content analysis)
3. A recommendation is assigned to each row with a confidence score and reason
4. Reviewer downloads the processed CSV

The reviewer still makes the final call. The tool handles the repetitive checks.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Core pipeline | TypeScript | Strict types, pure functions, fully tested |
| Server | Hono + Node.js | Runs URL checks server-side via `@hono/node-server` |
| Interface | React + Vite + Tailwind | shadcn/ui components, TanStack Table for results |
| Tests | Vitest | 137 tests across 10 files |
| Package manager | pnpm | Workspace setup: root + `ui/` |

---

## Repository Structure

```
server/
  server.ts                   Hono server, POST /api/process endpoint

src/
  csv/
    parser.ts                 RFC 4180 CSV parser
    importer.ts               Column validation and row normalization
    exporter.ts               Processed results to CSV string
  domain/
    types.ts                  All domain types (statuses, evidence, results)
    platform-detection.ts     Detects platform from URL (Deliveroo, UberEats, JustEat, etc.)
    url-checker.ts            HTTP checks with browser headers, bot detection handling
    content-checker.ts        Platform-specific content analysis (UberEats closed detection)
    recommendation-engine.ts  Pure recommendation logic
    row-processor.ts          Wires URL check + recommendation per record
    batch-processor.ts        Processes all records, collects errors, builds summary

ui/
  src/
    App.tsx                   Phase state machine (idle, loading, results, error)
    components/               Upload, results table, filters, badges, download

tests/                        Vitest test files mirroring src/ structure
```

---

## Local Setup

```bash
pnpm install
```

Requires Node.js 20+.

---

## Running the Tool

```bash
pnpm run dev
```

Starts the Hono server on port 3000 and the Vite UI on port 5173 concurrently. Open `http://localhost:5173`.

If port 3000 is already in use from a previous session, kill it first:

```bash
npx kill-port 3000
```

---

## Checks

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

All four must pass before any PR.

---

## Recommendation Engine

Each failed menu is assigned one of the following statuses:

| Status | Meaning |
|---|---|
| `No need to update - Still valid` | URL is accessible and the menu appears active |
| `URL Updated` | Current URL is unusable but a valid replacement was found |
| `Excluded` | URL is dead, restaurant is closed, or no replacement exists |
| `Format updated` | URL is valid but the menu format needs updating |
| `Moved to another brand` | Menu belongs to a different brand |
| `Pending` | Not yet checked |
| `Other` | Evidence is conflicting or manual review is required |

Every recommendation includes a confidence score (`low`, `medium`, `high`) and a reason string.

---

## URL Checker Behaviour

- Sends browser-like headers on every request (User-Agent, Accept, Accept-Language)
- HEAD first, falls back to GET on 405/501
- 403 and 429 map to `blocked` (not treated as dead URLs)
- Deliveroo URLs use `impit` for TLS fingerprint impersonation to bypass bot protection
- UberEats pages are checked for closed-restaurant content signals even when HTTP returns 200
- Platforms that cannot be verified automatically return `not_verifiable` with an escalation flag

---

## Known Limitations

- Deliveroo bot protection may still block requests depending on their detection layer. Affected URLs return `not_verifiable` and are flagged for manual review.
- Reviewers cannot currently edit recommendations in the UI before downloading. This is the next item on the roadmap.
- Optional input fields (menu link, task links, scraper) are not carried through to the processed output rows yet.

---

## Roadmap

- [ ] Manual override: edit recommendations in the table before downloading
- [ ] Deliveroo: research and implement a reliable bypass for URL verification
- [ ] Automatic bot-protection escalation: try impit automatically on any blocked URL, not just Deliveroo
- [ ] JustEat: test under real conditions and add content signals if needed
- [ ] Push to GitHub for team access

---

## Rules

- No production write-back. The tool never updates AE or any external system.
- No Playwright by default. Browser automation is a last resort for individual manual checks only.
- No replacement URL search unless the current URL is confirmed unusable.
- Human confirmation is required for exclusions and brand moves.