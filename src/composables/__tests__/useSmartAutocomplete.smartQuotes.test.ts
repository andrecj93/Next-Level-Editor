import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

// Unicode curly quote references (avoid literal glyphs in assertions)
const LDQUO = "“"; // opening double quote “
const RDQUO = "”"; // closing double quote ”
const LSQUO = "‘"; // opening single quote ‘
const RSQUO = "’"; // closing single quote / apostrophe ’

describe("useSmartAutocomplete - convertSmartQuotes", () => {
  const createEditorRef = () => ref<HTMLElement | null>(document.createElement("div"));

  it("converts straight double quotes to curly quotes", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef());

    const result = convertSmartQuotes('He said "hello" today');

    expect(result).not.toBeNull();
    expect(result?.type).toBe("smartQuote");
    expect(result?.replacement).toBe(`He said ${LDQUO}hello${RDQUO} today`);
  });

  it("converts a double quote at the start as an opening curly quote", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef());

    const result = convertSmartQuotes('"quoted');

    expect(result).not.toBeNull();
    expect(result?.replacement).toBe(`${LDQUO}quoted`);
  });

  it("converts a double quote before punctuation as a closing curly quote", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef());

    const result = convertSmartQuotes('done".');

    expect(result).not.toBeNull();
    expect(result?.replacement).toBe(`done${RDQUO}.`);
  });

  it("leaves already-curly double-quoted text unchanged", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef());

    const alreadyCurly = `He said ${LDQUO}hello${RDQUO} today`;
    const result = convertSmartQuotes(alreadyCurly);

    // No straight quotes present, so nothing to convert.
    expect(result).toBeNull();
  });

  it("converts single quotes / apostrophes to curly variants", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef());

    const result = convertSmartQuotes("it's 'quoted'");

    expect(result).not.toBeNull();
    // Apostrophe in contraction and opening/closing single quotes
    expect(result?.replacement).toBe(`it${RSQUO}s ${LSQUO}quoted${RSQUO}`);
  });

  it("returns null when there are no quotes to convert", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef());

    expect(convertSmartQuotes("plain text")).toBeNull();
  });

  it("returns null when smart quotes are disabled", () => {
    const { convertSmartQuotes } = useSmartAutocomplete(createEditorRef(), {
      enableSmartQuotes: false,
    });

    expect(convertSmartQuotes('He said "hello"')).toBeNull();
  });
});
