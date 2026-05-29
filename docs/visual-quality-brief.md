@'
# Project Instructions

## Required reading

Before UI work, read:
- docs/visual-quality-brief.md
- existing components and styles
- nearby tests
- package scripts

## MCP usage

Use available MCP tools when helpful:
- context7 for current framework/library docs
- openaiDeveloperDocs for OpenAI/Codex/API docs
- playwright for browser inspection and screenshots
- codex_apps/GitHub for repo and PR context

## Frontend quality bar

Frontend work must not look like generic AI-generated UI.

Before editing:
- Inspect existing components, routes, styles, tokens, and tests.
- Reuse existing components before creating new ones.
- Match current spacing, typography, density, hierarchy, radius, shadows, icons, and responsive behavior.
- Keep the diff minimal.

Avoid:
- Random gradients.
- Decorative glassmorphism unless already used.
- Fake metrics or fake dashboard cards.
- Generic SaaS filler.
- Inconsistent shadows, radii, icons, spacing, or typography.
- Over-animation.
- Low-contrast text.
- Layouts that only work at one viewport.

For meaningful UI changes:
- Use Playwright to inspect the app in a real browser.
- Check desktop and mobile.
- Capture screenshots or run screenshot tests when appropriate.
- Include loading, empty, error, disabled, focus, hover, and long-content states when relevant.
- Use semantic HTML and accessible keyboard behavior.

## Testing

Every behavior change needs a test.

Use the smallest useful test:
- logic: unit test
- component behavior: component test
- user flow: Playwright E2E test
- visual regression: Playwright screenshot test
- bug fix: regression test

Do not remove tests to make a suite pass.
Do not update snapshots blindly.

## Commands

Use the package manager already used by this repo.

Before completion, run relevant available checks:
- typecheck
- lint
- tests
- build
- Playwright checks for UI changes

Never claim checks passed unless they actually ran and passed.

## Done report

Report:
- What changed
- What checks ran
- What passed
- What failed or could not be verified
- Any residual risk
'@ | Set-Content -Encoding UTF8 "AGENTS.md"