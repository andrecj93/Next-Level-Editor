import { describe, it, expect } from "vitest";
import { useWritingAssistant } from "../useWritingAssistant";

/**
 * Word/character/sentence stats fused text across TABLE CELLS: BLOCK_TAGS had
 * `table`/`tr` but not `td`/`th`, so `<td>hello</td><td>world</td>` extracted
 * as "helloworld" — one word instead of two, and sentences ran across cells.
 * Cells must introduce a text boundary like every other block.
 */
describe("useWritingAssistant: table cells are word boundaries", () => {
  const { analyze } = useWritingAssistant();

  it("counts cell contents as separate words", async () => {
    const result = await analyze(
      "<table><tbody><tr><td>hello</td><td>world</td></tr></tbody></table>"
    );
    expect(result.stats.words).toBe(2);
  });

  it("does not run a sentence across two cells", async () => {
    const result = await analyze(
      "<table><tbody><tr><td>First cell</td><td>Second cell</td></tr></tbody></table>"
    );
    // "First cell" and "Second cell" are distinct — never "First cellSecond".
    expect(result.stats.words).toBe(4);
  });

  it("counts header cells separately too", async () => {
    const result = await analyze(
      "<table><thead><tr><th>Name</th><th>Age</th></tr></thead></table>"
    );
    expect(result.stats.words).toBe(2);
  });
});
