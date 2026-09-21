# Device quality review — 20 September 2026

This pass extends the [writing experience review](WRITING_EXPERIENCE_2026-09-20.md)
with repeatable device workflows and manual reading of the same five-chapter,
1,615-word manuscript. The implementation is proposed in
[draft PR #131](https://github.com/andrecj93/Next-Level-Editor/pull/131).
No deployment or package publication was performed.

## Repairs from actual use

- Formatting a freshly typed first line now turns that paragraph into a heading,
  preserving inline marks and neighbouring blocks. Previously it inserted an
  empty heading beside the text. The tests now check the title itself before
  continuing, after revision/undo, and after draft recovery.
- Touch toolbar clearance applies at tablet widths as well as phone widths.
  Writing companion, comments, variables, and save status remain reachable.
- Short windows can scroll their surrounding page chrome away while retaining
  usable manuscript space. Writing notes become a bounded, scrollable panel in
  short layouts; portrait phones continue to stack notes below the manuscript.
- Dropdowns stay inside the visual viewport on both axes, scroll when needed,
  and reposition on resizing, scrolling, and viewport changes. They return to
  their trigger when space becomes available again.
- The themed footer resolves its own colours and no longer fades all controls
  together. Invisible tooltip boxes no longer widen narrow pages. Unfocused skip
  links stay clipped instead of overlapping the host page's navigation.
- Configuration opens above the toolbar, fits short windows, and returns focus
  to Configure after Escape or Done. Read-only can be changed without losing
  the manuscript.
- Selection scrolling now reads range geometry without inserting a temporary
  element. That element changed the live selection after Bold in a 320×256
  window, breaking the next formatting command. Repeated formatting and undo
  now preserve the passage across all runnable profiles.
- The link dialog shows the selected passage, preserves its inline formatting,
  and prefills the destination when editing an existing link. Its actions stay
  visible in short windows while the form scrolls.
- Dialogs leave Enter, Escape, and Tab to active input-method composition.
  Split view now waits for composition to finish before recording history or
  autosaving, so Undo removes a committed word without restoring partial
  Japanese candidates.
- The site's open navigation is layered above editor controls, with labels
  aligned to the active-page marker. The normal header remains below fullscreen
  editing, and modal dialogs remain above the navigation.
- Narrow headers let the site name shrink while retaining full-size navigation
  controls. Linux font metrics had pushed the menu button to 322 pixels in a
  320-pixel viewport. The layout now reserves space for those controls.
- Warm dark accent text uses a lighter ink on hovered companion buttons and
  selected menu items. The reported 4.08–4.11:1 pairs now exceed 6:1. Tests
  explicitly hover both surfaces and retain the WCAG AA contrast assertions.

## Repeatable coverage

`npm run test:devices` uses `playwright.devices.config.ts`. Every configured
profile runs the same ten scenarios without project-specific skips:

1. Type, format a heading, revise an exact passage, undo, save, and recover.
2. Preserve a selection through formatting, insert a link, search, and download HTML.
3. Fit every toolbar menu and image/table/code/video/file-manager dialogs.
4. Navigate a multi-chapter document and keep the caret in visible writing space.
5. Preserve source, preview, split view, multilingual text, long words, and tables.
6. Check light/dark states with reduced motion and axe WCAG 2.2 AA rules.
7. Resize with a menu open, restore its anchor, use Alt+F10/Escape, and keep typing.
8. Operate configuration and read-only mode using visible controls, preserving focus and content.
9. Apply bold/italic/underline through touch or desktop controls, undo the last
   mark, insert a link over the selection, and edit its destination without
   losing text or inline formatting.
10. Open the site navigation, reach Docs, return through browser history with
    the draft intact, and dismiss the menu from the keyboard with focus restored.

| Profile group | CSS viewport coverage |
| --- | --- |
| Desktop | Chromium 1366×768; WebKit 1440×900; wide 2560×1080; narrow 600×900 |
| Touch laptop | 1024×768 |
| Tablets | iPad 768×1024 and 1024×768; Android tablet 712×1138 |
| Phones | Small 320×568; iPhone 390×664; Android 360×740; large 430×780 |
| Landscape phones | 750×342 and 740×360 |
| Constrained windows | 640×384, 320×256, and 390×360 |
| Firefox | 1366×768; nine writing scenarios passed on Ubuntu in the first CI run |

These are emulated browser profiles. The narrow windows exercise the CSS sizes
associated with [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html),
not native browser zoom controls. Reduced-height windows do not reproduce a
physical software keyboard. [Playwright emulation](https://playwright.dev/docs/emulation)
does not establish behaviour on every device, OS, browser shell, screen reader,
or input method.

Playwright was updated to 1.63.0 with its matching Chromium 153.0.8010.12,
WebKit 26.6, and Firefox 155.0 binaries. Firefox 142 and 155 both failed to launch
on this Windows host: its SideBySide event log reports an unresolved `mozglue`
assembly. Those failures occurred before the application loaded. A Linux/WSL
runtime probe also produced no response and was interrupted. Firefox remains
unverified locally; no test was marked passed or skipped to hide that condition.

The new CI device job installs all three engines on Ubuntu, retains reports and
screenshots, and gates demo deployment and npm publication. This workflow was
executed in [run 35543402546](https://github.com/andrecj93/Next-Level-Editor/actions/runs/35543402546).
Firefox passed all nine scenarios at that revision. The run also exposed mobile
navigation layering and a 322-pixel document in the 320-pixel constrained profile.
The navigation repair passes all 17 locally runnable profiles. The PR's checks
and local run log track the subsequent Linux reflow diagnosis and verification.

## Verification evidence

The local device run before the Ubuntu follow-up passed **153 of 153 checks across 17 runnable
profiles**, with zero retries, exclusions, failures, or uncaught page errors.
The configured Firefox profile remains blocked at browser launch on this host.

Persistent run directory:

`$CODEX_HOME/logs/next-level-editor/20260920T213147Z/`

This local evidence directory is outside version control. `$CODEX_HOME`
defaults to `~/.codex` when unset.

- `device-interactions-final-report/results.json` and `device-interactions-final.log`:
  **153 passed**, exit 0. The report includes each device configuration and
  screenshots; `device-interactions-final-evidence/` preserves the associated artifacts.
- `interaction-browser-regression.log`: 251 passed, 131 explicit project-specific exclusions,
  no failures or flaky results; exit 0. This suite covers the prior library
  modes and feature flows, including Japanese composition, commit, undo, redo,
  cancellation, and recovery in the main editor and split view. These two
  composition cases use Chromium's input protocol; they do not establish native
  operating-system candidate-picker behaviour. Exclusions are not passes.
- The 20-chapter, 1,000-paragraph book remained editable through typing and undo.
  The 22-character typing/verification round trip was 901 ms on this machine;
  that includes automation and is not a field interaction-performance score.
- `toolbar-final-results.json`: eight toolbar/skip-link checks passed after the
  final positioning changes, with two explicit mobile exclusions; exit 0,
  zero retries.
- `interaction-coverage-verified.log`: **4,671 passed** in 359 files, exit 0;
  lines 90.31%, statements 88.46%, branches 81.64%, functions 84.19%.
  Recorded after the library build finished. Earlier failed runs are retained, including
  stale README bundle figures and a check that raced the concurrent build.
- `interaction-unit-final.log`: 88 focused interaction tests passed.
- `navigation-device-verified.log`: the added navigation scenario passed on all
  17 locally runnable profiles, with zero retries. The complete configured gate
  now contains 180 cases (ten scenarios across 18 profiles).
- `ubuntu-devices-first/`: first Linux report, 155 passed and seven constrained
  reflow failures; includes the nine successful Firefox cases. This failed run
  is retained as evidence and is not described as a successful complete gate.
- `interaction-typecheck-release.log`, `interaction-lint-release.log`, and `interaction-build-release.log`:
  type checking, lint, and library build passed. Every device run also builds
  and serves the production demo.
- `production-dependency-audit.json`: zero reported production vulnerabilities.
- `02-book-tablet.png` through `07-book-desktop.png`: manual visual inspection of
  the manuscript, landscape caret, configuration, and short-screen companion.
- `08-selected-link-phone.png` and `10-link-short-verified.png`: selected
  passage context and reachable link actions in a 320×256 window. The clipped
  dialog before the fix is retained as `09-selected-link-short.png`.
- `summary.md`, `events.jsonl`, source patch, and source manifest preserve the
  outcomes and reconstructable local changes. Earlier failed runs are retained.
- Historical reports include the Firefox launch failures and the corrected
  test-harness issues (clipped checkbox inputs instead of visible labels, and
  assertions during entry animation). No forced clicks or application
  assertions were removed to obtain the final clean result.

The third Ubuntu run, `35545063560`, passed 179 of 180 device cases, including
all Firefox, narrow reflow, navigation, and contrast scenarios. It exposed one
Android landscape overflow: a translated View menu fitted visually but retained
its original scrollable footprint. Menus now adjust their CSS insets and keep
that position throughout their exit transition. Page width is asserted with
each primary menu open and immediately after dismissal. Six targeted device
cases pass locally, and three toolbar-layout cases verify compact mode and the
top, left, and bottom anchors (`menu-inset-browser.log`, `menu-anchor-verified.log`).
The earlier failure and the insufficient first attempt are retained in the run
evidence. The complete Ubuntu gate must pass on this follow-up revision before
it is described as verified.

The results establish the exercised workflows, not universal perfection.
Physical iOS/Android keyboards, assistive technology sessions, low-end hardware
performance, older browser versions, and the blocked Windows Firefox runtime remain
outside the verified claim.
