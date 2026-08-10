import { describe, it, expect, vi, afterEach } from "vitest";
import { reconstructWordLists } from "../wordPaste";

/**
 * R23-8 (security): reconstructWordLists ran BEFORE the sanitizer — that is the
 * whole point of it, it rebuilds Word's <p mso-list> runs into real lists while
 * the Word markup is still intact. But it parsed the raw clipboard string with
 * `document.createElement("div"); div.innerHTML = html` in the LIVE document,
 * whose <img> elements start loading as soon as they are parsed. A clipboard
 * payload containing the literal string "mso-list" anywhere (the only gate,
 * even inside a comment) plus `<img src=x onerror=...>` therefore ran the
 * attacker's handler in the host application's origin. The sanitizer never got
 * the chance to strip it: by the time it returned, the load was already queued.
 *
 * happy-dom cannot prove the fix — it never loads images or fires onerror, so a
 * "no alert fired" test would pass either way. What it CAN prove is the
 * invariant that makes the load impossible: the parse must not touch the live
 * document at all. (The real-browser behaviour was measured separately in
 * chromium; see the commit message.)
 */
describe("reconstructWordLists parses inertly (#R23-8)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const WORD_LIST =
    "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>1.</span>First</p>" +
    "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>2.</span>" +
    '<img src="x" onerror="globalThis.__pwned = true">Second</p>';

  it("creates no node in the live document while reconstructing a list", () => {
    const liveCreate = vi.spyOn(document, "createElement");

    const out = reconstructWordLists(WORD_LIST);

    // Sanity: it really did the work (otherwise this asserts nothing).
    expect(out).toContain("<ol");
    expect(out).toContain("First");
    expect(liveCreate).not.toHaveBeenCalled();
  });

  it("keeps every parsed node out of the live document", () => {
    let parsed: Document | null = null;
    const realCreateHTMLDocument =
      document.implementation.createHTMLDocument.bind(document.implementation);
    vi.spyOn(document.implementation, "createHTMLDocument").mockImplementation(
      ((title?: string) => {
        parsed = realCreateHTMLDocument(title ?? "");
        return parsed;
      }) as typeof document.implementation.createHTMLDocument
    );

    reconstructWordLists(WORD_LIST);

    expect(parsed).not.toBeNull();
    // An inert document has no browsing context — that is precisely what stops
    // the browser fetching <img src> and firing onerror.
    expect((parsed as unknown as Document).defaultView).toBeNull();
  });

  it("still returns the input verbatim when there is no Word list", () => {
    const liveCreate = vi.spyOn(document, "createElement");
    const plain = '<p>hello <img src="x" onerror="globalThis.__pwned = true"></p>';

    expect(reconstructWordLists(plain)).toBe(plain);
    expect(liveCreate).not.toHaveBeenCalled();
  });

  it("does not execute inline handlers smuggled in behind a bare mso-list mention", () => {
    // The gate is /mso-list/i over the WHOLE raw string, so an HTML comment is
    // enough to route arbitrary markup through the parser.
    delete (globalThis as Record<string, unknown>).__pwned;
    const liveCreate = vi.spyOn(document, "createElement");

    reconstructWordLists(
      '<!-- mso-list --><img src="x" onerror="globalThis.__pwned = true">'
    );

    expect(liveCreate).not.toHaveBeenCalled();
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });
});
