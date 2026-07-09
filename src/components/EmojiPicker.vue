<template>
  <div
    v-if="show"
    ref="pickerRoot"
    class="emoji-picker"
    role="dialog"
    aria-modal="true"
    aria-label="Emoji picker"
  >
    <div class="emoji-picker-header">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="emoji-search"
        placeholder="Search emoji..."
      >
      <button
        class="close-emoji-btn"
        aria-label="Close emoji picker"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="emoji-categories">
      <button
        v-for="category in categories"
        :key="category.id"
        :class="['category-btn', { active: activeCategory === category.id }]"
        :title="category.name"
        @click="activeCategory = category.id"
      >
        {{ category.icon }}
      </button>
    </div>

    <div class="emoji-grid">
      <button
        v-for="emoji in filteredEmojis"
        :key="emoji.code"
        class="emoji-btn"
        :title="emoji.name"
        @click="selectEmoji(emoji)"
      >
        {{ emoji.emoji }}
      </button>

      <div v-if="filteredEmojis.length === 0" class="no-results">
        No emoji found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useModalDialog } from "../composables/useModalDialog";

interface Emoji {
  emoji: string;
  name: string;
  code: string;
  category: string;
}

interface Props {
  show: boolean;
}

interface Emits {
  (e: "select", emoji: string): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchQuery = ref("");
const activeCategory = ref("smileys");
const pickerRoot = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

// Escape-to-close, Tab trap, initial focus, and focus restore
// (WAI-ARIA dialog pattern) — shared with every other modal.
useModalDialog({
  isOpen: () => props.show,
  container: pickerRoot,
  onClose: () => emit("close"),
  initialFocus: () => searchInput.value,
});

const categories = [
  { id: "smileys", name: "Smileys & Emotion", icon: "😀" },
  { id: "people", name: "People & Body", icon: "👋" },
  { id: "animals", name: "Animals & Nature", icon: "🐶" },
  { id: "food", name: "Food & Drink", icon: "🍎" },
  { id: "activities", name: "Activities", icon: "⚽" },
  { id: "objects", name: "Objects", icon: "💡" },
  { id: "symbols", name: "Symbols", icon: "❤️" },
];

const emojis: Emoji[] = [
  // Smileys
  { emoji: "😀", name: "grinning face", code: "U+1F600", category: "smileys" },
  {
    emoji: "😃",
    name: "grinning face with big eyes",
    code: "U+1F603",
    category: "smileys",
  },
  {
    emoji: "😄",
    name: "grinning face with smiling eyes",
    code: "U+1F604",
    category: "smileys",
  },
  { emoji: "😁", name: "beaming face", code: "U+1F601", category: "smileys" },
  {
    emoji: "😆",
    name: "grinning squinting face",
    code: "U+1F606",
    category: "smileys",
  },
  {
    emoji: "😅",
    name: "grinning face with sweat",
    code: "U+1F605",
    category: "smileys",
  },
  {
    emoji: "🤣",
    name: "rolling on floor laughing",
    code: "U+1F923",
    category: "smileys",
  },
  {
    emoji: "😂",
    name: "face with tears of joy",
    code: "U+1F602",
    category: "smileys",
  },
  {
    emoji: "🙂",
    name: "slightly smiling face",
    code: "U+1F642",
    category: "smileys",
  },
  {
    emoji: "😊",
    name: "smiling face with smiling eyes",
    code: "U+1F60A",
    category: "smileys",
  },
  {
    emoji: "😇",
    name: "smiling face with halo",
    code: "U+1F607",
    category: "smileys",
  },
  {
    emoji: "😍",
    name: "smiling face with heart-eyes",
    code: "U+1F60D",
    category: "smileys",
  },
  { emoji: "🤩", name: "star-struck", code: "U+1F929", category: "smileys" },
  {
    emoji: "😘",
    name: "face blowing a kiss",
    code: "U+1F618",
    category: "smileys",
  },
  { emoji: "🤗", name: "hugging face", code: "U+1F917", category: "smileys" },
  { emoji: "🤔", name: "thinking face", code: "U+1F914", category: "smileys" },
  { emoji: "😐", name: "neutral face", code: "U+1F610", category: "smileys" },
  { emoji: "😏", name: "smirking face", code: "U+1F60F", category: "smileys" },
  { emoji: "😒", name: "unamused face", code: "U+1F612", category: "smileys" },
  {
    emoji: "🙄",
    name: "face with rolling eyes",
    code: "U+1F644",
    category: "smileys",
  },
  { emoji: "😬", name: "grimacing face", code: "U+1F62C", category: "smileys" },
  { emoji: "��", name: "sleeping face", code: "U+1F634", category: "smileys" },
  {
    emoji: "😎",
    name: "smiling face with sunglasses",
    code: "U+1F60E",
    category: "smileys",
  },
  { emoji: "🤓", name: "nerd face", code: "U+1F913", category: "smileys" },
  // People
  { emoji: "👋", name: "waving hand", code: "U+1F44B", category: "people" },
  { emoji: "✋", name: "raised hand", code: "U+270B", category: "people" },
  { emoji: "👌", name: "OK hand", code: "U+1F44C", category: "people" },
  { emoji: "✌", name: "victory hand", code: "U+270C", category: "people" },
  { emoji: "👍", name: "thumbs up", code: "U+1F44D", category: "people" },
  { emoji: "👎", name: "thumbs down", code: "U+1F44E", category: "people" },
  { emoji: "✊", name: "raised fist", code: "U+270A", category: "people" },
  { emoji: "👊", name: "oncoming fist", code: "U+1F44A", category: "people" },
  { emoji: "👏", name: "clapping hands", code: "U+1F44F", category: "people" },
  { emoji: "🙌", name: "raising hands", code: "U+1F64C", category: "people" },
  { emoji: "🙏", name: "folded hands", code: "U+1F64F", category: "people" },
  // Animals
  { emoji: "🐶", name: "dog face", code: "U+1F436", category: "animals" },
  { emoji: "🐱", name: "cat face", code: "U+1F431", category: "animals" },
  { emoji: "🐭", name: "mouse face", code: "U+1F42D", category: "animals" },
  { emoji: "🐰", name: "rabbit face", code: "U+1F430", category: "animals" },
  { emoji: "🦊", name: "fox", code: "U+1F98A", category: "animals" },
  { emoji: "🐻", name: "bear", code: "U+1F43B", category: "animals" },
  { emoji: "🐼", name: "panda", code: "U+1F43C", category: "animals" },
  { emoji: "🐨", name: "koala", code: "U+1F428", category: "animals" },
  { emoji: "🦁", name: "lion", code: "U+1F981", category: "animals" },
  { emoji: "🌸", name: "cherry blossom", code: "U+1F338", category: "animals" },
  { emoji: "🌺", name: "hibiscus", code: "U+1F33A", category: "animals" },
  { emoji: "🌻", name: "sunflower", code: "U+1F33B", category: "animals" },
  { emoji: "🌹", name: "rose", code: "U+1F339", category: "animals" },
  { emoji: "🌷", name: "tulip", code: "U+1F337", category: "animals" },
  { emoji: "🌲", name: "evergreen tree", code: "U+1F332", category: "animals" },
  // Food
  { emoji: "🍎", name: "red apple", code: "U+1F34E", category: "food" },
  { emoji: "🍊", name: "tangerine", code: "U+1F34A", category: "food" },
  { emoji: "🍋", name: "lemon", code: "U+1F34B", category: "food" },
  { emoji: "🍌", name: "banana", code: "U+1F34C", category: "food" },
  { emoji: "🍉", name: "watermelon", code: "U+1F349", category: "food" },
  { emoji: "🍇", name: "grapes", code: "U+1F347", category: "food" },
  { emoji: "🍓", name: "strawberry", code: "U+1F353", category: "food" },
  { emoji: "🍕", name: "pizza", code: "U+1F355", category: "food" },
  { emoji: "🍔", name: "hamburger", code: "U+1F354", category: "food" },
  { emoji: "🍟", name: "french fries", code: "U+1F35F", category: "food" },
  { emoji: "🍩", name: "doughnut", code: "U+1F369", category: "food" },
  { emoji: "🍪", name: "cookie", code: "U+1F36A", category: "food" },
  { emoji: "🎂", name: "birthday cake", code: "U+1F382", category: "food" },
  { emoji: "☕", name: "hot beverage", code: "U+2615", category: "food" },
  // Activities
  { emoji: "⚽", name: "soccer ball", code: "U+26BD", category: "activities" },
  { emoji: "🏀", name: "basketball", code: "U+1F3C0", category: "activities" },
  {
    emoji: "🏈",
    name: "american football",
    code: "U+1F3C8",
    category: "activities",
  },
  { emoji: "⚾", name: "baseball", code: "U+26BE", category: "activities" },
  { emoji: "🎾", name: "tennis", code: "U+1F3BE", category: "activities" },
  { emoji: "🎮", name: "video game", code: "U+1F3AE", category: "activities" },
  {
    emoji: "🎨",
    name: "artist palette",
    code: "U+1F3A8",
    category: "activities",
  },
  {
    emoji: "🎬",
    name: "clapper board",
    code: "U+1F3AC",
    category: "activities",
  },
  { emoji: "🎤", name: "microphone", code: "U+1F3A4", category: "activities" },
  // Objects
  { emoji: "💡", name: "light bulb", code: "U+1F4A1", category: "objects" },
  { emoji: "📱", name: "mobile phone", code: "U+1F4F1", category: "objects" },
  { emoji: "💻", name: "laptop", code: "U+1F4BB", category: "objects" },
  { emoji: "⌨️", name: "keyboard", code: "U+2328", category: "objects" },
  {
    emoji: "🖥️",
    name: "desktop computer",
    code: "U+1F5A5",
    category: "objects",
  },
  { emoji: "📷", name: "camera", code: "U+1F4F7", category: "objects" },
  { emoji: "📺", name: "television", code: "U+1F4FA", category: "objects" },
  { emoji: "⏰", name: "alarm clock", code: "U+23F0", category: "objects" },
  { emoji: "📚", name: "books", code: "U+1F4DA", category: "objects" },
  { emoji: "✏️", name: "pencil", code: "U+270F", category: "objects" },
  // Symbols
  { emoji: "❤️", name: "red heart", code: "U+2764", category: "symbols" },
  { emoji: "💔", name: "broken heart", code: "U+1F494", category: "symbols" },
  { emoji: "💕", name: "two hearts", code: "U+1F495", category: "symbols" },
  { emoji: "💙", name: "blue heart", code: "U+1F499", category: "symbols" },
  { emoji: "💚", name: "green heart", code: "U+1F49A", category: "symbols" },
  { emoji: "💛", name: "yellow heart", code: "U+1F49B", category: "symbols" },
  { emoji: "✨", name: "sparkles", code: "U+2728", category: "symbols" },
  { emoji: "⭐", name: "star", code: "U+2B50", category: "symbols" },
  { emoji: "🌟", name: "glowing star", code: "U+1F31F", category: "symbols" },
  {
    emoji: "✅",
    name: "check mark button",
    code: "U+2705",
    category: "symbols",
  },
  { emoji: "❌", name: "cross mark", code: "U+274C", category: "symbols" },
  { emoji: "🔥", name: "fire", code: "U+1F525", category: "symbols" },
  { emoji: "💯", name: "hundred points", code: "U+1F4AF", category: "symbols" },
];

const filteredEmojis = computed(() => {
  let result = emojis.filter((e) => e.category === activeCategory.value);
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((e) => e.name.toLowerCase().includes(query));
  }
  return result;
});

const selectEmoji = (emoji: Emoji) => {
  emit("select", emoji.emoji);
};

watch(
  () => props.show,
  (newShow) => {
    if (!newShow) {
      searchQuery.value = "";
      activeCategory.value = "smileys";
    }
  }
);
</script>

<style scoped>
.emoji-picker {
  position: relative;
  width: 320px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-xl, 12px);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 10001;
}

:global(.theme-dark) .emoji-picker {
  background: #1f2937;
  border-color: #374151;
}

:global(.theme-dark) .emoji-picker-header,
:global(.theme-dark) .emoji-categories {
  border-color: #374151;
}

:global(.theme-dark) .emoji-search {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

:global(.theme-dark) .category-btn:hover,
:global(.theme-dark) .emoji-btn:hover {
  background: #374151;
}

:global(.theme-dark) .category-btn.active {
  background: #1e3a8a;
}

:global(.theme-dark) .close-emoji-btn:hover {
  background: #374151;
  color: #f9fafb;
}

:global(.theme-dark) .no-results {
  color: #9ca3af;
}

.emoji-picker-header {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  align-items: center;
}

.emoji-search {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
}

.emoji-search:focus {
  outline: none;
  border-color: #3b82f6;
}

.close-emoji-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 18px;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 1;
}

.close-emoji-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.emoji-categories {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.category-btn {
  padding: 6px 10px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  transition: background var(--transition-fast, 150ms) ease;
  flex-shrink: 0;
}

.category-btn:hover {
  background: #f3f4f6;
}

.category-btn.active {
  background: #eff6ff;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 12px;
  overflow-y: auto;
  max-height: 280px;
}

.emoji-btn {
  width: 100%;
  aspect-ratio: 1;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  transition: background var(--transition-fast, 150ms) ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn:hover {
  background: #f3f4f6;
}

.no-results {
  grid-column: 1 / -1;
  padding: 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}
</style>
