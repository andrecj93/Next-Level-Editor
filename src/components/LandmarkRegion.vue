<template>
  <component
    :is="tag"
    :role="role"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledBy"
    :aria-describedby="ariaDescribedBy"
    :class="classes"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Landmark Region Types
 */
export type LandmarkType =
  | "banner"
  | "navigation"
  | "main"
  | "complementary"
  | "contentinfo"
  | "search"
  | "region"
  | "form";

/**
 * Props
 */
interface Props {
  /**
   * Type of landmark region
   */
  type: LandmarkType;

  /**
   * Accessible label for the landmark
   * Required for multiple landmarks of the same type
   */
  label?: string;

  /**
   * ID of element that labels this landmark
   */
  labelledBy?: string;

  /**
   * ID of element that describes this landmark
   */
  describedBy?: string;

  /**
   * Additional CSS classes
   */
  class?: string | string[] | Record<string, boolean>;

  /**
   * Override default semantic HTML tag
   * By default, uses semantic tags (header, nav, main, etc.)
   */
  tag?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  labelledBy: undefined,
  describedBy: undefined,
  class: undefined,
  tag: undefined,
});

/**
 * Map landmark types to semantic HTML tags
 */
const semanticTags: Record<LandmarkType, string> = {
  banner: "header",
  navigation: "nav",
  main: "main",
  complementary: "aside",
  contentinfo: "footer",
  search: "search",
  region: "section",
  form: "form",
};

/**
 * Get the appropriate HTML tag for this landmark
 */
const tag = computed(() => {
  // Use custom tag if provided
  if (props.tag) return props.tag;

  // Otherwise use semantic tag
  return semanticTags[props.type] || "div";
});

/**
 * Determine if explicit role attribute is needed
 * Semantic HTML5 elements have implicit roles
 */
const role = computed(() => {
  // If custom tag is used, always add role
  if (props.tag && props.tag !== semanticTags[props.type]) {
    return props.type;
  }

  // For semantic tags, role is implicit except for these cases:
  // - Multiple instances of same landmark type (need labels)
  // - header/footer inside article/section (no implicit role)
  if (props.label || props.labelledBy) {
    return props.type;
  }

  return undefined;
});

/**
 * ARIA label
 */
const ariaLabel = computed(() => props.label);

/**
 * ARIA labelledby
 */
const ariaLabelledBy = computed(() => props.labelledBy);

/**
 * ARIA describedby
 */
const ariaDescribedBy = computed(() => props.describedBy);

/**
 * CSS classes
 */
const classes = computed(() => {
  const baseClass = `landmark-${props.type}`;

  if (typeof props.class === "string") {
    return `${baseClass} ${props.class}`;
  }

  if (Array.isArray(props.class)) {
    return [baseClass, ...props.class];
  }

  if (typeof props.class === "object") {
    return { [baseClass]: true, ...props.class };
  }

  return baseClass;
});
</script>

<style scoped>
/**
 * Base landmark styles
 * Minimal styling, mainly for debug/development
 */
[role="banner"],
[role="navigation"],
[role="main"],
[role="complementary"],
[role="contentinfo"],
[role="search"],
[role="region"],
[role="form"] {
  position: relative;
}

/**
 * Debug mode - visualize landmarks
 * Add class to body: <body class="debug-landmarks">
 */
:global(body.debug-landmarks) .landmark-banner,
:global(body.debug-landmarks) .landmark-navigation,
:global(body.debug-landmarks) .landmark-main,
:global(body.debug-landmarks) .landmark-complementary,
:global(body.debug-landmarks) .landmark-contentinfo,
:global(body.debug-landmarks) .landmark-search,
:global(body.debug-landmarks) .landmark-region,
:global(body.debug-landmarks) .landmark-form {
  outline: 3px dashed blue;
  outline-offset: -3px;
}

:global(body.debug-landmarks) .landmark-banner::before,
:global(body.debug-landmarks) .landmark-navigation::before,
:global(body.debug-landmarks) .landmark-main::before,
:global(body.debug-landmarks) .landmark-complementary::before,
:global(body.debug-landmarks) .landmark-contentinfo::before,
:global(body.debug-landmarks) .landmark-search::before,
:global(body.debug-landmarks) .landmark-region::before,
:global(body.debug-landmarks) .landmark-form::before {
  content: attr(role) " landmark";
  position: absolute;
  top: 0;
  left: 0;
  padding: 4px 8px;
  background: blue;
  color: white;
  font-size: 12px;
  font-weight: bold;
  z-index: 10000;
  pointer-events: none;
}

/* Different colors for different landmark types */
:global(body.debug-landmarks) .landmark-banner {
  outline-color: #ef4444;
}

:global(body.debug-landmarks) .landmark-banner::before {
  background: #ef4444;
}

:global(body.debug-landmarks) .landmark-navigation {
  outline-color: #3b82f6;
}

:global(body.debug-landmarks) .landmark-navigation::before {
  background: #3b82f6;
}

:global(body.debug-landmarks) .landmark-main {
  outline-color: #10b981;
}

:global(body.debug-landmarks) .landmark-main::before {
  background: #10b981;
}

:global(body.debug-landmarks) .landmark-complementary {
  outline-color: #f59e0b;
}

:global(body.debug-landmarks) .landmark-complementary::before {
  background: #f59e0b;
}

:global(body.debug-landmarks) .landmark-contentinfo {
  outline-color: #8b5cf6;
}

:global(body.debug-landmarks) .landmark-contentinfo::before {
  background: #8b5cf6;
}

:global(body.debug-landmarks) .landmark-search {
  outline-color: #ec4899;
}

:global(body.debug-landmarks) .landmark-search::before {
  background: #ec4899;
}

:global(body.debug-landmarks) .landmark-region {
  outline-color: #06b6d4;
}

:global(body.debug-landmarks) .landmark-region::before {
  background: #06b6d4;
}

:global(body.debug-landmarks) .landmark-form {
  outline-color: #84cc16;
}

:global(body.debug-landmarks) .landmark-form::before {
  background: #84cc16;
}
</style>
