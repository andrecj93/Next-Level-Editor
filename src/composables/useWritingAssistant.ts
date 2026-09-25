import { ref, computed, onScopeDispose } from "vue";
import { splitWords, countCharacters } from "../utils/wordSegmentation";
import { writingBlocks } from "../utils/writingReview";

/**
 * Text statistics
 */
export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  syllables: number;
  readingTime: number; // in minutes
  speakingTime: number; // in minutes
}

/**
 * Readability scores
 */
export interface ReadabilityScores {
  fleschReadingEase: number; // 0-100 (higher is easier)
  fleschKincaidGrade: number; // US grade level
  gunningFog: number; // years of education needed
  colemanLiauIndex: number; // US grade level
  automatedReadabilityIndex: number; // US grade level
  averageGradeLevel: number; // average of all grade levels
}

/**
 * Sentence analysis
 */
export interface SentenceAnalysis {
  totalSentences: number;
  shortSentences: number; // <15 words
  mediumSentences: number; // 15-25 words
  longSentences: number; // >25 words
  averageWordsPerSentence: number;
  longestSentence: number;
}

/**
 * Word analysis
 */
export interface WordAnalysis {
  totalWords: number;
  uniqueWords: number;
  averageWordLength: number;
  longWords: number; // >6 characters
  veryLongWords: number; // >12 characters
  mostCommonWords: Array<{ word: string; count: number }>;
}

/**
 * Writing issues
 */
export interface WritingIssues {
  passiveVoice: Array<{ text: string; position: number }>;
  adverbs: Array<{ word: string; position: number }>;
  complexWords: Array<{ word: string; position: number; suggestion?: string }>;
  repeatedWords: Array<{ word: string; count: number }>;
  cliches: Array<{ phrase: string; position: number }>;
}

/**
 * SEO analysis
 */
export interface SEOAnalysis {
  score: number; // 0-100
  keywordDensity: Map<string, number>; // word -> percentage
  headingStructure: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasProperHierarchy: boolean;
  };
  metaDescription: string;
  metaDescriptionLength: number;
  recommendedKeywords: string[];
}

/**
 * Writing assistant options
 */
export interface WritingAssistantOptions {
  readingSpeed?: number; // words per minute (default: 200)
  speakingSpeed?: number; // words per minute (default: 130, the read-aloud rate the UI advertises)
  checkPassiveVoice?: boolean;
  checkAdverbs?: boolean;
  checkComplexWords?: boolean;
  checkCliches?: boolean;
  minWordFrequency?: number; // for common words (default: 3)
}

/**
 * Professional writing assistant and text analytics
 *
 * Inspired by:
 * - Hemingway Editor
 * - Grammarly analytics
 * - Yoast SEO
 * - Microsoft Word statistics
 *
 * Features:
 * - Flesch-Kincaid readability scores
 * - Reading time estimation
 * - Comprehensive word/sentence analysis
 * - Passive voice detection
 * - SEO scoring
 * - Writing quality suggestions
 */
export function useWritingAssistant(options: WritingAssistantOptions = {}) {
  const {
    readingSpeed = 200,
    speakingSpeed = 130,
    checkPassiveVoice = true,
    checkAdverbs = true,
    checkComplexWords = true,
    checkCliches = true,
    minWordFrequency = 3,
  } = options;

  // State
  const textContent = ref("");
  // Last analyzed HTML — kept so the SEO computed (which needs markup, e.g.
  // heading structure) stays reactive alongside the plain-text computeds.
  const htmlContent = ref("");
  const isAnalyzing = ref(false);

  // Passive voice patterns
  const passivePatterns = [
    /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi,
    /\b(am|is|are|was|were|be|been|being)\s+\w+en\b/gi,
  ];

  // Common adverbs to flag
  const commonAdverbs = [
    "very",
    "really",
    "quite",
    "rather",
    "fairly",
    "pretty",
    "just",
    "actually",
    "basically",
    "literally",
    "seriously",
    "totally",
    "completely",
    "absolutely",
    "definitely",
  ];

  // Complex words (can be simplified)
  const complexWordMap: Record<string, string> = {
    utilize: "use",
    facilitate: "help",
    implement: "start",
    demonstrate: "show",
    approximately: "about",
    sufficient: "enough",
    terminate: "end",
    commence: "start",
    endeavor: "try",
    purchase: "buy",
    obtain: "get",
    regarding: "about",
    concerning: "about",
  };

  // Common clichés
  const cliches = [
    "at the end of the day",
    "think outside the box",
    "low-hanging fruit",
    "move the needle",
    "game changer",
    "paradigm shift",
    "synergy",
    "leverage",
    "circle back",
    "touch base",
  ];

  // ============================================
  // Text Processing
  // ============================================

  /** Block-level tags that introduce a boundary between runs of text. */
  const BLOCK_TAGS = new Set([
    "p", "div", "section", "article", "header", "footer", "main", "aside",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "table", "tr",
    // Cells are boundaries too — without td/th, "<td>hello</td><td>world</td>"
    // counted as one word "helloworld" and sentences ran across cells.
    "td", "th", "figure", "hr",
  ]);

  /**
   * Clean HTML and extract plain text, inserting boundaries between blocks.
   *
   * `textContent` alone concatenates block text with NO separator, so
   * `<p>hello</p><p>world</p>` read as "helloworld" — word, paragraph and
   * sentence counts all merged across blocks. Walking the tree and emitting a
   * blank line around each block keeps those boundaries.
   */
  const extractPlainText = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    let out = "";
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? "";
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      // Skip decorative/generated blocks that aren't authored prose — the
      // inserted Table of Contents (its heading + every heading duplicated as a
      // link) and the page-break widgets — or their text inflates every
      // word/char/reading-time/readability stat. #r14b-2
      if (
        el.tagName.toLowerCase() === "script" || el.tagName.toLowerCase() === "style" ||
        el.classList.contains("table-of-contents") ||
        el.classList.contains("page-break")
      ) {
        return;
      }
      const tag = el.tagName.toLowerCase();
      if (tag === "br") {
        out += "\n";
        return;
      }
      const isBlock = BLOCK_TAGS.has(tag);
      if (isBlock) out += "\n\n";
      node.childNodes.forEach(walk);
      if (isBlock) out += "\n\n";
    };
    temp.childNodes.forEach(walk);
    // The block boundaries above wrap the whole doc in leading/trailing "\n\n";
    // those are structural, not content, so trim them (internal separators kept).
    return out.replace(/\u200b/g, '').trim();
  };

  /**
   * Split text into sentences. Abbreviations are protected GLOBALLY (the old
   * single-arg `.replace` only guarded the first occurrence), and decimals are
   * shielded so "3.14" isn't counted as two sentences.
   */
  const splitIntoSentences = (text: string): string[] => {
    const MARK = "⁣"; // invisible separator; shields a decimal point
    const processed = text
      // Multi-dot abbreviations → strip ALL their dots (e.g. -> eg, i.e. -> ie).
      .replace(/\b(?:i\.e|e\.g|a\.m|p\.m|u\.s|u\.k)\.?/gi, (m) =>
        m.replace(/\./g, "")
      )
      // Single-dot titles/abbreviations → drop the trailing period (global, so
      // a second "Mr." no longer produces a spurious split).
      .replace(/\b(Mr|Mrs|Dr|Ms|Prof|Sr|Jr|St|vs|etc)\./g, "$1")
      .replace(/(\d)\.(\d)/g, "$1" + MARK + "$2"); // shield decimals from split

    return processed
      .split(/[.!?]+/)
      .map((s) => s.split(MARK).join(".").trim())
      .filter((s) => s.length > 0);
  };

  /**
   * Split text into words, Unicode-aware. The old `[^\w\s]` used ASCII `\w`,
   * so "café" became "caf", "naïve" split into two, and CJK text counted as
   * zero words. Prefer Intl.Segmenter (segments CJK correctly); fall back to a
   * Unicode property regex.
   */
  const splitIntoWords = splitWords;

  /**
   * Count syllables in a word (approximate)
   */
  const countSyllables = (word: string): number => {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    // Remove silent e
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");

    // Count vowel groups
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  };

  // ============================================
  // Basic Statistics
  // ============================================

  /**
   * Calculate text statistics
   */
  const calculateStats = (text: string): TextStats => {
    const sentences = splitIntoSentences(text);
    const words = splitIntoWords(text);
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

    // Match the footer: visible characters, with one space between blocks.
    const characters = countCharacters(text.replace(/\s+/g, " ").trim());
    const charactersNoSpaces = countCharacters(text.replace(/\s/g, ""));

    // Count syllables
    const syllables = words.reduce(
      (sum, word) => sum + countSyllables(word),
      0
    );

    // Calculate reading time
    const readingTime = words.length / readingSpeed;
    const speakingTimeVal = words.length / speakingSpeed;

    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      syllables,
      readingTime: Math.ceil(readingTime),
      speakingTime: Math.ceil(speakingTimeVal),
    };
  };

  /** Count authored prose blocks, using the same boundaries as the companion.
   * Headings still contribute words, but are not paragraphs. Soft line breaks
   * do not create extra paragraphs; nested containers do not count twice.
   * Keep calculateStats(text)'s plain-text API unchanged for consumers.
   */
  const calculateDocumentStats = (html: string, text: string): TextStats => {
    if (!html) return calculateStats(text);
    const root = document.createElement("div");
    root.innerHTML = html;
    root.querySelectorAll(".table-of-contents,.page-break").forEach(el => el.remove());
    const paragraphs = writingBlocks(root).filter(block =>
      !/^H[1-6]$/.test(block.element.tagName)).length;
    return { ...calculateStats(text), paragraphs };
  };

  // ============================================
  // Readability Scores
  // ============================================

  /**
   * Flesch Reading Ease (0-100, higher is easier)
   * 90-100: Very Easy (5th grade)
   * 80-90: Easy (6th grade)
   * 70-80: Fairly Easy (7th grade)
   * 60-70: Standard (8th-9th grade)
   * 50-60: Fairly Difficult (10th-12th grade)
   * 30-50: Difficult (College)
   * 0-30: Very Difficult (College graduate)
   */
  const calculateFleschReadingEase = (stats: TextStats): number => {
    if (stats.sentences === 0 || stats.words === 0) return 0;

    const avgWordsPerSentence = stats.words / stats.sentences;
    const avgSyllablesPerWord = stats.syllables / stats.words;

    const score =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    return Math.max(0, Math.min(100, score));
  };

  /**
   * Flesch-Kincaid Grade Level
   */
  const calculateFleschKincaidGrade = (stats: TextStats): number => {
    if (stats.sentences === 0 || stats.words === 0) return 0;

    const avgWordsPerSentence = stats.words / stats.sentences;
    const avgSyllablesPerWord = stats.syllables / stats.words;

    const grade =
      0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    return Math.max(0, grade);
  };

  /**
   * Gunning Fog Index
   */
  const calculateGunningFog = (text: string, stats: TextStats): number => {
    if (stats.sentences === 0 || stats.words === 0) return 0;

    const words = splitIntoWords(text);
    const complexWords = words.filter((w) => countSyllables(w) >= 3).length;

    const avgWordsPerSentence = stats.words / stats.sentences;
    const percentComplexWords = (complexWords / stats.words) * 100;

    const fog = 0.4 * (avgWordsPerSentence + percentComplexWords);

    return Math.max(0, fog);
  };

  /**
   * Coleman-Liau Index
   */
  const calculateColemanLiau = (stats: TextStats): number => {
    if (stats.words === 0) return 0;

    const avgLettersPer100Words =
      (stats.charactersNoSpaces / stats.words) * 100;
    const avgSentencesPer100Words = (stats.sentences / stats.words) * 100;

    const index =
      0.0588 * avgLettersPer100Words - 0.296 * avgSentencesPer100Words - 15.8;

    return Math.max(0, index);
  };

  /**
   * Automated Readability Index
   */
  const calculateARI = (stats: TextStats): number => {
    if (stats.sentences === 0 || stats.words === 0) return 0;

    const avgCharsPerWord = stats.charactersNoSpaces / stats.words;
    const avgWordsPerSentence = stats.words / stats.sentences;

    const ari = 4.71 * avgCharsPerWord + 0.5 * avgWordsPerSentence - 21.43;

    return Math.max(0, ari);
  };

  /**
   * Calculate all readability scores
   */
  const calculateReadability = (text: string): ReadabilityScores => {
    const stats = calculateStats(text);

    const fleschReadingEase = calculateFleschReadingEase(stats);
    const fleschKincaidGrade = calculateFleschKincaidGrade(stats);
    const gunningFog = calculateGunningFog(text, stats);
    const colemanLiauIndex = calculateColemanLiau(stats);
    const automatedReadabilityIndex = calculateARI(stats);

    const averageGradeLevel =
      (fleschKincaidGrade +
        gunningFog +
        colemanLiauIndex +
        automatedReadabilityIndex) /
      4;

    return {
      fleschReadingEase,
      fleschKincaidGrade,
      gunningFog,
      colemanLiauIndex,
      automatedReadabilityIndex,
      averageGradeLevel,
    };
  };

  // ============================================
  // Sentence Analysis
  // ============================================

  /**
   * Analyze sentence structure
   */
  const analyzeSentences = (text: string): SentenceAnalysis => {
    const sentences = splitIntoSentences(text);
    const sentenceLengths = sentences.map((s) => splitIntoWords(s).length);

    const shortSentences = sentenceLengths.filter((len) => len < 15).length;
    const mediumSentences = sentenceLengths.filter(
      (len) => len >= 15 && len <= 25
    ).length;
    const longSentences = sentenceLengths.filter((len) => len > 25).length;

    const totalWords = sentenceLengths.reduce((sum, len) => sum + len, 0);
    const averageWordsPerSentence =
      sentences.length > 0 ? totalWords / sentences.length : 0;

    const longestSentence =
      sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0;

    return {
      totalSentences: sentences.length,
      shortSentences,
      mediumSentences,
      longSentences,
      averageWordsPerSentence,
      longestSentence,
    };
  };

  // ============================================
  // Word Analysis
  // ============================================

  /**
   * Analyze word usage
   */
  const analyzeWords = (text: string): WordAnalysis => {
    const words = splitIntoWords(text);
    const uniqueWords = new Set(words).size;

    const totalLength = words.reduce((sum, w) => sum + w.length, 0);
    const averageWordLength = words.length > 0 ? totalLength / words.length : 0;

    const longWords = words.filter((w) => w.length > 6).length;
    const veryLongWords = words.filter((w) => w.length > 12).length;

    // Count word frequency
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // Get most common words (exclude common stop words)
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
    ]);

    const mostCommonWords = Array.from(frequency.entries())
      .filter(
        ([word, count]) => !stopWords.has(word) && count >= minWordFrequency
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      totalWords: words.length,
      uniqueWords,
      averageWordLength,
      longWords,
      veryLongWords,
      mostCommonWords,
    };
  };

  // ============================================
  // Writing Issues Detection
  // ============================================

  /**
   * Detect passive voice
   */
  const detectPassiveVoice = (
    text: string
  ): Array<{ text: string; position: number }> => {
    if (!checkPassiveVoice) return [];

    const results: Array<{ text: string; position: number }> = [];

    for (const pattern of passivePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          text: match[0],
          position: match.index,
        });
      }
    }

    return results;
  };

  /**
   * Detect adverbs
   */
  const detectAdverbs = (
    text: string
  ): Array<{ word: string; position: number }> => {
    if (!checkAdverbs) return [];

    const results: Array<{ word: string; position: number }> = [];

    for (const adverb of commonAdverbs) {
      const pattern = new RegExp(`\\b${adverb}\\b`, "gi");
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          word: match[0],
          position: match.index,
        });
      }
    }

    return results;
  };

  /**
   * Detect complex words
   */
  const detectComplexWords = (
    text: string
  ): Array<{ word: string; position: number; suggestion?: string }> => {
    if (!checkComplexWords) return [];

    const results: Array<{
      word: string;
      position: number;
      suggestion?: string;
    }> = [];

    for (const [complex, simple] of Object.entries(complexWordMap)) {
      const pattern = new RegExp(`\\b${complex}\\b`, "gi");
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          word: match[0],
          position: match.index,
          suggestion: simple,
        });
      }
    }

    return results;
  };

  /**
   * Detect repeated words
   */
  const detectRepeatedWords = (
    text: string
  ): Array<{ word: string; count: number }> => {
    const words = splitIntoWords(text);
    const frequency = new Map<string, number>();

    for (const word of words) {
      if (word.length > 4) {
        // Only check words longer than 4 chars
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    }

    return Array.from(frequency.entries())
      .filter(([, count]) => count > 5) // Used more than 5 times
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  };

  /**
   * Detect clichés
   */
  const detectCliches = (
    text: string
  ): Array<{ phrase: string; position: number }> => {
    if (!checkCliches) return [];

    const results: Array<{ phrase: string; position: number }> = [];
    const lowerText = text.toLowerCase();

    for (const cliche of cliches) {
      let index = lowerText.indexOf(cliche);
      while (index !== -1) {
        results.push({
          phrase: cliche,
          position: index,
        });
        index = lowerText.indexOf(cliche, index + 1);
      }
    }

    return results;
  };

  /**
   * Detect all writing issues
   */
  const detectIssues = (text: string): WritingIssues => {
    return {
      passiveVoice: detectPassiveVoice(text),
      adverbs: detectAdverbs(text),
      complexWords: detectComplexWords(text),
      repeatedWords: detectRepeatedWords(text),
      cliches: detectCliches(text),
    };
  };

  // ============================================
  // SEO Analysis
  // ============================================

  /**
   * Analyze SEO factors
   */
  const analyzeSEO = (html: string): SEOAnalysis => {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const text = extractPlainText(html);
    const words = splitIntoWords(text);

    // Keyword density
    const frequency = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) {
        // Only words longer than 3 chars
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    }

    const keywordDensity = new Map<string, number>();
    for (const [word, count] of frequency.entries()) {
      const density = (count / words.length) * 100;
      if (density > 0.5) {
        // At least 0.5% density
        keywordDensity.set(word, density);
      }
    }

    // Heading structure — count AUTHORED headings only; the inserted Table of
    // Contents carries its own <h2> (and duplicates every heading as a link),
    // which would falsely report a proper hierarchy. #r14b-3
    const countHeadings = (selector: string) =>
      Array.from(temp.querySelectorAll(selector)).filter(
        (heading) => !heading.closest(".table-of-contents")
      ).length;
    const h1Count = countHeadings("h1");
    const h2Count = countHeadings("h2");
    const h3Count = countHeadings("h3");

    const hasProperHierarchy = h1Count === 1 && h2Count > 0;

    // Meta description (first paragraph or first 160 chars)
    const firstParagraph = temp.querySelector("p")?.textContent || "";
    const metaDescription = firstParagraph.slice(0, 160);

    // Recommended keywords (top 5 by density)
    const recommendedKeywords = Array.from(keywordDensity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Calculate SEO score (0-100)
    let score = 0;
    if (h1Count === 1) score += 20; // Has single H1
    if (h2Count > 0) score += 15; // Has H2 headings
    if (h3Count > 0) score += 10; // Has H3 headings
    if (hasProperHierarchy) score += 15; // Proper hierarchy
    if (metaDescription.length >= 120 && metaDescription.length <= 160)
      score += 20; // Good meta length
    if (words.length >= 300) score += 10; // Sufficient content
    if (keywordDensity.size > 0) score += 10; // Has keywords

    return {
      score: Math.min(100, score),
      keywordDensity,
      headingStructure: {
        h1Count,
        h2Count,
        h3Count,
        hasProperHierarchy,
      },
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      recommendedKeywords,
    };
  };

  // ============================================
  // Main Analysis Function
  // ============================================

  /**
   * Analyze text content
   */
  const analyze = async (html: string) => {
    isAnalyzing.value = true;

    try {
      const plainText = extractPlainText(html);
      textContent.value = plainText;
      htmlContent.value = html;

      const stats = calculateDocumentStats(html, plainText);
      const readability = calculateReadability(plainText);
      const sentenceAnalysis = analyzeSentences(plainText);
      const wordAnalysis = analyzeWords(plainText);
      const issues = detectIssues(plainText);
      const seo = analyzeSEO(html);

      return {
        stats,
        readability,
        sentenceAnalysis,
        wordAnalysis,
        issues,
        seo,
      };
    } finally {
      isAnalyzing.value = false;
    }
  };

  /**
   * Feed the editor's current content to the stats panel WITHOUT eagerly running
   * the full analysis. `analyze()` above runs six document-wide passes and then
   * discards its result — the panel is actually driven by the lazy `stats` /
   * `readability` / … computeds below, which redo that same work only when the
   * panel reads them. Calling `analyze()` on every keystroke therefore ran the
   * heavy pass unconditionally (even with the panel closed) and twice when open.
   * This just updates the source refs; the computeds recompute lazily on demand.
   */
  const updateContent = (html: string) => {
    textContent.value = extractPlainText(html);
    htmlContent.value = html;
  };

  // Debounced variant for the per-keystroke input path, so rapid typing in a
  // large document doesn't thrash. The timer is released on scope disposal.
  let contentUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleContentUpdate = (html: string, delay = 300) => {
    if (contentUpdateTimer) clearTimeout(contentUpdateTimer);
    contentUpdateTimer = setTimeout(() => {
      updateContent(html);
      contentUpdateTimer = null;
    }, delay);
  };
  onScopeDispose(() => {
    if (contentUpdateTimer) clearTimeout(contentUpdateTimer);
  });

  // ============================================
  // Computed Properties
  // ============================================

  const stats = computed(() => {
    if (!textContent.value) return null;
    return calculateDocumentStats(htmlContent.value, textContent.value);
  });

  const readability = computed(() => {
    if (!textContent.value) return null;
    return calculateReadability(textContent.value);
  });

  const sentenceAnalysis = computed(() => {
    if (!textContent.value) return null;
    return analyzeSentences(textContent.value);
  });

  const wordAnalysis = computed(() => {
    if (!textContent.value) return null;
    return analyzeWords(textContent.value);
  });

  const issues = computed(() => {
    if (!textContent.value) return null;
    return detectIssues(textContent.value);
  });

  const seo = computed(() => {
    if (!htmlContent.value) return null;
    return analyzeSEO(htmlContent.value);
  });

  return {
    // State
    textContent,
    isAnalyzing,

    // Main analysis
    analyze,
    updateContent,
    scheduleContentUpdate,
    extractPlainText,

    // Statistics
    calculateStats,
    stats,

    // Readability
    calculateReadability,
    readability,

    // Sentence analysis
    analyzeSentences,
    sentenceAnalysis,

    // Word analysis
    analyzeWords,
    wordAnalysis,

    // Issues detection
    detectIssues,
    issues,
    detectPassiveVoice,
    detectAdverbs,
    detectComplexWords,
    detectRepeatedWords,
    detectCliches,

    // SEO
    analyzeSEO,
    seo,

    // Utilities
    splitIntoSentences,
    splitIntoWords,
    countSyllables,
  };
}
