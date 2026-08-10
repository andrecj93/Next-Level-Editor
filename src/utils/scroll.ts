/**
 * Cross-browser scroll utilities
 * Provides smooth scroll fallback for Safari < 15.4
 */

/**
 * Check if browser supports smooth scroll behavior
 * @returns boolean - True if smooth scroll is natively supported
 */
export function isSmoothScrollSupported(): boolean {
  return "scrollBehavior" in document.documentElement.style;
}

/**
 * Scroll element into view with smooth animation
 * Provides fallback for Safari < 15.4 and iOS < 15.4
 *
 * @param element - Element to scroll to
 * @param options - Scroll options
 */
export function smoothScrollIntoView(
  element: HTMLElement,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
  } = {}
): void {
  const { behavior = "smooth", block = "start", inline = "nearest" } = options;

  // If native smooth scroll is supported, use it
  if (isSmoothScrollSupported() || behavior === "auto") {
    element.scrollIntoView({ behavior, block, inline });
    return;
  }

  // Fallback: Manual smooth scroll with requestAnimationFrame
  animateScrollToElement(element, block);
}

/**
 * Animate scroll to element using requestAnimationFrame
 * Compatible with all browsers including Safari < 15.4
 *
 * @param element - Element to scroll to
 * @param block - Vertical alignment
 */
function animateScrollToElement(
  element: HTMLElement,
  block: ScrollLogicalPosition = "start"
): void {
  const rect = element.getBoundingClientRect();
  const absoluteTop = rect.top + window.scrollY;

  let targetY: number;

  // Calculate target position based on block option
  switch (block) {
    case "start":
      targetY = absoluteTop;
      break;
    case "center":
      targetY = absoluteTop - window.innerHeight / 2 + rect.height / 2;
      break;
    case "end":
      targetY = absoluteTop - window.innerHeight + rect.height;
      break;
    case "nearest":
      // Already visible? Don't scroll
      if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
        return;
      }
      // Closer to top? Scroll to top
      if (Math.abs(rect.top) < Math.abs(rect.bottom - window.innerHeight)) {
        targetY = absoluteTop;
      } else {
        targetY = absoluteTop - window.innerHeight + rect.height;
      }
      break;
    default:
      targetY = absoluteTop;
  }

  // Use helper for smooth animation
  animateScrollTo(targetY, 300);
}

/**
 * Easing function for smooth animation
 * @param t - Progress (0 to 1)
 * @returns Eased value
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Scroll to top of page with smooth animation
 * @param behavior - Scroll behavior (smooth or auto)
 */
export function scrollToTop(behavior: ScrollBehavior = "smooth"): void {
  if (isSmoothScrollSupported() || behavior === "auto") {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  // Fallback
  animateScrollTo(0, 300);
}

/**
 * Scroll to specific Y position with animation
 * @param targetY - Target Y position
 * @param duration - Animation duration in ms
 */
export function animateScrollTo(targetY: number, duration: number = 300): void {
  const startY = window.scrollY;
  const distance = targetY - startY;
  let startTime: number | null = null;

  function step(currentTime: number) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * Scroll element's container to show the element
 * Useful for scrolling within a scrollable div
 *
 * @param element - Element to scroll to
 * @param container - Scrollable container
 * @param behavior - Scroll behavior
 */
export function scrollIntoViewInContainer(
  element: HTMLElement,
  container: HTMLElement,
  behavior: ScrollBehavior = "smooth"
): void {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const isVisible =
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom;

  if (isVisible) return; // Already visible

  const targetScrollTop =
    element.offsetTop -
    container.offsetTop -
    containerRect.height / 2 +
    elementRect.height / 2;

  if (isSmoothScrollSupported() && behavior === "smooth") {
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  } else {
    // Fallback: Animate manually
    animateContainerScroll(container, targetScrollTop, 300);
  }
}

/**
 * Animate scroll within a container element
 * @param container - Scrollable container
 * @param targetScrollTop - Target scroll position
 * @param duration - Animation duration
 */
function animateContainerScroll(
  container: HTMLElement,
  targetScrollTop: number,
  duration: number
): void {
  const startScrollTop = container.scrollTop;
  const distance = targetScrollTop - startScrollTop;
  let startTime: number | null = null;

  function step(currentTime: number) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    container.scrollTop = startScrollTop + distance * eased;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * Get scroll support information for debugging
 * @returns Object with scroll capabilities
 */
export function getScrollSupport() {
  return {
    smoothScrollSupported: isSmoothScrollSupported(),
    scrollBehavior: "scrollBehavior" in document.documentElement.style,
    userAgent: navigator.userAgent,
  };
}
