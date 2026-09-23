<template>
  <div
    class="writing-stats-panel"
    :class="{ collapsed: isCollapsed }"
  >
    <!-- Header -->
    <div class="stats-header">
      <h3 class="stats-title">
        <span class="stats-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg></span>
        {{ t("Writing Statistics") }}
      </h3>
      <div class="stats-header-actions">
        <button
          class="collapse-btn"
          :aria-label="t(isCollapsed ? 'Expand panel' : 'Collapse panel')"
          @click="isCollapsed = !isCollapsed"
        >
          {{ t(isCollapsed ? "▶" : "▼") }}
        </button>
        <!-- Close is essential on mobile: the panel reflows to a bottom sheet
             that covers its own toggle FAB, so without this (and Escape) it
             would be an undismissable trap. -->
        <button
          class="close-btn"
          :aria-label="t('Close writing statistics')"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content (hidden when collapsed) -->
    <div
      v-if="!isCollapsed"
      class="stats-content"
    >
      <!-- Basic Stats -->
      <p v-if="languageSupported === false" role="status">{{ t('English prose checks are unavailable for this document language.') }}</p>
      <div
        v-if="stats"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><line x1="8" x2="16" y1="13" y2="13" /><line x1="8" x2="16" y1="17" y2="17" /></svg> {{ t("Basic Stats") }}
        </h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label" :title="t('Total number of words in the document.')">{{ t("Words") }}</span>
            <span class="stat-value">{{ number(stats.words) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Total characters, including spaces.')">{{ t("Characters") }}</span>
            <span class="stat-value">{{
              number(stats.characters)
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Number of sentences detected.')">{{ t("Sentences") }}</span>
            <span class="stat-value">{{ stats.sentences }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Number of paragraphs — blocks separated by blank lines.')">{{ t("Paragraphs") }}</span>
            <span class="stat-value">{{ stats.paragraphs }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Estimated silent reading time at ~200 words per minute.')">{{ t("Reading Time") }}</span>
            <span class="stat-value">{{ stats.readingTime }} {{ t("min") }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Estimated time to read aloud at ~130 words per minute.')">{{ t("Speaking Time") }}</span>
            <span class="stat-value">{{ stats.speakingTime }} {{ t("min") }}</span>
          </div>
        </div>
      </div>

      <!-- Readability Scores -->
      <div
        v-if="readability"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg> {{ t("Readability") }}
        </h4>

        <div class="readability-main">
          <div
            class="score-box"
            :class="getReadabilityClass(readability.fleschReadingEase)"
          >
            <div class="score-value">
              {{ readability.fleschReadingEase.toFixed(1) }}
            </div>
            <div class="score-label" :title="t('How easy the text is to read, 0–100. Higher is easier; 60–70 is plain English.')">
              {{ t("Flesch Reading Ease") }}
            </div>
            <div class="score-description">
              {{ getReadabilityDescription(readability.fleschReadingEase) }}
            </div>
          </div>
          <div class="grade-box">
            <div class="grade-value">
              {{ Math.round(readability.averageGradeLevel) }}
            </div>
            <div class="grade-label" :title="t('US school grade needed to understand the text, averaged across formulas.')">
              {{ t("Grade Level") }}
            </div>
          </div>
        </div>

        <div class="readability-details">
          <div class="detail-item">
            <span :title="t('US grade level from sentence length and syllables per word.')">{{ t("Flesch-Kincaid:") }}</span>
            <strong>{{ t("Grade") }} {{ readability.fleschKincaidGrade.toFixed(1) }}</strong>
          </div>
          <div class="detail-item">
            <span :title="t('Years of schooling needed to read it on the first try. Aim below 12.')">{{ t("Gunning Fog:") }}</span>
            <strong>{{ readability.gunningFog.toFixed(1) }}</strong>
          </div>
          <div class="detail-item">
            <span :title="t('US grade level based on letters per word instead of syllables.')">{{ t("Coleman-Liau:") }}</span>
            <strong>{{ t("Grade") }} {{ readability.colemanLiauIndex.toFixed(1) }}</strong>
          </div>
          <div class="detail-item">
            <span :title="t('Automated Readability Index — grade level from letters, words and sentences.')">{{ t("ARI:") }}</span>
            <strong>{{ t("Grade") }}
              {{ readability.automatedReadabilityIndex.toFixed(1) }}</strong>
          </div>
        </div>
      </div>

      <!-- Sentence Analysis -->
      <div
        v-if="sentenceAnalysis"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" x2="3" y1="6" y2="6" /><line x1="15" x2="3" y1="12" y2="12" /><line x1="17" x2="3" y1="18" y2="18" /></svg> {{ t("Sentences") }}
        </h4>
        <div class="sentence-distribution">
          <div class="distribution-bar">
            <div
              class="bar-segment short"
              :style="{ width: `${getSentencePercentage('short')}%` }"
              :title="`Short: ${sentenceAnalysis.shortSentences}`"
            />
            <div
              class="bar-segment medium"
              :style="{ width: `${getSentencePercentage('medium')}%` }"
              :title="`Medium: ${sentenceAnalysis.mediumSentences}`"
            />
            <div
              class="bar-segment long"
              :style="{ width: `${getSentencePercentage('long')}%` }"
              :title="`Long: ${sentenceAnalysis.longSentences}`"
            />
          </div>
          <div class="distribution-legend">
            <span class="legend-item">
              <span class="legend-color short" />
              {{ t("Short (<15):") }} {{ sentenceAnalysis.shortSentences }}
            </span>
            <span class="legend-item">
              <span class="legend-color medium" />
              {{ t("Medium (15-25):") }} {{ sentenceAnalysis.mediumSentences }}
            </span>
            <span class="legend-item">
              <span class="legend-color long" />
              {{ t("Long (>25):") }} {{ sentenceAnalysis.longSentences }}
            </span>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label" :title="t('Average sentence length. 15–20 words reads smoothly.')">{{ t("Avg Words/Sentence") }}</span>
            <span class="stat-value">{{
              sentenceAnalysis.averageWordsPerSentence.toFixed(1)
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Length of the longest sentence — watch for run-ons.')">{{ t("Longest Sentence") }}</span>
            <span class="stat-value">{{ sentenceAnalysis.longestSentence }} {{ t("words") }}</span>
          </div>
        </div>
      </div>

      <!-- Word Analysis -->
      <div
        v-if="wordAnalysis"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg> {{ t("Words") }}
        </h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label" :title="t('Count of distinct words — your vocabulary variety.')">{{ t("Unique Words") }}</span>
            <span class="stat-value">{{
              number(wordAnalysis.uniqueWords)
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Average characters per word. Higher reads as denser.')">{{ t("Avg Word Length") }}</span>
            <span class="stat-value">{{
              wordAnalysis.averageWordLength.toFixed(1)
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Words longer than 6 characters.')">{{ t("Long Words (>6)") }}</span>
            <span class="stat-value">{{ wordAnalysis.longWords }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" :title="t('Words longer than 12 characters — often harder to read.')">{{ t("Very Long (>12)") }}</span>
            <span class="stat-value">{{ wordAnalysis.veryLongWords }}</span>
          </div>
        </div>

        <!-- Most Common Words -->
        <div
          v-if="wordAnalysis.mostCommonWords.length > 0"
          class="common-words"
        >
          <div class="common-words-title">
            {{ t("Most Common:") }}
          </div>
          <div class="word-tags">
            <span
              v-for="item in wordAnalysis.mostCommonWords"
              :key="item.word"
              class="word-tag"
            >
              {{ item.word }} <span class="word-count">({{ item.count }})</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Writing Issues -->
      <div
        v-if="issues"
        class="stats-section issues-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg> {{ t("Issues") }}
        </h4>

        <div
          v-if="issues.passiveVoice.length > 0"
          class="issue-group"
        >
          <div class="issue-header">
            <span class="issue-icon">🔄</span>
            <span class="issue-title">{{ t("Passive Voice (") }}{{ issues.passiveVoice.length }})</span>
          </div>
          <div class="issue-hint">
            {{ t("Consider using active voice for clearer writing") }}
          </div>
        </div>

        <div
          v-if="issues.adverbs.length > 0"
          class="issue-group"
        >
          <div class="issue-header">
            <span class="issue-icon">💭</span>
            <span class="issue-title">{{ t("Weak Adverbs (") }}{{ issues.adverbs.length }})</span>
          </div>
          <div class="issue-hint">
            {{ t("Remove or replace with stronger verbs") }}
          </div>
        </div>

        <div
          v-if="issues.complexWords.length > 0"
          class="issue-group"
        >
          <div class="issue-header">
            <span class="issue-icon">📖</span>
            <span class="issue-title">{{ t("Complex Words (") }}{{ issues.complexWords.length }})</span>
          </div>
          <div class="issue-hint">
            {{ t("Consider simpler alternatives") }}
          </div>
        </div>

        <div
          v-if="issues.repeatedWords.length > 0"
          class="issue-group"
        >
          <div class="issue-header">
            <span class="issue-icon">🔁</span>
            <span class="issue-title">{{ t("Repeated Words (") }}{{ issues.repeatedWords.length }})</span>
          </div>
          <div class="repeated-words">
            <span
              v-for="item in issues.repeatedWords.slice(0, 5)"
              :key="item.word"
              class="repeated-word"
            >
              {{ item.word }} ({{ item.count }}×)
            </span>
          </div>
        </div>

        <div
          v-if="issues.cliches.length > 0"
          class="issue-group"
        >
          <div class="issue-header">
            <span class="issue-icon">🎭</span>
            <span class="issue-title">{{ t("Clichés (") }}{{ issues.cliches.length }})</span>
          </div>
          <div class="issue-hint">
            {{ t("Find more original expressions") }}
          </div>
        </div>

        <div
          v-if="getTotalIssues() === 0"
          class="no-issues"
        >
          {{ t("✅ No major writing issues detected") }}
        </div>
      </div>

      <!-- SEO Analysis -->
      <div
        v-if="seo"
        class="stats-section seo-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg> {{ t("SEO") }}
        </h4>

        <div class="seo-score">
          <div
            class="score-circle"
            :class="getSEOClass(seo.score)"
          >
            <svg
              viewBox="0 0 36 36"
              class="circular-chart"
            >
              <path
                class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="circle"
                :stroke-dasharray="`${seo.score}, 100`"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text
                x="18"
                y="20.35"
                class="percentage"
              >
                {{ Math.round(seo.score) }}
              </text>
            </svg>
          </div>
          <div class="seo-label" :title="t('Overall on-page SEO health, 0–100, from headings, length and keywords.')">
            {{ t("SEO Score") }}
          </div>
        </div>

        <div class="seo-details">
          <div
            class="seo-item"
            :class="{ success: seo.headingStructure.h1Count === 1 }"
          >
            <span :title="t('Number of H1 headings. Best practice is exactly one per page.')">{{ t("H1 Headings:") }}</span>
            <strong>{{ seo.headingStructure.h1Count }}</strong>
          </div>
          <div
            class="seo-item"
            :class="{ success: seo.headingStructure.h2Count > 0 }"
          >
            <span :title="t('Number of H2 subheadings that structure the content.')">{{ t("H2 Headings:") }}</span>
            <strong>{{ seo.headingStructure.h2Count }}</strong>
          </div>
          <div class="seo-item">
            <span :title="t('Length of the meta description. Aim for 120–160 characters.')">{{ t("Meta Length:") }}</span>
            <strong>{{ seo.metaDescriptionLength }} {{ t("chars") }}</strong>
          </div>
        </div>

        <div
          v-if="seo.recommendedKeywords.length > 0"
          class="keywords"
        >
          <div class="keywords-title">
            {{ t("Top Keywords:") }}
          </div>
          <div class="keyword-tags">
            <span
              v-for="keyword in seo.recommendedKeywords"
              :key="keyword"
              class="keyword-tag"
            >
              {{ keyword }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, number } = useEditorLocale();
import { ref } from "vue";
import type {
  TextStats,
  ReadabilityScores,
  SentenceAnalysis,
  WordAnalysis,
  WritingIssues,
  SEOAnalysis,
} from "../composables/useWritingAssistant";

interface Props {
  languageSupported?: boolean;
  stats?: TextStats | null;
  readability?: ReadabilityScores | null;
  sentenceAnalysis?: SentenceAnalysis | null;
  wordAnalysis?: WordAnalysis | null;
  issues?: WritingIssues | null;
  seo?: SEOAnalysis | null;
}

const props = withDefaults(defineProps<Props>(), {
  languageSupported: true,
  stats: null,
  readability: null,
  sentenceAnalysis: null,
  wordAnalysis: null,
  issues: null,
  seo: null,
});

const emit = defineEmits<{ close: [] }>();

const isCollapsed = ref(false);

/**
 * Get readability class based on Flesch Reading Ease score
 */
const getReadabilityClass = (score: number): string => {
  if (score >= 80) return "very-easy";
  if (score >= 70) return "easy";
  if (score >= 60) return "standard";
  if (score >= 50) return "fairly-difficult";
  return "difficult";
};

/**
 * Get readability description
 */
const getReadabilityDescription = (score: number): string => {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th)";
  if (score >= 30) return "Difficult (College)";
  return "Very Difficult (Graduate)";
};

/**
 * Get sentence distribution percentage
 */
const getSentencePercentage = (type: "short" | "medium" | "long"): number => {
  if (!props.sentenceAnalysis) return 0;

  const total = props.sentenceAnalysis.totalSentences;
  if (total === 0) return 0;

  let count = 0;
  switch (type) {
    case "short":
      count = props.sentenceAnalysis.shortSentences;
      break;
    case "medium":
      count = props.sentenceAnalysis.mediumSentences;
      break;
    case "long":
      count = props.sentenceAnalysis.longSentences;
      break;
  }

  return (count / total) * 100;
};

/**
 * Get total issues count
 */
const getTotalIssues = (): number => {
  if (!props.issues) return 0;

  return (
    props.issues.passiveVoice.length +
    props.issues.adverbs.length +
    props.issues.complexWords.length +
    props.issues.repeatedWords.length +
    props.issues.cliches.length
  );
};

/**
 * Get SEO score class
 */
const getSEOClass = (score: number): string => {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
};
</script>

<style scoped>
.writing-stats-panel {
  /* Anchored just above its toggle FAB (bottom:110px) so it rises from the
     trigger instead of floating over the toolbar at the top of the editor. */
  position: fixed;
  bottom: 180px;
  right: 32px;
  top: auto;
  width: 340px;
  max-height: calc(100vh - 320px);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease;
  /* Open panels sit ABOVE the toolbar shell (9999) so their items never lose
     clicks to the sticky bar; FABs stay below it at 9998. */
  z-index: 10000;
}

.writing-stats-panel.collapsed {
  width: 200px;
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  /* Flat surface + accent icon chip — no gradient (matches the toolbar). */
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #111827);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.stats-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--toolbar-accent, #3b82f6);
}

.stats-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.collapse-btn,
.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.close-btn {
  font-size: 14px;
}

.collapse-btn:hover,
.close-btn:hover {
  background: var(--color-surface-overlay, #f3f4f6);
  color: var(--color-text, #111827);
}

.stats-content {
  max-height: calc(100vh - 390px);
  overflow-y: auto;
  padding: 16px;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #374151);
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title svg {
  color: var(--toolbar-accent, #3b82f6);
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Metric labels carry an explanatory title="" — signal it's hoverable. */
.stat-label,
.score-label,
.grade-label,
.seo-label,
.detail-item > span:first-child,
.seo-item > span:first-child {
  cursor: help;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

/* Readability Scores */
.readability-main {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.score-box {
  flex: 2;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.score-box.very-easy {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  color: #ffffff;
}
.score-box.easy {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  color: #ffffff;
}
.score-box.standard {
  background: linear-gradient(135deg, #c2410c 0%, #9a3412 100%);
  color: #ffffff;
}
.score-box.fairly-difficult {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #ffffff;
}
.score-box.difficult {
  background: linear-gradient(135deg, #7c2d12 0%, #991b1b 100%);
  color: #ffffff;
}

.score-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.score-label {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.9;
  letter-spacing: 0.5px;
}

.score-description {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.9;
}

.grade-box {
  flex: 1;
  padding: 16px;
  background: #f3f4f6;
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.grade-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-primary);
}

.grade-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  margin-top: 4px;
}

.readability-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
}

.detail-item span {
  color: #6b7280;
}

.detail-item strong {
  color: #1f2937;
}

/* Sentence Distribution */
.sentence-distribution {
  margin-bottom: 12px;
}

.distribution-bar {
  height: 32px;
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.bar-segment {
  transition: width 0.3s ease;
}

.bar-segment.short {
  background: #10b981;
}
.bar-segment.medium {
  background: #f59e0b;
}
.bar-segment.long {
  background: #ef4444;
}

.distribution-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.short {
  background: #10b981;
}
.legend-color.medium {
  background: #f59e0b;
}
.legend-color.long {
  background: #ef4444;
}

/* Common Words */
.common-words {
  margin-top: 12px;
}

.common-words-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.word-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.word-tag {
  padding: 4px 10px;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.word-count {
  opacity: 0.7;
  font-size: 11px;
}

/* Issues */
.issues-section {
  background: #fef2f2;
  border-radius: 8px;
  padding: 12px;
}

.issue-group {
  margin-bottom: 12px;
}

.issue-group:last-child {
  margin-bottom: 0;
}

.issue-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.issue-icon {
  font-size: 16px;
}

.issue-title {
  font-weight: 600;
  font-size: 13px;
  color: #991b1b;
}

.issue-hint {
  font-size: 11px;
  color: #6b7280;
  margin-left: 24px;
}

.repeated-words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: 24px;
  margin-top: 6px;
}

.repeated-word {
  padding: 3px 8px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 10px;
  font-size: 11px;
}

.no-issues {
  text-align: center;
  padding: 16px;
  color: #059669;
  font-weight: 500;
  font-size: 13px;
}

/* SEO */
.seo-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  padding: 12px;
}

.seo-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.score-circle {
  width: 120px;
  height: 120px;
  margin-bottom: 8px;
}

.circular-chart {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  max-height: 100%;
}

.circle-bg {
  fill: none;
  stroke: #e0e7ff;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke-width: 2.8;
  stroke-linecap: round;
  animation: progress 1s ease-out forwards;
}

.excellent .circle {
  stroke: #10b981;
}
.good .circle {
  stroke: #3b82f6;
}
.fair .circle {
  stroke: #f59e0b;
}
.poor .circle {
  stroke: #ef4444;
}

@keyframes progress {
  0% {
    stroke-dasharray: 0 100;
  }
}

.percentage {
  fill: #1f2937;
  font-family: sans-serif;
  font-size: 0.5em;
  font-weight: 700;
  text-anchor: middle;
}

.seo-label {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.seo-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.seo-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  font-size: 12px;
}

.seo-item.success {
  background: #d1fae5;
}

.seo-item span {
  color: #6b7280;
}

.seo-item strong {
  color: #1f2937;
}

.keywords {
  margin-top: 12px;
}

.keywords-title {
  font-size: 12px;
  color: #1e40af;
  margin-bottom: 8px;
  font-weight: 600;
}

.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-tag {
  padding: 4px 10px;
  background: white;
  color: #1e40af;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #bfdbfe;
}

/* Dark mode — driven by the editor's own theme class (.theme-dark on the
   .next-level-editor root), NOT the OS-level prefers-color-scheme, so the panel
   always matches whatever theme the editor toggle is set to. */
.theme-dark .writing-stats-panel {
  background: #1f2937;
  border-color: #374151;
}

.theme-dark .section-title {
  color: #f3f4f6;
}

.theme-dark .stat-item {
  background: #111827;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

.theme-dark .stat-value {
  color: #f9fafb;
}

.theme-dark .grade-box {
  background: #111827;
}

.theme-dark .detail-item {
  background: #111827;
}

.theme-dark .detail-item span {
  color: #9ca3af;
}

.theme-dark .detail-item strong {
  color: #f9fafb;
}

.theme-dark .common-words-title {
  color: #9ca3af;
}

.theme-dark .issues-section {
  background: #7f1d1d;
}

.theme-dark .issue-hint {
  color: #d1d5db;
}

.theme-dark .seo-section {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
}

.theme-dark .seo-label {
  color: #bfdbfe;
}

.theme-dark .seo-item {
  background: #1e293b;
}

.theme-dark .seo-item span {
  color: #cbd5e1;
}

.theme-dark .seo-item strong {
  color: #f9fafb;
}

.theme-dark .keyword-tag {
  background: #1e293b;
  border-color: #475569;
  color: #bfdbfe;
}

/* Grade readability number: token-driven, tinted lighter in dark mode */
.theme-dark .grade-value {
  color: #93b4fc;
}

/* SEO donut number: dark charcoal fill is invisible on the deep-blue section */
.theme-dark .percentage {
  fill: var(--color-text);
}

/* Issue titles: dark-red on the dark-red issues section is unreadable */
.theme-dark .issue-title {
  color: #fca5a5;
}

/* Most-common word pills: pale lavender is washed out on the dark panel */
.theme-dark .word-tag {
  background: #312e4a;
  color: #c4b5fd;
}

/* Repeated-word chips: light-pink disappears on the dark-red section */
.theme-dark .repeated-word {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

/* Scrollbar */
.stats-content::-webkit-scrollbar {
  width: 6px;
}

.stats-content::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.stats-content::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 3px;
}

.stats-content::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* On narrow screens the fixed 340px panel clips the viewport edge and its
   lower rows hide behind the bottom mobile toolbar. Reflow it into a bottom
   sheet spanning the width with margins (mirrors the variables panel in
   NextLevelEditor.vue), lifted above the mobile toolbar via the clearance
   custom property MobileToolbar maintains on <html> (0 when hidden). */
@media (max-width: 640px) {
  .writing-stats-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-height: 65vh;
    bottom: calc(16px + var(--nle-mobile-toolbar-clearance, 0px));
  }

  .writing-stats-panel.collapsed {
    width: auto;
  }

  /* Keep the scroll area inside the 65vh sheet (its desktop cap of
     100vh - 390px can collapse to nothing on short viewports). */
  .stats-content {
    max-height: calc(65vh - 56px);
  }
}
</style>
