<template>
  <div
    class="writing-stats-panel"
    :class="{ collapsed: isCollapsed }"
    role="region"
    aria-label="Writing statistics"
  >
    <!-- Header -->
    <div class="stats-header">
      <h3 class="stats-title">
        <span class="stats-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg></span>
        Writing Statistics
      </h3>
      <div class="stats-header-actions">
        <button
          class="collapse-btn"
          :aria-label="isCollapsed ? 'Expand panel' : 'Collapse panel'"
          :aria-expanded="!isCollapsed"
          @click="isCollapsed = !isCollapsed"
        >
          {{ isCollapsed ? "▶" : "▼" }}
        </button>
        <!-- Close is essential on mobile: the panel reflows to a bottom sheet
             that covers its own toggle FAB, so without this (and Escape) it
             would be an undismissable trap. -->
        <button
          class="close-btn"
          aria-label="Close writing statistics"
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
      role="region"
      aria-label="Statistics details"
      tabindex="0"
      @keydown="scrollDetails"
    >
      <!-- Basic Stats -->
      <div
        v-if="stats"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><line x1="8" x2="16" y1="13" y2="13" /><line x1="8" x2="16" y1="17" y2="17" /></svg> Basic Stats
        </h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label" title="Total number of words in the document.">Words</span>
            <span class="stat-value">{{ stats.words.toLocaleString() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Total characters, including spaces.">Characters</span>
            <span class="stat-value">{{
              stats.characters.toLocaleString()
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Number of sentences detected.">Sentences</span>
            <span class="stat-value">{{ stats.sentences }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Prose blocks, including list items. Headings and code blocks are excluded; soft line breaks stay in the same paragraph.">Paragraphs</span>
            <span class="stat-value">{{ stats.paragraphs }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Estimated silent reading time at ~200 words per minute.">Reading Time</span>
            <span class="stat-value">{{ stats.readingTime }} min</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Estimated time to read aloud at ~130 words per minute.">Speaking Time</span>
            <span class="stat-value">{{ stats.speakingTime }} min</span>
          </div>
        </div>
      </div>

      <!-- Readability Scores -->
      <div
        v-if="readability"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg> Readability
        </h4>
        <p class="analysis-note">English formula estimates, not a measure of your writing’s quality or voice.</p>

        <div class="readability-main">
          <div
            class="score-box"
            :class="getReadabilityClass(readability.fleschReadingEase)"
          >
            <div class="score-value">
              {{ readability.fleschReadingEase.toFixed(1) }}
            </div>
            <div class="score-label" title="How easy the text is to read, 0–100. Higher is easier; 60–70 is plain English.">
              Flesch Reading Ease
            </div>
            <div class="score-description">
              {{ getReadabilityDescription(readability.fleschReadingEase) }}
            </div>
          </div>
          <div class="grade-box">
            <div class="grade-value">
              {{ Math.round(readability.averageGradeLevel) }}
            </div>
            <div class="grade-label" title="US school grade needed to understand the text, averaged across formulas.">
              Grade Level
            </div>
          </div>
        </div>

        <div class="readability-details">
          <div class="detail-item">
            <span title="US grade level from sentence length and syllables per word.">Flesch-Kincaid:</span>
            <strong>Grade {{ readability.fleschKincaidGrade.toFixed(1) }}</strong>
          </div>
          <div class="detail-item">
            <span title="Estimated years of schooling from sentence length and complex words.">Gunning Fog:</span>
            <strong>{{ readability.gunningFog.toFixed(1) }}</strong>
          </div>
          <div class="detail-item">
            <span title="US grade level based on letters per word instead of syllables.">Coleman-Liau:</span>
            <strong>Grade {{ readability.colemanLiauIndex.toFixed(1) }}</strong>
          </div>
          <div class="detail-item">
            <span title="Automated Readability Index — grade level from letters, words and sentences.">ARI:</span>
            <strong>Grade
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" x2="3" y1="6" y2="6" /><line x1="15" x2="3" y1="12" y2="12" /><line x1="17" x2="3" y1="18" y2="18" /></svg> Sentences
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
              Short (&lt;15): {{ sentenceAnalysis.shortSentences }}
            </span>
            <span class="legend-item">
              <span class="legend-color medium" />
              Medium (15-25): {{ sentenceAnalysis.mediumSentences }}
            </span>
            <span class="legend-item">
              <span class="legend-color long" />
              Long (&gt;25): {{ sentenceAnalysis.longSentences }}
            </span>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label" title="Average sentence length. 15–20 words reads smoothly.">Avg Words/Sentence</span>
            <span class="stat-value">{{
              sentenceAnalysis.averageWordsPerSentence.toFixed(1)
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Length alone does not tell whether a sentence is a run-on.">Longest Sentence</span>
            <span class="stat-value">{{ sentenceAnalysis.longestSentence }} words</span>
          </div>
        </div>
      </div>

      <!-- Word Analysis -->
      <div
        v-if="wordAnalysis"
        class="stats-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg> Words
        </h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label" title="Count of distinct words — your vocabulary variety.">Unique Words</span>
            <span class="stat-value">{{
              wordAnalysis.uniqueWords.toLocaleString()
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Average characters per word. Higher reads as denser.">Avg Word Length</span>
            <span class="stat-value">{{
              wordAnalysis.averageWordLength.toFixed(1)
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Words longer than 6 characters.">Long Words (&gt;6)</span>
            <span class="stat-value">{{ wordAnalysis.longWords }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label" title="Words longer than 12 characters — often harder to read.">Very Long (&gt;12)</span>
            <span class="stat-value">{{ wordAnalysis.veryLongWords }}</span>
          </div>
        </div>

        <!-- Most Common Words -->
        <div
          v-if="wordAnalysis.mostCommonWords.length > 0"
          class="common-words"
        >
          <div class="common-words-title">
            Most Common:
          </div>
          <p class="analysis-note">Names and recurring words are normal in a story. Frequency alone is not an editing issue.</p>
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

      <!-- Optional style checks are observations, not a verdict on the author. -->
      <div v-if="issues" class="stats-section issues-section">
        <h4 class="section-title">Style to consider</h4>
        <p class="analysis-note">Local English pattern checks can miss context. Keep any wording that serves your voice.</p>
        <details v-for="group in styleGroups" :key="group.id" class="style-group">
          <summary>{{ group.title }} ({{ group.matches.length }})</summary>
          <p class="analysis-note">{{ group.hint }}</p>
          <ul class="style-passages">
            <li v-for="(match, index) in visibleMatches(group)" :key="index">
              <p class="style-context"><span>{{ match.before }}</span><strong>{{ match.quote }}</strong><span>{{ match.after }}</span></p>
              <p v-if="match.suggestion" class="analysis-note">Alternative: “{{ match.suggestion }}”</p>
            </li>
          </ul>
          <button
            v-if="group.matches.length > (visibleCounts[group.id] || 5)"
            class="more-matches"
            :aria-label="'Show more ' + group.title.toLowerCase()"
            @click="visibleCounts[group.id] = (visibleCounts[group.id] || 5) + 5"
          >
            Show more ({{ group.matches.length - (visibleCounts[group.id] || 5) }} remaining)
          </button>
        </details>
        <p v-if="styleGroups.length === 0" class="analysis-note">No matches for these style checks. This is not a full grammar or spelling review.</p>
      </div>

      <!-- SEO Analysis -->
      <div
        v-if="seo"
        class="stats-section seo-section"
      >
        <h4 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg> SEO
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
          <div class="seo-label" title="Overall on-page SEO health, 0–100, from headings, length and keywords.">
            SEO Score
          </div>
        </div>

        <div class="seo-details">
          <div
            class="seo-item"
            :class="{ success: seo.headingStructure.h1Count === 1 }"
          >
            <span title="Number of H1 headings. Best practice is exactly one per page.">H1 Headings:</span>
            <strong>{{ seo.headingStructure.h1Count }}</strong>
          </div>
          <div
            class="seo-item"
            :class="{ success: seo.headingStructure.h2Count > 0 }"
          >
            <span title="Number of H2 subheadings that structure the content.">H2 Headings:</span>
            <strong>{{ seo.headingStructure.h2Count }}</strong>
          </div>
          <div class="seo-item">
            <span title="Length of the meta description. Aim for 120–160 characters.">Meta Length:</span>
            <strong>{{ seo.metaDescriptionLength }} chars</strong>
          </div>
        </div>

        <div
          v-if="seo.recommendedKeywords.length > 0"
          class="keywords"
        >
          <div class="keywords-title">
            Top Keywords:
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
import { computed, ref, watch } from "vue";
import type {
  TextStats,
  ReadabilityScores,
  SentenceAnalysis,
  WordAnalysis,
  WritingIssues,
  SEOAnalysis,
} from "../composables/useWritingAssistant";

interface Props {
  stats?: TextStats | null;
  readability?: ReadabilityScores | null;
  sentenceAnalysis?: SentenceAnalysis | null;
  wordAnalysis?: WordAnalysis | null;
  issues?: WritingIssues | null;
  text?: string;
  seo?: SEOAnalysis | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{ close: [] }>();

const isCollapsed = ref(false);

function scrollDetails(event: KeyboardEvent) {
  if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
  const content = event.currentTarget as HTMLElement;
  const page = Math.max(40, content.clientHeight - 40);
  const targets: Record<string, number> = {
    ArrowDown: content.scrollTop + 40, ArrowUp: content.scrollTop - 40,
    PageDown: content.scrollTop + page, PageUp: content.scrollTop - page,
    Home: 0, End: content.scrollHeight,
  };
  if (!(event.key in targets)) return;
  event.preventDefault();
  event.stopPropagation();
  content.scrollTop = targets[event.key];
}

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

interface StyleMatch { quote: string; position: number; suggestion?: string }
interface StyleGroup { id: string; title: string; hint: string; matches: StyleMatch[] }
const visibleCounts = ref<Record<string, number>>({});
watch(() => props.issues, () => { visibleCounts.value = {}; });
const styleGroups = computed<StyleGroup[]>(() => {
  const issues = props.issues;
  if (!issues) return [];
  return [
    { id: 'passive', title: 'Possible passive voice', hint: 'Passive voice can keep attention on what happened. Consider an active version when the person acting matters.', matches: issues.passiveVoice.map(item => ({ quote: item.text, position: item.position })) },
    { id: 'adverbs', title: 'Adverbs and intensifiers', hint: 'Does this word add meaning or rhythm? Keep it when it does.', matches: issues.adverbs.map(item => ({ quote: item.word, position: item.position })) },
    { id: 'complex', title: 'Simpler word options', hint: 'Use an alternative only if it keeps your intended meaning and tone.', matches: issues.complexWords.map(item => ({ quote: item.word, position: item.position, suggestion: item.suggestion })) },
    { id: 'cliches', title: 'Familiar phrases', hint: 'A familiar expression may fit a character or scene. Review it in context before changing it.', matches: issues.cliches.map(item => ({ quote: item.phrase, position: item.position })) },
  ].filter(group => group.matches.length > 0);
});

function visibleMatches(group: StyleGroup) {
  return group.matches.slice(0, visibleCounts.value[group.id] || 5).map(match => {
    const text = props.text ?? '';
    const start = match.position;
    // External consumers may provide counts without source text. Never display
    // unrelated context when their issue offsets and text are out of sync.
    const valid = text.slice(start, start + match.quote.length).toLowerCase() === match.quote.toLowerCase();
    const before = valid ? text.slice(0, start).split(/\n{2,}/).pop() ?? '' : '';
    const after = valid ? text.slice(start + match.quote.length).split(/\n{2,}/)[0] : '';
    return {
      ...match,
      quote: valid ? text.slice(start, start + match.quote.length) : match.quote,
      before: before.length > 64 ? '…' + before.slice(-64).replace(/^\S*\s/, '') : before,
      after: after.length > 64 ? after.slice(0, 64).replace(/\s\S*$/, '') + '…' : after,
    };
  });
}

/** Get the existing publishing score class. */
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
  max-height: min(620px, calc(100dvh - 212px));
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #1f2937);
  border: 1px solid var(--color-border, #e5e7eb);
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
  width: 340px;
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  flex-shrink: 0;
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
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--toolbar-hover, #eff6ff);
  color: var(--toolbar-accent, #3b82f6);
}

.stats-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.collapse-btn,
.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  width: 44px;
  height: 44px;
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

.collapse-btn:focus-visible,
.close-btn:focus-visible {
  outline: 2px solid var(--toolbar-accent, #3b82f6);
  outline-offset: -3px;
}

.collapse-btn:hover,
.close-btn:hover {
  background: var(--color-surface-overlay, #f3f4f6);
  color: var(--color-text, #111827);
}

.stats-content {
  min-height: 0;
  overscroll-behavior: contain;
  overflow-y: auto;
  padding: 16px;
}

.stats-content:focus-visible {
  outline: 2px solid var(--toolbar-accent, #3b82f6);
  outline-offset: -3px;
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
  background: var(--color-background, #f9fafb);
  border-radius: 8px;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
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
  color: var(--color-text, #1f2937);
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
  background: var(--color-background, #f3f4f6);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.grade-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--toolbar-accent-ink, #1d4ed8);
}

.grade-label {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
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
  background: var(--color-background, #f9fafb);
  border-radius: 6px;
  font-size: 13px;
}

.detail-item span {
  color: var(--color-text-secondary, #6b7280);
}

.detail-item strong {
  color: var(--color-text, #1f2937);
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
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 8px;
}

.word-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.word-tag {
  padding: 4px 10px;
  background: var(--color-background, #f9fafb);
  color: var(--toolbar-accent-ink, #1d4ed8);
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
  background: var(--color-background, #f9fafb);
  border-radius: 8px;
  padding: 12px;
}

.analysis-note {
  margin: 0 0 12px;
  color: var(--color-text-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.6;
}

.style-group + .style-group {
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.style-group summary {
  min-height: 44px;
  padding: 12px 0;
  box-sizing: border-box;
  cursor: pointer;
  color: var(--color-text, #1f2937);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.style-group summary:focus-visible,
.more-matches:focus-visible {
  outline: 2px solid var(--toolbar-accent, #3b82f6);
  outline-offset: 2px;
  border-radius: 4px;
}

.style-passages {
  list-style: none;
  padding: 0;
  margin: 0;
}

.style-passages li {
  padding: 10px;
  margin-bottom: 8px;
  border-left: 2px solid var(--color-border, #e5e7eb);
  background: var(--color-surface, #fff);
  overflow-wrap: anywhere;
}

.style-context {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
}

.style-passages .analysis-note {
  margin: 6px 0 0;
}

.more-matches {
  min-height: 44px;
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  color: var(--color-text, #1f2937);
  background: var(--color-surface, #fff);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

/* SEO */
.seo-section {
  background: var(--color-background, #f9fafb);
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
  fill: var(--color-text, #1f2937);
  font-family: sans-serif;
  font-size: 0.5em;
  font-weight: 700;
  text-anchor: middle;
}

.seo-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--toolbar-accent-ink, #1d4ed8);
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
  background: var(--color-surface, #ffffff);
  border-radius: 6px;
  font-size: 12px;
}

.seo-item.success {
  background: var(--color-background, #f9fafb);
}

.seo-item span {
  color: var(--color-text-secondary, #6b7280);
}

.seo-item strong {
  color: var(--color-text, #1f2937);
}

.keywords {
  margin-top: 12px;
}

.keywords-title {
  font-size: 12px;
  color: var(--toolbar-accent-ink, #1d4ed8);
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
  background: var(--color-surface, #ffffff);
  color: var(--toolbar-accent-ink, #1d4ed8);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--color-border, #bfdbfe);
}

/* Scrollbar */
.stats-content::-webkit-scrollbar {
  width: 6px;
}

.stats-content::-webkit-scrollbar-track {
  background: var(--color-background, #f3f4f6);
  border-radius: 3px;
}

.stats-content::-webkit-scrollbar-thumb {
  background: var(--color-text-secondary, #6b7280);
  border-radius: 3px;
}

.stats-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary, #6b7280);
}

/* On narrow screens the fixed 340px panel clips the viewport edge and its
   lower rows hide behind the bottom mobile toolbar. Reflow it into a bottom
   sheet spanning the width with margins (mirrors the variables panel in
   NextLevelEditor.vue), lifted above the mobile toolbar via the clearance
   custom property MobileToolbar maintains on <html> (0 when hidden). */
@media (max-width: 640px), (max-height: 600px) {
  .writing-stats-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-height: 65dvh;
    bottom: calc(16px + var(--nle-mobile-toolbar-clearance, 0px));
  }

  .writing-stats-panel.collapsed {
    width: auto;
  }

  /* Keep the scroll area inside the 65vh sheet (its desktop cap of
     100vh - 390px can collapse to nothing on short viewports). */
  .stats-content {
    max-height: calc(65dvh - 62px);
  }
}
</style>
