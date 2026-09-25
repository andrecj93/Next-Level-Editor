# Editor quality review — 20 September 2026

The writing workspace now has reliable local recovery, explicit save status, a quieter responsive layout, accessible configuration controls, and working mobile command menus. The review exercised the advertised feature families and repaired the defects found in the affected paths.

This is verified local implementation. It is not a deployment, an accessibility certification, or a claim that software can be proven perfect.

## Changes with a direct user benefit

| Area | Problem found | Result |
| --- | --- | --- |
| Saving | Slow writes could overlap; pending changes could appear saved | Serialized writes, coalesced edits, explicit pending/error/conflict states, and Retry using the current document |
| Document lifecycle | Pending callbacks survived disposal; host replacements could save an old document | Scope cleanup, generation guards, and cancellation when the host replaces its model |
| Draft recovery | The demo advertised auto-save without persistent local drafts | Bounded browser storage, sanitized restoration, visible failures, and page-exit protection while a save is pending |
| New document/templates | Replacing content lost edits without confirmation; a blank replacement could restore the old draft after refresh | Confirmation for edited drafts, immediate replacement persistence, and fresh undo/comment state |
| Navigation | Page selection did not follow browser history or dependable deep links | Home/playground/docs URLs, back/forward support, and retained drafts while navigating |
| Workspace | Dense setup controls competed with the writing surface | Compact header, stronger hierarchy, meaningful document labels, mobile appearance settings inside Configure, and a shorter useful starter document |
| Search | Match status could overlap input; Shift+Enter and IME handling were incomplete | Separate status area, first-use guidance, disabled unavailable navigation, previous-match shortcut, and composition protection |
| Accessibility | Hidden configuration checkboxes could not receive keyboard focus | Focusable switches, associated field labels, control states, read-only semantics, and focus indicators |
| Mobile commands | Slash menu was clipped by editor/host overflow | Fixed body portal, preserved theme and ARIA relationships, viewport clamping, and menu-only scrolling |
| Mobile typing | Fixed controls covered the caret and unrelated page controls | Compact toolbar, caret clearance, and automatic hiding when the editor leaves the viewport |
| Themes | Legacy tokens and teleported controls did not consistently follow the active palette | Theme-local token resolution, matching mobile chrome, native color scheme, and readable warm-theme dialog actions |
| Dependencies | Production audit reported fflate and nanoid advisories | Lockfile updated to fflate 0.8.3 and nanoid 3.3.19; production audit reports zero advisories |
| CI | Coverage failures were allowed through; lint rewrote files | Coverage thresholds now gate CI, coverage evidence is retained, and lint checks without rewriting files (`lint:fix` remains available) |

## Feature verification

| Advertised capability | Evidence in this run |
| --- | --- |
| Formatting, headings, alignment, colors, lists, checklists | Full unit suite; editor, toolbar, color, list, checklist, and selection browser specs |
| Slash commands, keyboard shortcuts, find/replace, command palette | Unit coverage and keyboard/slash browser specs; manual search review in light/dark themes |
| Undo/redo, selection, paste, sanitization | Editing-integrity, undo-redo, paste-sanitize, selection browser specs plus existing adversarial sanitizer unit coverage |
| Tables, table properties, page breaks, contents, code blocks | Table insertion/edit/property and insert-feature browser specs; code and structure unit coverage |
| Images, files, embeds, resizing | Image/file/insert browser specs plus embed and resizing unit coverage; no third-party provider delivery claim |
| Comments, mentions, resolution | Comments browser specs and comment component/composable unit coverage |
| Variables and printing | Variables-typing and print-variable browser specs; sanitizer and variable unit coverage |
| Templates and local recovery | New workspace browser regressions, including cancel/confirm, pending-edit replacement, blank persistence, and reload |
| HTML, Markdown, PDF, Word export | Actual downloads tested in Chromium AND mobile WebKit. Text content, extensions, PDF signature/trailer, and Word package signature/content-types checked |
| Code, split, preview, focus mode, toolbar configurations | View-mode, preview-sync, editor-options, adaptive-chrome, toolbar-layout, and focus-mode browser specs |
| Responsive layout and accessibility | Existing responsive/skip-link/axe specs; new 320px settings reflow, keyboard switches, and light/dark settings/search axe checks; manual 390px and 1440px visual review |

## Final checks

| Check | Result |
| --- | --- |
| `npx vitest run --coverage --maxWorkers=4` | **4,646 passed in 357 files**, exit 0 |
| Coverage | **90.82% lines**, 89.17% statements, 82.94% branches, 86.73% functions; all configured thresholds pass |
| `E2E_PORT=5275 npx playwright test --reporter=line` | **239 passed, 125 skipped, 0 failed, 0 flaky**, exit 0; production demo build |
| `npm run lint` | Exit 0, no findings |
| `npx vue-tsc --noEmit` | Exit 0 |
| `npm run build` | Library and declarations built, exit 0 |
| `npm audit --omit=dev --json` | Zero advisories, exit 0 |
| `git diff --check` | No whitespace errors |

The 125 skips are explicit project-specific exclusions, primarily desktop flows duplicated into the mobile project. They are not passes. Chromium plus emulated iPhone WebKit do not establish support for every physical device, legacy browser, screen reader, or software keyboard. Export checks establish successful delivery and basic file structure, not exhaustive Microsoft Word interoperability or tagged/searchable PDF accessibility. PDF remains the existing canvas-based export.

The initial full browser run exposed five failures and one flaky case. The final full run passes without retries after the fixes. Earlier failed logs remain available. The unit runner also logs existing happy-dom iframe teardown warnings; they did not produce test failures in the final run.

## Evidence and reproducibility

Run ID: `20260920T024210Z`. Baseline: `main` at `8b17650`. Changes were local and uncommitted at this checkpoint; the [device review](DEVICE_QUALITY_2026-09-20.md) records the subsequent draft PR and browser qualification.

Persistent evidence directory:

`$CODEX_HOME/logs/next-level-editor/20260920T024210Z/`

- `summary.md` and `events.jsonl`: actions, decisions, outcomes, and exit codes.
- `unit-coverage-final-3.log`, `coverage-summary.json`: complete unit/coverage result.
- `e2e-final.log`: final browser result; earlier browser failures preserved separately.
- `lint-verified.log`, `typecheck-verified.log`, `library-build-verified.log`, `production-audit-verified.json`.
- `08-desktop-final-light.png`, `09-desktop-final-dark.png`, `10-search-final-dark.png`, `11-phone-verified.png`: visual evidence.
- `verified-exports/` and `export-hashes.json`: synthetic example downloads from both browser engines.

Library and draft operations emit sanitized lifecycle diagnostics with the `[NextLevelEditor]` and `[NextLevelEditor playground]` prefixes in browser developer tools. They record starts, completion, rejection/conflict, template changes, restoration, and storage failures without document contents or arbitrary host error payloads. The local preview server log is `dev-server.log` in the run directory.

References used for interaction review: [W3C toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/), [WCAG 2.2 focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Automated accessibility checks supplement keyboard and visual review; they do not certify conformance.
