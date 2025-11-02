/**
 * Type declarations for non-standard browser APIs
 */

interface Window {
  /**
   * Non-standard window.find() method
   * Finds a string in a window. This is a deprecated non-standard method,
   * but it's still widely supported across browsers.
   * 
   * @param searchString - The text string to find
   * @param caseSensitive - Whether the search should be case-sensitive
   * @param backwards - Whether to search backwards
   * @param wrapAround - Whether to wrap around
   * @param wholeWord - Whether to match whole words only
   * @param searchInFrames - Whether to search in frames
   * @param showDialog - Whether to show a dialog
   * @returns true if the string was found, false otherwise
   */
  find(
    searchString: string,
    caseSensitive?: boolean,
    backwards?: boolean,
    wrapAround?: boolean,
    wholeWord?: boolean,
    searchInFrames?: boolean,
    showDialog?: boolean
  ): boolean
}
