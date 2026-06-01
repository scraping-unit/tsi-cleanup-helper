# TSI Cleanup — Product Context

> Read this file before any design or code work. It is the single source of truth
> for what this product is, who uses it, and how it should feel.

---

## Product Name

**TSI Cleanup**

---

## One-Line Purpose

An internal operations tool that automates URL accessibility checks and
page classification for failed restaurant menus, so reviewers spend time
only on cases that genuinely need human judgment.

---

## Register

product

This is a functional internal tool, not a marketing surface. Design
decisions should prioritize density, scannability, and decision speed
over visual expression or brand storytelling.

---

## Product Purpose

Restaurant menus scraped from delivery platforms (Deliveroo, UberEats,
JustEat, Foodhub, Grubhub24, Wix-based sites) regularly fail — either at
the scraping stage or the clustering stage. When they do, a reviewer must
determine the cause and decide what to do next: rerun the scrape, detach
the menu from its cluster, update the URL, move it to another cluster, or
escalate it to QC.

Without this tool, reviewers open each URL manually, interpret raw HTTP
codes, cross-reference platform-specific rules from a separate SOP
document, and record decisions by hand. Each case takes 2–5 minutes. At
scale, this is the bottleneck.

TSI Cleanup processes that queue automatically. It ingests a CSV of
failed menus, checks whether each URL is accessible, classifies what
the page actually contains (menu, homepage, parked domain, bot wall,
redirect target), applies platform-specific rules, and surfaces a
recommendation with evidence and confidence. The reviewer sees a
pre-triaged list and acts only on what the system cannot resolve alone.

The tool never writes to production. It recommends. The human decides.

---

## Users

**Primary user: Operations reviewer (cluster owner)**

Someone responsible for keeping a portfolio of restaurant menus
accurate and scrapeable. They run cleanup sessions regularly — typically
working through batches of 20–100 failed menus. They are not engineers.
They know the SOP but rely on pattern recognition, not memorized rules.
Speed matters to them: each case they can resolve in under 30 seconds is
a win. They distrust opaque recommendations — they want to see the
evidence behind a suggestion, not just a verdict.

Mental model: triage queue. Not a dashboard they live in, but a task they
open, work through, and close.

**Secondary user: QC reviewer**

Handles escalated cases that require judgment beyond the automated
rules: potential brand moves, PDF/image menus, permanently broken sites
with no clear replacement. They see a filtered view of their assigned
items. They care about context — why was this escalated, what was
already tried.

**What both users share:**
- High task pressure, low tolerance for visual noise
- Trust earned through accuracy and transparency, not through style
- The interface is a tool, not a product they chose — they need it to
  stay out of the way

---

## Brand Palette

Locked. Do not deviate.

| Token           | Hex       | Usage                                          |
|-----------------|-----------|------------------------------------------------|
| `brand-orange`  | `#EE612C` | Primary accent: CTAs, active states, key data  |
| `brand-cream`   | `#FFF4DF` | Page background                                |
| `text-primary`  | `#1A120B` | Body copy, data values — warm near-black       |
| `text-secondary`| `#6B4230` | Labels, metadata, secondary copy               |
| `surface`       | `#FFFFFF` | Table rows, panels                             |
| `valid`         | `#2D7A4F` | Status: accessible, valid                      |
| `blocked`       | `#A05C00` | Status: bot wall, access denied                |
| `inaccessible`  | `#B83030` | Status: DNS fail, 404, dead site               |
| `unknown`       | `#555555` | Status: unresolved, needs review               |
| `excluded`      | `#5C3D8F` | Status: excluded from processing               |

The orange is a signal color. It should appear where attention is needed
and nowhere else. The cream background should read as warm and legible,
not yellow.

---

## Typography

| Role       | Font            | Use                                          |
|------------|-----------------|----------------------------------------------|
| Body / UI  | Outfit          | All labels, copy, controls, badges           |
| Display    | Lora            | App name "TSI" only — nowhere else           |
| Data / Code| JetBrains Mono  | URLs, IDs, HTTP codes, file names            |

Never use Inter, Roboto, Arial, or system-ui as the primary font.

---

## Tone

**Precise. Direct. Calm.**

The interface speaks the language of operations, not the language of
marketing. Labels name things as they are ("Valid", "Inaccessible",
"Needs Review") — no euphemisms, no filler words. Error messages explain
what happened and what to do, not what went wrong in the vague sense.
Empty states tell the reviewer what action to take, not that the list is
empty.

Avoid:
- Cheerful microcopy ("Let's get started!", "You're all set!")
- Hedging ("might", "consider", "perhaps")
- Overly formal or robotic phrasing ("The operation completed successfully")
- Decorative labels that exist to fill space

---

## Anti-References

These are the design directions this product explicitly rejects. Do not
use these as inspiration, even partially:

- **Generic SaaS dashboard aesthetics** — dark sidebar, blue metric cards,
  purple accent, white body. The default shadcn neutral theme with zero
  customization is a failure state.
- **Inter as the default font** — it has been used in every AI-generated
  interface for five years. It reads as "no decision was made."
- **Cards nested inside cards** — the table is the interface. Sections
  do not need card wrappers.
- **Identical icon-heading-text card grids** — content is tabular, not
  marketing tiles.
- **Hero metric layouts** — large centered number + supporting stats +
  gradient accent. This is an ops tool, not a revenue dashboard.
- **Bounce or elastic easing** — all transitions are 150ms ease-out or
  instant. No personality in motion.
- **Dark glows, glassmorphism, neon** — this is a professional tool
  used under fluorescent office lighting. Nothing should glow.
- **Purple anything** — not in gradients, not in accents, not in states.
  Purple is not in the palette.

---

## Strategic Principles

These are the design decisions that should be consistent across every
feature, every screen, every state:

**1. Evidence before verdict.**
Every recommendation must show why — the HTTP code, the redirect chain,
the page heuristic label. A verdict without evidence is not trusted and
not acted on. Show the work.

**2. Human-gated on ambiguity.**
Exclusions, brand moves, and permanently broken sites always require
a human decision. The UI must make this distinction legible: what the
system resolved, what it is recommending, and what it cannot decide.

**3. The table is the product.**
The results table is where reviewers spend 90% of their time. It must
be fast to scan, easy to filter, and cheap to act on. Every other screen
— upload, processing, error — is infrastructure, not the product.

**4. Density by default, detail on demand.**
The table shows the minimum needed to act (URL, status, recommendation,
confidence). Full evidence, redirect chains, and raw HTTP data appear
on drill-down. Do not surface everything at once.

**5. Platform rules are facts, not suggestions.**
UberEats, Deliveroo, JustEat, Wix, and others each have specific
validation logic. When the system applies a platform rule, the UI
should say so explicitly ("Closed on Uber Eats detected" rather than
"Inaccessible").

**6. Never write to production.**
The tool is read-only plus export. No action the reviewer takes in this
UI directly modifies the database. Recommendations are exported to CSV
and applied through the normal operations pipeline. The UI should never
imply otherwise.

**7. Trust through consistency.**
Reviewers will stop using this tool if it gives wrong recommendations
even occasionally. Confidence scores must be honest. Low-confidence
recommendations should look different from high-confidence ones — not
just in a badge, but in how prominently they are surfaced.
