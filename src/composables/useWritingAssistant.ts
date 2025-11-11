import { ref, computed } from "vue";

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
  speakingSpeed?: number; // words per minute (default: 150)
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
    speakingSpeed = 150,
    checkPassiveVoice = true,
    checkAdverbs = true,
    checkComplexWords = true,
    checkCliches = true,
    minWordFrequency = 3,
  } = options;

  // State
  const textContent = ref("");
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

  /**
   * Clean HTML and extract plain text
   */
  const extractPlainText = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  /**
   * Split text into sentences
   */
  const splitIntoSentences = (text: string): string[] => {
    // Handle common abbreviations
    const processed = text
      .replaceAll("Mr.", "Mr")
      .replaceAll("Mrs.", "Mrs")
      .replaceAll("Dr.", "Dr")
      .replaceAll("Ms.", "Ms")
      .replaceAll("etc.", "etc")
      .replaceAll("i.e.", "ie")
      .replaceAll("e.g.", "eg");

    // Split on sentence boundaries
    const sentences = processed
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return sentences;
  };

  /**
   * Split text into words
   */
  const splitIntoWords = (text: string): string[] => {
    return text
      .toLowerCase()
      .replaceAll(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);
  };

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
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

    const characters = text.length;
    const charactersNoSpaces = text.replaceAll(/\s/g, "").length;

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

    // Heading structure
    const h1Count = temp.querySelectorAll("h1").length;
    const h2Count = temp.querySelectorAll("h2").length;
    const h3Count = temp.querySelectorAll("h3").length;

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

      const stats = calculateStats(plainText);
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

  // ============================================
  // Computed Properties
  // ============================================

  const stats = computed(() => {
    if (!textContent.value) return null;
    return calculateStats(textContent.value);
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

  return {
    // State
    textContent,
    isAnalyzing,

    // Main analysis
    analyze,
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
    detectPassiveVoice,
    detectAdverbs,
    detectComplexWords,
    detectRepeatedWords,
    detectCliches,

    // SEO
    analyzeSEO,

    // Utilities
    splitIntoSentences,
    splitIntoWords,
    countSyllables,
  };
}
