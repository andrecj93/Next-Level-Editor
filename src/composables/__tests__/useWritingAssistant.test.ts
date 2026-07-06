import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import { useWritingAssistant } from "../useWritingAssistant";

/**
 * Unit tests for useWritingAssistant — pure text analytics.
 *
 * Ground-truth numeric values were derived by executing the exact formulas
 * used by the source (Flesch, Gunning Fog, Coleman-Liau, ARI, syllable
 * counter) against fixed input strings, so the assertions pin the real
 * behaviour rather than mocks.
 */
describe("useWritingAssistant", () => {
  // ============================================================
  // Utilities: splitIntoSentences
  // ============================================================
  describe("splitIntoSentences", () => {
    it("splits on ., !, ? and trims + drops empties", () => {
      const { splitIntoSentences } = useWritingAssistant();
      expect(
        splitIntoSentences("Hello world. This is a test! Is it? Yes.")
      ).toEqual(["Hello world", "This is a test", "Is it", "Yes"]);
    });

    it("collapses runs of terminators into a single split", () => {
      const { splitIntoSentences } = useWritingAssistant();
      expect(splitIntoSentences("Wait... really?! Sure")).toEqual([
        "Wait",
        "really",
        "Sure",
      ]);
    });

    it("returns an empty array for empty / whitespace-only text", () => {
      const { splitIntoSentences } = useWritingAssistant();
      expect(splitIntoSentences("")).toEqual([]);
      expect(splitIntoSentences("   \n  ")).toEqual([]);
    });

    it("returns a single sentence when there is no terminator", () => {
      const { splitIntoSentences } = useWritingAssistant();
      expect(splitIntoSentences("no ending punctuation here")).toEqual([
        "no ending punctuation here",
      ]);
    });

    it("normalises the FIRST occurrence of common abbreviations only", () => {
      const { splitIntoSentences } = useWritingAssistant();
      // String.replace with a string pattern only replaces the first hit, so a
      // second "Mr." keeps its period and produces a spurious split.
      expect(
        splitIntoSentences("Mr. Smith went home. Mr. Jones stayed.")
      ).toEqual(["Mr Smith went home", "Mr", "Jones stayed"]);
    });

    it("handles e.g. and i.e. abbreviations", () => {
      const { splitIntoSentences } = useWritingAssistant();
      expect(splitIntoSentences("See e.g. this. And i.e. that.")).toEqual([
        "See eg this",
        "And ie that",
      ]);
    });
  });

  // ============================================================
  // Utilities: splitIntoWords
  // ============================================================
  describe("splitIntoWords", () => {
    it("lowercases, strips punctuation and splits on whitespace", () => {
      const { splitIntoWords } = useWritingAssistant();
      expect(splitIntoWords("Hello, world! Its a test-case.")).toEqual([
        "hello",
        "world",
        "its",
        "a",
        "test",
        "case",
      ]);
    });

    it("keeps underscores/digits (\\w) and drops empty tokens", () => {
      const { splitIntoWords } = useWritingAssistant();
      expect(splitIntoWords("foo_bar  123   ")).toEqual(["foo_bar", "123"]);
    });

    it("returns an empty array for empty text", () => {
      const { splitIntoWords } = useWritingAssistant();
      expect(splitIntoWords("")).toEqual([]);
    });

    it("returns an empty array for punctuation-only text", () => {
      const { splitIntoWords } = useWritingAssistant();
      expect(splitIntoWords("!!! ??? ...")).toEqual([]);
    });
  });

  // ============================================================
  // Utilities: countSyllables
  // ============================================================
  describe("countSyllables", () => {
    it("returns 1 for words of length <= 3", () => {
      const { countSyllables } = useWritingAssistant();
      expect(countSyllables("cat")).toBe(1);
      expect(countSyllables("the")).toBe(1);
      expect(countSyllables("a")).toBe(1);
      expect(countSyllables("I")).toBe(1); // lowercased internally
    });

    it("counts vowel groups for multi-syllable words", () => {
      const { countSyllables } = useWritingAssistant();
      expect(countSyllables("hello")).toBe(2);
      expect(countSyllables("yellow")).toBe(2);
      expect(countSyllables("banana")).toBe(3);
      expect(countSyllables("beautiful")).toBe(4);
      expect(countSyllables("readability")).toBe(5);
      expect(countSyllables("approximately")).toBe(6);
    });

    it("removes a silent trailing e before counting", () => {
      const { countSyllables } = useWritingAssistant();
      // "code" -> "cod" -> 1 vowel group
      expect(countSyllables("code")).toBe(1);
      expect(countSyllables("hope")).toBe(1);
    });

    it("removes a trailing -ed / -es cluster before counting", () => {
      const { countSyllables } = useWritingAssistant();
      // "hoped" -> "hop" -> 1 ; "codes" -> "cod" -> 1
      expect(countSyllables("hoped")).toBe(1);
      expect(countSyllables("codes")).toBe(1);
    });

    it("falls back to 1 when no vowel group is found", () => {
      const { countSyllables } = useWritingAssistant();
      // 4+ chars with no a/e/i/o/u/y left after processing
      expect(countSyllables("rhythm")).toBe(1);
      expect(countSyllables("bcdf")).toBe(1);
    });

    it("is case-insensitive", () => {
      const { countSyllables } = useWritingAssistant();
      expect(countSyllables("BEAUTIFUL")).toBe(countSyllables("beautiful"));
    });
  });

  // ============================================================
  // Statistics: calculateStats
  // ============================================================
  describe("calculateStats", () => {
    it("computes every field for a known sentence", () => {
      const { calculateStats } = useWritingAssistant();
      const s = calculateStats("The cat sat on the mat. The dog ran fast.");
      expect(s.words).toBe(10);
      expect(s.characters).toBe(41);
      expect(s.charactersNoSpaces).toBe(32);
      expect(s.sentences).toBe(2);
      expect(s.paragraphs).toBe(1);
      expect(s.syllables).toBe(10); // every word is monosyllabic
      // reading/speaking time is ceil(words / speed)
      expect(s.readingTime).toBe(1); // ceil(10/200)
      expect(s.speakingTime).toBe(1); // ceil(10/150)
    });

    it("counts paragraphs split by blank lines", () => {
      const { calculateStats } = useWritingAssistant();
      const s = calculateStats("First para.\n\nSecond para.\n\n\nThird para.");
      expect(s.paragraphs).toBe(3);
    });

    it("returns all-zero stats for empty input", () => {
      const { calculateStats } = useWritingAssistant();
      const s = calculateStats("");
      expect(s).toEqual({
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        syllables: 0,
        readingTime: 0,
        speakingTime: 0,
      });
    });

    it("respects custom reading/speaking speeds", () => {
      const { calculateStats } = useWritingAssistant({
        readingSpeed: 2,
        speakingSpeed: 3,
      });
      // 10 words -> ceil(10/2)=5 reading, ceil(10/3)=4 speaking
      const s = calculateStats("one two three four five six seven eight nine ten");
      expect(s.words).toBe(10);
      expect(s.readingTime).toBe(5);
      expect(s.speakingTime).toBe(4);
    });

    it("counts characters including spaces vs excluding whitespace", () => {
      const { calculateStats } = useWritingAssistant();
      const s = calculateStats("a b\tc\nd");
      expect(s.characters).toBe(7); // a,space,b,tab,c,newline,d
      expect(s.charactersNoSpaces).toBe(4); // a,b,c,d
    });
  });

  // ============================================================
  // Readability: calculateReadability
  // ============================================================
  describe("calculateReadability", () => {
    it("returns all zeros for empty text (guards short-circuit)", () => {
      const { calculateReadability } = useWritingAssistant();
      const r = calculateReadability("");
      expect(r.fleschReadingEase).toBe(0);
      expect(r.fleschKincaidGrade).toBe(0);
      expect(r.gunningFog).toBe(0);
      expect(r.colemanLiauIndex).toBe(0);
      expect(r.automatedReadabilityIndex).toBe(0);
      expect(r.averageGradeLevel).toBe(0);
    });

    it("clamps easy monosyllabic prose to the extremes", () => {
      const { calculateReadability } = useWritingAssistant();
      const r = calculateReadability("The cat sat on the mat. The dog ran fast.");
      // Very easy prose: Flesch clamps to 100, all grade formulas clamp to 0
      expect(r.fleschReadingEase).toBe(100);
      expect(r.fleschKincaidGrade).toBe(0);
      expect(r.gunningFog).toBeCloseTo(2, 5); // 0.4 * (5 + 0)
      expect(r.colemanLiauIndex).toBe(0);
      expect(r.automatedReadabilityIndex).toBe(0);
      expect(r.averageGradeLevel).toBeCloseTo(0.5, 5); // (0+2+0+0)/4
    });

    it("computes exact scores for a single two-syllable word", () => {
      const { calculateReadability } = useWritingAssistant();
      const r = calculateReadability("Hello.");
      // 1 word, 1 sentence, 2 syllables, 6 chars-no-space
      expect(r.fleschReadingEase).toBeCloseTo(36.62, 2);
      expect(r.fleschKincaidGrade).toBeCloseTo(8.4, 5);
      expect(r.gunningFog).toBeCloseTo(0.4, 5); // 0.4 * (1 + 0)
      expect(r.colemanLiauIndex).toBe(0); // clamped
      expect(r.automatedReadabilityIndex).toBeCloseTo(7.33, 2);
      expect(r.averageGradeLevel).toBeCloseTo(4.0325, 3);
    });

    it("produces higher grade levels for complex, long-sentence prose", () => {
      const { calculateReadability } = useWritingAssistant();
      const complex =
        "The extraordinarily sophisticated implementation demonstrates considerable " +
        "architectural complexity throughout numerous interconnected subsystems.";
      const r = calculateReadability(complex);
      // Dense polysyllabic single sentence -> Flesch drops well below 50
      expect(r.fleschReadingEase).toBeLessThan(50);
      expect(r.gunningFog).toBeGreaterThan(10);
      expect(r.averageGradeLevel).toBeGreaterThan(10);
    });

    it("keeps Flesch reading ease within the 0..100 bounds", () => {
      const { calculateReadability } = useWritingAssistant();
      const r = calculateReadability(
        "Antidisestablishmentarianism pseudopseudohypoparathyroidism " +
          "incomprehensibilities."
      );
      expect(r.fleschReadingEase).toBeGreaterThanOrEqual(0);
      expect(r.fleschReadingEase).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================
  // Sentence analysis
  // ============================================================
  describe("analyzeSentences", () => {
    it("classifies sentences by length and computes averages", () => {
      const { analyzeSentences } = useWritingAssistant();
      const short = "One two three."; // 3 words -> short
      const medium =
        "This medium sentence contains exactly seventeen carefully chosen " +
        "distinct words to land inside the middle band."; // >=15 && <=25
      const long =
        "This long sentence has been engineered to contain far more than " +
        "twenty five separate words so that it clearly counts as a long one " +
        "for the purposes of this particular structural analysis test case " +
        "here."; // >25 words
      const a = analyzeSentences(`${short} ${medium} ${long}`);
      expect(a.totalSentences).toBe(3);
      expect(a.shortSentences).toBe(1);
      expect(a.mediumSentences).toBe(1);
      expect(a.longSentences).toBe(1);
      expect(a.longestSentence).toBeGreaterThan(25);
      expect(a.averageWordsPerSentence).toBeGreaterThan(0);
    });

    it("returns zeros for empty text", () => {
      const { analyzeSentences } = useWritingAssistant();
      const a = analyzeSentences("");
      expect(a.totalSentences).toBe(0);
      expect(a.shortSentences).toBe(0);
      expect(a.mediumSentences).toBe(0);
      expect(a.longSentences).toBe(0);
      expect(a.averageWordsPerSentence).toBe(0);
      expect(a.longestSentence).toBe(0);
    });

    it("computes exact average words per sentence", () => {
      const { analyzeSentences } = useWritingAssistant();
      // sentence1 = 2 words, sentence2 = 4 words -> avg = 3
      const a = analyzeSentences("Hello there. This is a test.");
      expect(a.totalSentences).toBe(2);
      expect(a.averageWordsPerSentence).toBe(3);
      expect(a.longestSentence).toBe(4);
    });

    it("treats a 15-word sentence as medium (boundary)", () => {
      const { analyzeSentences } = useWritingAssistant();
      const fifteen = Array.from({ length: 15 }, (_, i) => `word${i}`).join(" ");
      const a = analyzeSentences(`${fifteen}.`);
      expect(a.mediumSentences).toBe(1);
      expect(a.shortSentences).toBe(0);
      expect(a.longSentences).toBe(0);
    });
  });

  // ============================================================
  // Word analysis
  // ============================================================
  describe("analyzeWords", () => {
    it("computes counts, unique words and average length", () => {
      const { analyzeWords } = useWritingAssistant();
      const w = analyzeWords("cat cat dog");
      expect(w.totalWords).toBe(3);
      expect(w.uniqueWords).toBe(2);
      // (3 + 3 + 3) / 3 = 3
      expect(w.averageWordLength).toBe(3);
    });

    it("flags long (>6) and very long (>12) words", () => {
      const { analyzeWords } = useWritingAssistant();
      const w = analyzeWords("tiny elephants extraordinarily");
      // lengths: tiny=4, elephants=9(>6), extraordinarily=15(>6 and >12)
      expect(w.longWords).toBe(2);
      expect(w.veryLongWords).toBe(1);
    });

    it("returns most common non-stopword words above the frequency threshold", () => {
      const { analyzeWords } = useWritingAssistant();
      // "the" is a stop word (excluded); "banana" repeated 3 times passes minFreq=3
      const text = "the the the banana banana banana apple apple";
      const w = analyzeWords(text);
      const names = w.mostCommonWords.map((c) => c.word);
      expect(names).toContain("banana");
      expect(names).not.toContain("the"); // stop word
      expect(names).not.toContain("apple"); // only 2 < minWordFrequency(3)
      const banana = w.mostCommonWords.find((c) => c.word === "banana");
      expect(banana?.count).toBe(3);
    });

    it("honours a custom minWordFrequency", () => {
      const { analyzeWords } = useWritingAssistant({ minWordFrequency: 1 });
      const w = analyzeWords("apple banana");
      const names = w.mostCommonWords.map((c) => c.word);
      expect(names).toContain("apple");
      expect(names).toContain("banana");
    });

    it("returns empty analysis for empty text", () => {
      const { analyzeWords } = useWritingAssistant();
      const w = analyzeWords("");
      expect(w.totalWords).toBe(0);
      expect(w.uniqueWords).toBe(0);
      expect(w.averageWordLength).toBe(0);
      expect(w.longWords).toBe(0);
      expect(w.veryLongWords).toBe(0);
      expect(w.mostCommonWords).toEqual([]);
    });

    it("caps most common words at 10 and sorts by descending count", () => {
      const { analyzeWords } = useWritingAssistant({ minWordFrequency: 1 });
      // 12 distinct non-stopwords, each appearing a decreasing number of times
      const parts: string[] = [];
      const labels = "abcdefghijkl".split("");
      labels.forEach((ch, i) => {
        const word = `word${ch}`;
        for (let n = 0; n < 12 - i; n++) parts.push(word);
      });
      const w = analyzeWords(parts.join(" "));
      expect(w.mostCommonWords.length).toBe(10);
      // sorted descending
      for (let i = 1; i < w.mostCommonWords.length; i++) {
        expect(w.mostCommonWords[i - 1].count).toBeGreaterThanOrEqual(
          w.mostCommonWords[i].count
        );
      }
    });
  });

  // ============================================================
  // Issue detection: passive voice
  // ============================================================
  describe("detectPassiveVoice", () => {
    it("detects be-verb + past participle patterns", () => {
      const { detectPassiveVoice } = useWritingAssistant();
      // "thrown" ends in wn (no match); "eaten" ends in en (matches)
      const r = detectPassiveVoice("The ball was thrown. The cake is eaten.");
      expect(r).toHaveLength(1);
      expect(r[0].text.toLowerCase()).toBe("is eaten");
      expect(r[0].position).toBeGreaterThan(0);
    });

    it("detects -ed participles", () => {
      const { detectPassiveVoice } = useWritingAssistant();
      const r = detectPassiveVoice("The document was signed by the manager.");
      expect(r.map((x) => x.text.toLowerCase())).toContain("was signed");
    });

    it("returns nothing for active voice", () => {
      const { detectPassiveVoice } = useWritingAssistant();
      expect(detectPassiveVoice("The cat runs fast every day.")).toEqual([]);
    });

    it("is disabled when checkPassiveVoice is false", () => {
      const { detectPassiveVoice } = useWritingAssistant({
        checkPassiveVoice: false,
      });
      expect(detectPassiveVoice("The cake is eaten.")).toEqual([]);
    });
  });

  // ============================================================
  // Issue detection: adverbs
  // ============================================================
  describe("detectAdverbs", () => {
    it("flags configured adverbs regardless of case", () => {
      const { detectAdverbs } = useWritingAssistant();
      const r = detectAdverbs("It was VERY good and really really fast.");
      const words = r.map((x) => x.word.toLowerCase());
      expect(words).toContain("very");
      // "really" appears twice
      expect(words.filter((w) => w === "really")).toHaveLength(2);
    });

    it("uses word boundaries (no substring matches)", () => {
      const { detectAdverbs } = useWritingAssistant();
      // "justice" contains "just" but must not match
      expect(detectAdverbs("justice served")).toEqual([]);
    });

    it("returns nothing when there are no flagged adverbs", () => {
      const { detectAdverbs } = useWritingAssistant();
      expect(detectAdverbs("The dog walked home.")).toEqual([]);
    });

    it("is disabled when checkAdverbs is false", () => {
      const { detectAdverbs } = useWritingAssistant({ checkAdverbs: false });
      expect(detectAdverbs("This is very very good.")).toEqual([]);
    });
  });

  // ============================================================
  // Issue detection: complex words
  // ============================================================
  describe("detectComplexWords", () => {
    it("flags complex words and returns a simpler suggestion", () => {
      const { detectComplexWords } = useWritingAssistant();
      const r = detectComplexWords("We must utilize the tool to facilitate work.");
      const map = new Map(r.map((x) => [x.word.toLowerCase(), x.suggestion]));
      expect(map.get("utilize")).toBe("use");
      expect(map.get("facilitate")).toBe("help");
    });

    it("records the position of each match", () => {
      const { detectComplexWords } = useWritingAssistant();
      const text = "Please utilize this.";
      const r = detectComplexWords(text);
      expect(r).toHaveLength(1);
      expect(text.slice(r[0].position, r[0].position + 7)).toBe("utilize");
    });

    it("returns nothing when there are no complex words", () => {
      const { detectComplexWords } = useWritingAssistant();
      expect(detectComplexWords("Keep it short and clear.")).toEqual([]);
    });

    it("is disabled when checkComplexWords is false", () => {
      const { detectComplexWords } = useWritingAssistant({
        checkComplexWords: false,
      });
      expect(detectComplexWords("We utilize things.")).toEqual([]);
    });
  });

  // ============================================================
  // Issue detection: repeated words
  // ============================================================
  describe("detectRepeatedWords", () => {
    it("flags words > 4 chars used more than 5 times, sorted by count", () => {
      const { detectRepeatedWords } = useWritingAssistant();
      const text = `${"elephant ".repeat(6)}${"tigers ".repeat(7)}`;
      const r = detectRepeatedWords(text);
      expect(r).toEqual([
        { word: "tigers", count: 7 },
        { word: "elephant", count: 6 },
      ]);
    });

    it("ignores words used exactly 5 times (needs > 5)", () => {
      const { detectRepeatedWords } = useWritingAssistant();
      expect(detectRepeatedWords("banana ".repeat(5))).toEqual([]);
    });

    it("ignores short words (<= 4 chars) even when frequent", () => {
      const { detectRepeatedWords } = useWritingAssistant();
      // "cats" is 4 chars -> never tracked
      expect(detectRepeatedWords("cats ".repeat(10))).toEqual([]);
    });

    it("is NOT gated by any check* flag", () => {
      const { detectRepeatedWords } = useWritingAssistant({
        checkPassiveVoice: false,
        checkAdverbs: false,
        checkComplexWords: false,
        checkCliches: false,
      });
      expect(detectRepeatedWords("banana ".repeat(6))).toEqual([
        { word: "banana", count: 6 },
      ]);
    });
  });

  // ============================================================
  // Issue detection: clichés
  // ============================================================
  describe("detectCliches", () => {
    it("finds cliché phrases case-insensitively with positions", () => {
      const { detectCliches } = useWritingAssistant();
      const text = "At the end of the day we must think outside the box.";
      const r = detectCliches(text);
      const phrases = r.map((x) => x.phrase);
      expect(phrases).toContain("at the end of the day");
      expect(phrases).toContain("think outside the box");
      // positions point at the (lowercased) match location
      const first = r.find((x) => x.phrase === "at the end of the day");
      expect(text.toLowerCase().slice(first!.position)).toContain(
        "at the end of the day"
      );
    });

    it("finds multiple occurrences of the same cliché", () => {
      const { detectCliches } = useWritingAssistant();
      const r = detectCliches("synergy here and synergy there");
      expect(r.filter((x) => x.phrase === "synergy")).toHaveLength(2);
    });

    it("returns nothing when there are no clichés", () => {
      const { detectCliches } = useWritingAssistant();
      expect(detectCliches("A perfectly plain original sentence.")).toEqual([]);
    });

    it("is disabled when checkCliches is false", () => {
      const { detectCliches } = useWritingAssistant({ checkCliches: false });
      expect(detectCliches("Let us circle back later.")).toEqual([]);
    });
  });

  // ============================================================
  // detectIssues aggregation
  // ============================================================
  describe("detectIssues", () => {
    it("aggregates all issue categories", () => {
      const { detectIssues } = useWritingAssistant();
      const text =
        "The report was written very quickly. We should utilize synergy and " +
        `${"paragraph ".repeat(6)}to move the needle.`;
      const issues = detectIssues(text);
      expect(issues.passiveVoice.length).toBeGreaterThan(0);
      expect(issues.adverbs.map((a) => a.word.toLowerCase())).toContain("very");
      expect(issues.complexWords.map((c) => c.word.toLowerCase())).toContain(
        "utilize"
      );
      expect(issues.cliches.map((c) => c.phrase)).toContain("synergy");
      expect(issues.repeatedWords.map((r) => r.word)).toContain("paragraph");
    });

    it("returns empty categories for empty text", () => {
      const { detectIssues } = useWritingAssistant();
      const issues = detectIssues("");
      expect(issues.passiveVoice).toEqual([]);
      expect(issues.adverbs).toEqual([]);
      expect(issues.complexWords).toEqual([]);
      expect(issues.repeatedWords).toEqual([]);
      expect(issues.cliches).toEqual([]);
    });
  });

  // ============================================================
  // extractPlainText
  // ============================================================
  describe("extractPlainText", () => {
    it("strips tags and returns text content", () => {
      const { extractPlainText } = useWritingAssistant();
      expect(extractPlainText("<p>Hello <strong>world</strong></p>")).toBe(
        "Hello world"
      );
    });

    it("returns an empty string for empty HTML", () => {
      const { extractPlainText } = useWritingAssistant();
      expect(extractPlainText("")).toBe("");
    });

    it("ignores script/style markup structure but keeps text nodes", () => {
      const { extractPlainText } = useWritingAssistant();
      const out = extractPlainText("<div><span>a</span><span>b</span></div>");
      expect(out).toBe("ab");
    });
  });

  // ============================================================
  // SEO analysis
  // ============================================================
  describe("analyzeSEO", () => {
    it("counts headings and detects proper hierarchy", () => {
      const { analyzeSEO } = useWritingAssistant();
      const html =
        "<h1>Title</h1><h2>Sub</h2><h2>Sub2</h2><h3>Deep</h3><p>Body text here.</p>";
      const seo = analyzeSEO(html);
      expect(seo.headingStructure.h1Count).toBe(1);
      expect(seo.headingStructure.h2Count).toBe(2);
      expect(seo.headingStructure.h3Count).toBe(1);
      expect(seo.headingStructure.hasProperHierarchy).toBe(true);
    });

    it("flags improper hierarchy when H1 is missing or duplicated", () => {
      const { analyzeSEO } = useWritingAssistant();
      const two = analyzeSEO("<h1>A</h1><h1>B</h1><h2>C</h2>");
      expect(two.headingStructure.hasProperHierarchy).toBe(false); // h1Count !== 1
      const noH2 = analyzeSEO("<h1>A</h1><p>x</p>");
      expect(noH2.headingStructure.hasProperHierarchy).toBe(false); // no h2
    });

    it("extracts a meta description from the first paragraph (max 160 chars)", () => {
      const { analyzeSEO } = useWritingAssistant();
      const long = "word ".repeat(60); // 300 chars
      const seo = analyzeSEO(`<p>${long}</p>`);
      expect(seo.metaDescriptionLength).toBe(160);
      expect(seo.metaDescription.length).toBe(160);
    });

    it("returns an empty meta description when there is no paragraph", () => {
      const { analyzeSEO } = useWritingAssistant();
      const seo = analyzeSEO("<h1>Only a heading</h1>");
      expect(seo.metaDescription).toBe("");
      expect(seo.metaDescriptionLength).toBe(0);
    });

    it("builds keyword density and recommended keywords (top 5)", () => {
      const { analyzeSEO } = useWritingAssistant();
      // "keyword" (>3 chars) repeated heavily so density > 0.5%
      const html = `<p>${"keyword ".repeat(20)} filler.</p>`;
      const seo = analyzeSEO(html);
      expect(seo.keywordDensity.has("keyword")).toBe(true);
      expect(seo.keywordDensity.get("keyword")).toBeGreaterThan(0.5);
      expect(seo.recommendedKeywords).toContain("keyword");
      expect(seo.recommendedKeywords.length).toBeLessThanOrEqual(5);
    });

    it("scores a well-structured, content-rich document highly", () => {
      const { analyzeSEO } = useWritingAssistant();
      // >=300 words, single H1, H2 + H3, and a 120-160 char first paragraph.
      const metaSentence =
        "This introductory paragraph is deliberately written to be long " +
        "enough to fall within the ideal meta description length window."; // ~130 chars
      const body = "content ".repeat(320);
      const html =
        `<h1>Main</h1>` +
        `<p>${metaSentence}</p>` +
        `<h2>Section</h2><h3>Subsection</h3>` +
        `<p>${body}</p>`;
      const seo = analyzeSEO(html);
      expect(seo.metaDescription.length).toBeGreaterThanOrEqual(120);
      expect(seo.metaDescription.length).toBeLessThanOrEqual(160);
      // 20 (h1) +15 (h2) +10 (h3) +15 (hierarchy) +20 (meta) +10 (content) +10 (keywords) = 100
      expect(seo.score).toBe(100);
    });

    it("gives a low score to a bare, tiny document", () => {
      const { analyzeSEO } = useWritingAssistant();
      const seo = analyzeSEO("<p>hi there friend</p>");
      // No h1/h2/h3, short meta, little content. Only possible points come from
      // keyword density; with such short words there may be none.
      expect(seo.score).toBeLessThan(20);
      expect(seo.headingStructure.h1Count).toBe(0);
    });

    it("caps the score at 100", () => {
      const { analyzeSEO } = useWritingAssistant();
      const metaSentence =
        "This introductory paragraph is deliberately written to be long " +
        "enough to fall within the ideal meta description length window.";
      const html =
        `<h1>Main</h1><p>${metaSentence}</p><h2>S</h2><h3>D</h3>` +
        `<p>${"content ".repeat(400)}</p>`;
      const seo = analyzeSEO(html);
      expect(seo.score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================
  // analyze() async orchestration + reactive state
  // ============================================================
  describe("analyze", () => {
    it("returns a full report and syncs textContent", async () => {
      const wa = useWritingAssistant();
      const report = await wa.analyze("<p>The quick brown fox jumps.</p>");
      expect(report.stats.words).toBe(5);
      expect(report.stats.sentences).toBe(1);
      expect(report.readability).toBeTruthy();
      expect(report.sentenceAnalysis.totalSentences).toBe(1);
      expect(report.wordAnalysis.totalWords).toBe(5);
      expect(report.issues).toBeTruthy();
      expect(report.seo).toBeTruthy();
      expect(wa.textContent.value).toBe("The quick brown fox jumps.");
    });

    it("resets isAnalyzing back to false after completion", async () => {
      const wa = useWritingAssistant();
      expect(wa.isAnalyzing.value).toBe(false);
      await wa.analyze("<p>hello</p>");
      expect(wa.isAnalyzing.value).toBe(false);
    });

    it("handles empty HTML gracefully", async () => {
      const wa = useWritingAssistant();
      const report = await wa.analyze("");
      expect(report.stats.words).toBe(0);
      expect(report.readability.averageGradeLevel).toBe(0);
      expect(wa.textContent.value).toBe("");
    });
  });

  // ============================================================
  // Computed properties reactivity
  // ============================================================
  describe("computed properties", () => {
    it("stats/readability/etc are null until textContent is set", () => {
      const wa = useWritingAssistant();
      expect(wa.stats.value).toBeNull();
      expect(wa.readability.value).toBeNull();
      expect(wa.sentenceAnalysis.value).toBeNull();
      expect(wa.wordAnalysis.value).toBeNull();
      expect(wa.issues.value).toBeNull();
    });

    it("seo is null until analyze() populates htmlContent", () => {
      const wa = useWritingAssistant();
      // htmlContent is internal; seo stays null while nothing analyzed
      expect(wa.seo.value).toBeNull();
    });

    it("recomputes reactively when textContent changes", async () => {
      const wa = useWritingAssistant();
      wa.textContent.value = "The cat sat on the mat.";
      await nextTick();
      expect(wa.stats.value).not.toBeNull();
      expect(wa.stats.value!.words).toBe(6);
      expect(wa.wordAnalysis.value!.totalWords).toBe(6);
      expect(wa.sentenceAnalysis.value!.totalSentences).toBe(1);
      expect(wa.issues.value).not.toBeNull();
    });

    it("populates seo computed after analyze()", async () => {
      const wa = useWritingAssistant();
      await wa.analyze("<h1>Hi</h1><h2>Sub</h2><p>Body content.</p>");
      await nextTick();
      expect(wa.seo.value).not.toBeNull();
      expect(wa.seo.value!.headingStructure.h1Count).toBe(1);
    });
  });
});
