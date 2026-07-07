<template>
  <nav ref="navRef" class="skip-links" aria-label="Skip links">
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.target}`"
      class="skip-link"
      @click="handleSkip($event, link)"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAccessibility } from "../composables/useAccessibility";
import { smoothScrollIntoView } from "../utils/scroll";

/**
 * Skip Link Configuration
 */
interface SkipLink {
  id: string;
  label: string;
  target: string;
  /**
   * Fallback CSS selector resolved within this editor instance when no
   * element with the `target` id exists. The editor's landmarks (toolbar,
   * content, footer) don't carry ids of their own — and hard-coding ids on
   * them would collide across multiple editor instances — so the default
   * links locate them by landmark selector instead.
   */
  selector?: string;
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

// Root of the skip-links nav — used to scope landmark lookups to the editor
// instance this component belongs to.
const navRef = ref<HTMLElement | null>(null);

// Default skip links
const defaultLinks: SkipLink[] = [
  {
    id: "skip-main",
    label: "Skip to main content",
    target: "main-content",
    selector: ".editor-content",
  },
  {
    id: "skip-toolbar",
    label: "Skip to toolbar",
    target: "toolbar",
    selector: '[role="toolbar"]',
  },
  {
    id: "skip-footer",
    label: "Skip to footer",
    target: "footer",
    selector: ".editor-footer",
  },
];

// Merge default and custom links
const links = ref<SkipLink[]>([...defaultLinks, ...props.customLinks]);

/**
 * Resolve a skip link's target element. Landmark selectors are checked first,
 * scoped to this editor instance, so multiple editors on one page never skip
 * into a sibling instance; plain-id targets (custom links) fall back to a
 * document-wide id lookup.
 */
const resolveTarget = (link: SkipLink): HTMLElement | null => {
  if (link.selector) {
    const root = navRef.value?.closest(".next-level-editor");
    const scoped = (root ?? document).querySelector<HTMLElement>(
      link.selector
    );
    if (scoped) return scoped;
  }
  return document.getElementById(link.target);
};

/**
 * Give the resolved landmark the id the anchor's href points to, so the
 * link's `#target` reference is real (and native anchor navigation works as a
 * no-JS fallback). Never steals an id the element already has, and never
 * duplicates an id already used elsewhere in the document.
 */
const ensureTargetId = (link: SkipLink, element: HTMLElement) => {
  if (!element.id && !document.getElementById(link.target)) {
    element.id = link.target;
  }
};

// Stamp ids onto the landmarks up front so the hrefs are valid immediately.
// (Targets rendered later — e.g. the editor pane recreated after a view-mode
// switch — are re-resolved and re-stamped at click time in handleSkip.)
onMounted(() => {
  for (const link of links.value) {
    const element = resolveTarget(link);
    if (element) {
      ensureTargetId(link, element);
    }
  }
});

/**
 * Handle skip link click
 */
const handleSkip = (event: MouseEvent, link: SkipLink) => {
  const targetElement = resolveTarget(link);

  if (targetElement) {
    // We take over from native anchor navigation (focus + smooth scroll).
    event.preventDefault();
    ensureTargetId(link, targetElement);

    // Make target focusable BEFORE focusing it — non-interactive landmarks
    // like the toolbar and footer aren't natively focusable.
    if (!targetElement.hasAttribute("tabindex")) {
      targetElement.setAttribute("tabindex", "-1");

      // Remove tabindex after focus moves on (cleanup)
      targetElement.addEventListener(
        "blur",
        () => {
          targetElement.removeAttribute("tabindex");
        },
        { once: true }
      );
    }

    // Set focus to target
    setFocus(targetElement, {
      announce: `Skipped to ${link.target.replace(/-/g, " ")}`,
      preventScroll: false,
    });

    // Scroll into view
    smoothScrollIntoView(targetElement, {
      behavior: "smooth",
      block: "start",
    });
  } else {
    announce(`Target ${link.target} not found`, { priority: "assertive" });
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
