<template>
  <nav class="skip-links" aria-label="Skip links">
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.target}`"
      class="skip-link"
      @click="handleSkip(link.target)"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAccessibility } from "../composables/useAccessibility";
import { smoothScrollIntoView } from "../utils/scroll";

/**
 * Skip Link Configuration
 */
interface SkipLink {
  id: string;
  label: string;
  target: string;
}

/**
 * Props
 */
interface Props {
  customLinks?: SkipLink[];
}

const props = withDefaults(defineProps<Props>(), {
  customLinks: () => [],
});

// Composables
const { setFocus, announce } = useAccessibility();

// Default skip links
const defaultLinks: SkipLink[] = [
  { id: "skip-main", label: "Skip to main content", target: "main-content" },
  { id: "skip-toolbar", label: "Skip to toolbar", target: "toolbar" },
  { id: "skip-footer", label: "Skip to footer", target: "footer" },
];

// Merge default and custom links
const links = ref<SkipLink[]>([...defaultLinks, ...props.customLinks]);

/**
 * Handle skip link click
 */
const handleSkip = (targetId: string) => {
  const targetElement = document.getElementById(targetId);

  if (targetElement) {
    // Set focus to target
    setFocus(targetElement, {
      announce: `Skipped to ${targetId.replace("-", " ")}`,
      preventScroll: false,
    });

    // Scroll into view
    smoothScrollIntoView(targetElement, {
      behavior: "smooth",
      block: "start",
    });

    // Make target focusable if it's not already
    if (!targetElement.hasAttribute("tabindex")) {
      targetElement.setAttribute("tabindex", "-1");

      // Remove tabindex after focus (cleanup)
      targetElement.addEventListener(
        "blur",
        () => {
          targetElement.removeAttribute("tabindex");
        },
        { once: true }
      );
    }
  } else {
    announce(`Target ${targetId} not found`, { priority: "assertive" });
  }
};
</script>

<style scoped>
/**
 * Skip Links Container
 * Positioned at top-left, off-screen by default
 */
.skip-links {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/**
 * Individual Skip Link
 * Hidden off-screen, visible on focus
 */
.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  padding: 12px 24px;
  background: var(--skip-link-bg, #1e40af);
  color: var(--skip-link-color, #ffffff);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: top 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

/**
 * Show skip link on keyboard focus
 */
.skip-link:focus {
  top: 0;
  outline: 3px solid var(--skip-link-outline, #ffffff);
  outline-offset: -3px;
}

/**
 * Stack multiple skip links vertically when focused
 */
.skip-link:nth-child(1):focus {
  top: 0;
}

.skip-link:nth-child(2):focus {
  top: 48px;
}

.skip-link:nth-child(3):focus {
  top: 96px;
}

.skip-link:nth-child(4):focus {
  top: 144px;
}

/**
 * Hover state (for mouse users who tab to skip link)
 */
.skip-link:hover {
  background: var(--skip-link-hover-bg, #1e3a8a);
  transform: scale(1.02);
}

/**
 * Active state
 */
.skip-link:active {
  background: var(--skip-link-active-bg, #1e3a8a);
  transform: scale(0.98);
}

/**
 * Dark mode adjustments — keyed to the editor's own theme class (.theme-dark
 * on the .next-level-editor root), not the OS prefers-color-scheme setting.
 */
.theme-dark .skip-link {
  background: #3b82f6;
  color: #000000;
}

.theme-dark .skip-link:hover {
  background: #60a5fa;
}

.theme-dark .skip-link:focus {
  outline-color: #000000;
}

/**
 * High contrast mode
 */
@media (prefers-contrast: more) {
  .skip-link {
    background: #000000;
    color: #ffff00;
    border: 3px solid #ffff00;
    font-weight: 700;
  }

  .skip-link:focus {
    outline: 4px solid #ffff00;
    outline-offset: 2px;
  }
}

/**
 * Reduced motion
 */
@media (prefers-reduced-motion: reduce) {
  .skip-link {
    transition: none;
  }

  .skip-link:hover {
    transform: none;
  }
}

/**
 * Mobile adjustments
 */
@media (max-width: 768px) {
  .skip-link {
    padding: 10px 20px;
    font-size: 14px;
  }

  .skip-link:nth-child(2):focus {
    top: 44px;
  }

  .skip-link:nth-child(3):focus {
    top: 88px;
  }

  .skip-link:nth-child(4):focus {
    top: 132px;
  }
}

/**
 * Print styles (hide skip links when printing)
 */
@media print {
  .skip-links {
    display: none;
  }
}
</style>
