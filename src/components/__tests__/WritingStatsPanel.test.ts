import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WritingStatsPanel from "../WritingStatsPanel.vue";
import type {
  TextStats,
  ReadabilityScores,
  SentenceAnalysis,
  WordAnalysis,
  SEOAnalysis,
} from "../../composables/useWritingAssistant";

const stats: TextStats = {
  words: 485,
  characters: 3711,
  charactersNoSpaces: 3100,
  sentences: 27,
  paragraphs: 3,
  syllables: 900,
  readingTime: 3,
  speakingTime: 4,
};

const readability: ReadabilityScores = {
  fleschReadingEase: 29.7,
  fleschKincaidGrade: 13.6,
  gunningFog: 16.8,
  colemanLiauIndex: 19.4,
  automatedReadabilityIndex: 15.2,
  averageGradeLevel: 17,
};

const sentenceAnalysis: SentenceAnalysis = {
  totalSentences: 27,
  shortSentences: 16,
  mediumSentences: 6,
  longSentences: 5,
  averageWordsPerSentence: 18,
  longestSentence: 42,
};

const wordAnalysis: WordAnalysis = {
  totalWords: 485,
  uniqueWords: 300,
  averageWordLength: 5.1,
  longWords: 120,
  veryLongWords: 20,
  mostCommonWords: [{ word: "the", count: 30 }],
};

const seo: SEOAnalysis = {
  score: 72,
  keywordDensity: new Map(),
  headingStructure: { h1Count: 1, h2Count: 3, h3Count: 2, hasProperHierarchy: true },
  metaDescription: "A demo document.",
  metaDescriptionLength: 140,
  recommendedKeywords: ["editor", "vue"],
};

const mountFull = () =>
  mount(WritingStatsPanel, {
    props: { stats, readability, sentenceAnalysis, wordAnalysis, seo },
  });

describe("WritingStatsPanel tooltips", () => {
  it('supports keyboard scrolling without sending navigation into the manuscript', async () => {
    const wrapper = mountFull();
    const details = wrapper.get<HTMLElement>('.stats-content');
    Object.defineProperty(details.element, 'scrollHeight', { value: 1200 });
    Object.defineProperty(details.element, 'clientHeight', { value: 300 });
    await details.trigger('keydown', { key: 'End' });
    expect(details.element.scrollTop).toBe(1200);
    await details.trigger('keydown', { key: 'Home' });
    expect(details.element.scrollTop).toBe(0);
    await details.trigger('keydown', { key: 'PageDown' });
    expect(details.element.scrollTop).toBe(260);
    await details.trigger('keydown', { key: 'ArrowDown' });
    expect(details.element.scrollTop).toBe(300);
    await details.trigger('keydown', { key: 'ArrowUp' });
    expect(details.element.scrollTop).toBe(260);
    await details.trigger('keydown', { key: 'PageUp' });
    expect(details.element.scrollTop).toBe(0);
    wrapper.unmount();
  });
  it("gives every stat label an explanatory tooltip", () => {
    const wrapper = mountFull();
    const labels = wrapper.findAll(".stat-label");
    expect(labels.length).toBeGreaterThanOrEqual(6);

    const words = labels.find((l) => l.text() === "Words");
    expect(words?.attributes("title")).toContain("words");

    for (const label of labels) {
      expect(label.attributes("title")).toBeTruthy();
    }
  });

  it("explains the readability headline boxes and every formula", () => {
    const wrapper = mountFull();

    expect(wrapper.find(".score-label").attributes("title")).toContain("read");
    expect(wrapper.find(".grade-label").attributes("title")).toContain("grade");

    const detailLabels = wrapper.findAll(".detail-item > span:first-child");
    expect(detailLabels.length).toBeGreaterThanOrEqual(4);
    for (const label of detailLabels) {
      expect(label.attributes("title")).toBeTruthy();
    }
  });

  it("explains the SEO checks", () => {
    const wrapper = mountFull();

    expect(wrapper.find(".seo-label").attributes("title")).toBeTruthy();
    const seoLabels = wrapper.findAll(".seo-item > span:first-child");
    expect(seoLabels.length).toBeGreaterThanOrEqual(3);
    for (const label of seoLabels) {
      expect(label.attributes("title")).toBeTruthy();
    }
  });
});
