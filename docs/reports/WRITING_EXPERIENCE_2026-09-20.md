# Writing experience review — 20 September 2026

This follow-up used the editor to write and revise an original five-chapter story, **The Cartographer of Quiet Places**: 1,615 words and 43 paragraphs. The story was entered through browser keyboard interactions, including dialogue, paragraph breaks, heading formatting, revision, undo, search, chapter navigation, and recovery. A separate automated manuscript contained 20 chapters and 1,000 paragraphs, approximately 40,000 words.

The resulting design makes writing the primary activity. It is the default playground and homepage experience, with an opt-in `writing-mode` prop for library consumers. The previous library modes remain available and their browser checks still run. The earlier [quality review](QUALITY_REVIEW_2026-09-20.md) covers the preceding recovery, export, accessibility, and mobile repairs.

## Changes

| Area | Result |
| --- | --- |
| Writing surface | A viewport-sized workspace, restrained document header, readable serif manuscript column, comfortable paragraph spacing, and room below the last sentence. Configuration and duplicate HTML output no longer consume the default writing surface. |
| Toolbar | A stable row for history, paragraph style, essential formatting, Insert, Style, Tools, View, and Export. Less frequent formatting opens deliberately. Selection survives commands; Alt+F10 enters the toolbar and Escape returns to writing. Closing Style restores focus to its trigger. |
| Companion | Optional notes quote exact passages, explain the suggestion, and let the writer apply or dismiss it. Repeated words, four wordy phrases, and sentences over 35 words are checked after a pause. Changes are undoable. Notes are local English prose checks, not AI text generation. |
| Navigation | A chapter outline jumps to the relevant heading. The companion also opens correctly from source and preview, returning to the manuscript; Escape restores focus to its footer control. |
| Mobile | A small touch formatting dock replaces the large panel in writing mode. Notes stack below the text. The footer retains its height and save status; the page does not acquire horizontal overflow. |
| Saving | A shared SaveStatus component moves truthful pending/saving/error/saved feedback into the writing footer. Existing recovery and save protections remain in use. |
| Editing integrity | Fixed a history coalescing boundary that could undo a suggestion together with the preceding paragraph. Fixed word counts that merged adjacent paragraphs. Notes recognize bare first lines, nested paragraphs, inline marks, and line breaks; they reject stale passages and protected variables/code. |
| First impression | The homepage now demonstrates an editable story and an actionable note. The recommended integration uses writing mode. Product copy explains the actual checks instead of implying an unspecified AI service. |

New implementation is separated into `WritingCompanion.vue`, `SaveStatus.vue`, `useWritingWorkspace.ts`, `writingReview.ts`, and `writing-workspace.css`. The established command, selection, history, and export systems are reused.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full unit suite with coverage | **4,658 passed**, 358 files, exit 0 | `unit-coverage-verified.log` |
| Coverage | 90.27% lines, 88.41% statements, 81.65% branches, 84.18% functions; configured thresholds pass | `coverage-summary.json` |
| Full browser suite, production build | **248 passed, 128 excluded, 0 failures, 0 flaky**, exit 0 | `browser-verified.log` |
| Additional final writing checks | **7 passed**, including the newly added homepage test and repeated book-length measurement, exit 0 | `home-and-book-verified-2.log` |
| Book-length interaction | 20 chapters and 1,000 paragraphs retained through typing and undo; 22-character typing/verification round trip **709 ms** on this machine | `book-length-interaction-final.json` |
| TypeScript | Exit 0 | `typecheck-final.log` |
| Lint | Exit 0 | `lint-verified.log` |
| Library, declarations, production demo | Exit 0 for both builds | `library-build-release-check.log`, `demo-build-release-check.log` |
| SSR | Writing mode renders without browser globals | `src/__tests__/ssr-render.test.ts` |
| Accessibility | Covered light/dark writing states pass axe; keyboard focus, selection, source/preview transitions, and mobile reflow exercised | Writing and accessibility browser specs |

The full browser run covers Chromium and emulated iPhone WebKit. The 128 exclusions are explicit project-specific cases, not passes. The later seven-test run overlaps six existing desktop checks and adds one homepage flow; these counts must not be added together as unique coverage. The final subsequent UI edit only changed the empty-note sentence to “No notes for now”; both build artifacts were rebuilt after that copy change.

The 709 ms measurement includes automation and an assertion; it is not a field INP score or a guarantee on other devices. Physical software keyboards, screen-reader usability studies, and publishing-house typography are not established by these checks. The existing PDF path remains canvas based, and HTML/Word exports retain their existing document styles. This work does not claim AI generation, print-layout fidelity, a deployment, package publication, or provable perfection.

## Review artifacts and diagnostics

Persistent run directory:

`$CODEX_HOME/logs/next-level-editor/20260920T202740Z/`

- `the-cartographer-manuscript.html`: complete original story, preserved as a readable standalone artifact from the editor DOM.
- `existing-draft.html`: the draft preserved before the writing exercise.
- `01-before.png`, `02-writing-feedback-before.png`: observed starting friction.
- `09-final-phone.png`, `11-final-desktop-light.png`, `12-final-desktop-dark.png`, `13-formatting-disclosure.png`: visual review evidence.
- `summary.md`, `events.jsonl`: decisions, outcomes, verification, and retrospective entries where appropriate.
- `working-tree.patch`, `new-files/`, `source-manifest.json`: reconstructable source changes and hashes, including the preceding local upgrade.

Earlier failed runs are retained. They include the mobile layout regression, initial integration failures, and a Windows command-line quoting failure; the successful verification commands and exit codes are recorded separately. The demo build retains its existing large-chunk warning.

Browser developer tools expose sanitized `[NextLevelEditor]` writing-suggestion applied/refreshed/failure events and existing save diagnostics. They contain the operation kind or reason, never the manuscript text. The completed story remains in the local preview's browser draft. At this checkpoint, changes were local and uncommitted; the [device review](DEVICE_QUALITY_2026-09-20.md) records the subsequent draft PR and browser qualification.
