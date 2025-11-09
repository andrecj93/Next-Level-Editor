export interface SelectionSnapshot {
  range: Range | null;
}

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
]);

const isElement = (node: Node): node is HTMLElement =>
  node.nodeType === Node.ELEMENT_NODE;

const getSelection = () =>
  globalThis.window === undefined ? null : globalThis.getSelection();

export const getSelectionRange = (): Range | null => {
  const selection = getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  return selection.getRangeAt(0);
};

export const saveSelection = (): Range | null => {
  const range = getSelectionRange();
  return range ? range.cloneRange() : null;
};

export const restoreSelection = (range: Range | null) => {
  if (!range) return;
  const selection = getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
};

const ensureRangeWithinRoot = (range: Range, root: HTMLElement) => {
  const commonAncestor = range.commonAncestorContainer;
  if (!root.contains(commonAncestor)) {
    throw new Error("Selection is outside the editor root.");
  }
};

const getClosestElement = (
  node: Node | null,
  predicate: (element: HTMLElement) => boolean,
  root: HTMLElement
): HTMLElement | null => {
  let current: Node | null = node;
  while (current && current !== root) {
    if (isElement(current) && predicate(current)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
};

const collectFragmentNodes = (fragment: DocumentFragment): Node[] => {
  const nodes: Node[] = [];
  let current = fragment.firstChild;
  while (current) {
    nodes.push(current);
    current = current.nextSibling;
  }
  return nodes;
};

const wrapNodes = (
  nodes: Node[],
  tagName: string,
  attributes: Record<string, string>
) => {
  if (nodes.length === 0) return null;
  const wrapper = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    wrapper.setAttribute(key, value);
  });
  nodes.forEach((node) => wrapper.appendChild(node));
  return wrapper;
};

const replaceTag = (element: HTMLElement, tagName: string): HTMLElement => {
  if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
    return element;
  }
  const newElement = document.createElement(tagName);
  while (element.firstChild) {
    newElement.appendChild(element.firstChild);
  }
  element.replaceWith(newElement);
  return newElement;
};

const wrapRangeWithElement = (range: Range, element: HTMLElement): Range => {
  const selection = getSelection();
  const contents = range.extractContents();
  element.appendChild(contents);
  range.insertNode(element);
  const newRange = document.createRange();
  newRange.selectNodeContents(element);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  return newRange;
};

const createPlaceholderRange = (range: Range, element: HTMLElement): Range => {
  element.appendChild(document.createTextNode("\u200b"));
  range.insertNode(element);
  const selection = getSelection();
  const newRange = document.createRange();
  newRange.selectNodeContents(element);
  newRange.collapse(false);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  return newRange;
};

export const wrapSelection = (
  root: HTMLElement,
  tagName: string,
  attributes: Record<string, string> = {}
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  if (range.collapsed) {
    createPlaceholderRange(range, element);
  } else {
    wrapRangeWithElement(range, element);
  }
};

const isRangeFullyStyled = (
  range: Range,
  tagName: string,
  root: HTMLElement
): boolean => {
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!range.intersectsNode(node)) {
          return NodeFilter.FILTER_SKIP;
        }
        return node.textContent
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    }
  );

  let encountered = false;
  while (walker.nextNode()) {
    encountered = true;
    const closest = getClosestElement(
      walker.currentNode,
      (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
      root
    );
    if (!closest) {
      return false;
    }
  }

  return encountered;
};

const findStyledParent = (node: Node, tagName: string): HTMLElement | null => {
  let current: Node | null = node;
  while (current) {
    if (
      isElement(current) &&
      current.tagName.toLowerCase() === tagName.toLowerCase()
    ) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const unwrapMatchingElements = (
  fragment: DocumentFragment,
  tagName: string
): void => {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
  const toUnwrap: HTMLElement[] = [];
  let current: Node | null = walker.currentNode;
  while (current) {
    if (
      current instanceof HTMLElement &&
      current.tagName.toLowerCase() === tagName.toLowerCase()
    ) {
      toUnwrap.push(current);
    }
    current = walker.nextNode();
  }
  toUnwrap.forEach((node) => unwrapElement(node));
};

const insertFragmentAtPosition = (
  fragment: DocumentFragment,
  styledParent: HTMLElement | null
): void => {
  if (styledParent?.parentNode && !styledParent.textContent) {
    const parent = styledParent.parentNode;
    const nextSibling = styledParent.nextSibling;
    styledParent.remove();

    const tempRange = document.createRange();
    if (nextSibling) {
      tempRange.setStartBefore(nextSibling);
    } else {
      tempRange.selectNodeContents(parent);
      tempRange.collapse(false);
    }
    tempRange.insertNode(fragment);
  }
};

const removeInlineStyleFromRange = (range: Range, tagName: string) => {
  const styledParent = findStyledParent(range.commonAncestorContainer, tagName);
  const fragment = range.extractContents();

  unwrapMatchingElements(fragment, tagName);
  const nodes = collectFragmentNodes(fragment);

  const insertedAtParent =
    styledParent?.parentNode && !styledParent.textContent;
  if (insertedAtParent) {
    insertFragmentAtPosition(fragment, styledParent);
  } else {
    range.insertNode(fragment);
  }

  // Re-select the inserted content
  const selection = getSelection();
  if (selection && nodes.length > 0) {
    const newRange = document.createRange();
    newRange.setStartBefore(nodes[0]);
    newRange.setEndAfter(nodes.at(-1)!);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

const removeInlineStyleAtCaret = (
  range: Range,
  tagName: string,
  attributes: Record<string, string>,
  root: HTMLElement
) => {
  const existing = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
    root
  );

  if (!existing) {
    wrapSelection(root, tagName, attributes);
    return;
  }

  const parent = existing.parentNode;
  if (!parent) {
    return;
  }

  const referenceNode = existing.nextSibling;

  const beforeRange = document.createRange();
  beforeRange.setStart(existing, 0);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeFragment = beforeRange.cloneContents();

  const afterRange = document.createRange();
  afterRange.setStart(range.startContainer, range.startOffset);
  afterRange.setEnd(existing, existing.childNodes.length);
  const afterFragment = afterRange.cloneContents();

  existing.remove();

  const beforeWrapper = wrapNodes(
    collectFragmentNodes(beforeFragment),
    tagName,
    attributes
  );
  const afterWrapper = wrapNodes(
    collectFragmentNodes(afterFragment),
    tagName,
    attributes
  );

  if (beforeWrapper && referenceNode) {
    referenceNode.before(beforeWrapper);
  } else if (beforeWrapper) {
    parent.appendChild(beforeWrapper);
  }

  if (afterWrapper && referenceNode) {
    referenceNode.before(afterWrapper);
  } else if (afterWrapper) {
    parent.appendChild(afterWrapper);
  }

  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    if (afterWrapper) {
      newRange.setStartBefore(afterWrapper);
    } else if (referenceNode) {
      newRange.setStartBefore(referenceNode);
    } else {
      newRange.setStart(parent, parent.childNodes.length);
    }
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

export const applyInlineStyle = (
  root: HTMLElement,
  tagName: string,
  attributes: Record<string, string> = {}
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  if (range.collapsed) {
    removeInlineStyleAtCaret(range, tagName, attributes, root);
    return;
  }

  if (isRangeFullyStyled(range, tagName, root)) {
    removeInlineStyleFromRange(range, tagName);
    return;
  }

  wrapSelection(root, tagName, attributes);
};

const getBlockAncestor = (
  node: Node,
  root: HTMLElement
): HTMLElement | null => {
  return getClosestElement(
    node,
    (element) => BLOCK_TAGS.has(element.tagName.toLowerCase()),
    root
  );
};

/**
 * Unnest a list item by converting it to a block element outside the list
 * Returns the new block element
 */
const unnestListItem = (li: HTMLElement, tagName: string): HTMLElement => {
  const list = li.parentElement;
  if (!list || !["ul", "ol"].includes(list.tagName.toLowerCase())) {
    return replaceTag(li, tagName);
  }

  const newBlock = document.createElement(tagName);
  while (li.firstChild) {
    newBlock.appendChild(li.firstChild);
  }

  // If this is the only item in the list, replace the entire list
  if (list.children.length === 1) {
    list.replaceWith(newBlock);
  } else {
    // Split the list if necessary
    const itemsAfter = [];
    let nextSibling = li.nextElementSibling;
    while (nextSibling) {
      itemsAfter.push(nextSibling);
      nextSibling = nextSibling.nextElementSibling;
    }

    // Remove the list item
    li.remove();

    // If there are items after, create a new list for them
    if (itemsAfter.length > 0) {
      const newList = document.createElement(list.tagName.toLowerCase());
      itemsAfter.forEach((item) => newList.appendChild(item));
      list.parentNode?.insertBefore(newBlock, list.nextSibling);
      list.parentNode?.insertBefore(newList, newBlock.nextSibling);
    } else {
      list.parentNode?.insertBefore(newBlock, list.nextSibling);
    }
  }

  return newBlock;
};

export const toggleBlock = (
  root: HTMLElement,
  tagName: string,
  fallbackTag = "p"
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  const block = getBlockAncestor(range.startContainer, root);
  if (!block) {
    wrapSelection(root, tagName);
    return;
  }

  const currentTag = block.tagName.toLowerCase();
  const targetTag = tagName.toLowerCase();

  // Special handling for list items - unnest them when converting to headings
  if (
    currentTag === "li" &&
    ["h1", "h2", "h3", "h4", "h5", "h6"].includes(targetTag)
  ) {
    const replaced = unnestListItem(block, targetTag);
    const selection = getSelection();
    if (selection) {
      const newRange = document.createRange();
      newRange.selectNodeContents(replaced);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return;
  }

  const newTag = currentTag === targetTag ? fallbackTag : targetTag;
  const replaced = replaceTag(block, newTag);

  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(replaced);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

const convertBlockToList = (
  block: HTMLElement,
  listTag: "ul" | "ol"
): HTMLElement => {
  const list = document.createElement(listTag);
  const listItem = document.createElement("li");
  while (block.firstChild) {
    listItem.appendChild(block.firstChild);
  }
  list.appendChild(listItem);
  block.replaceWith(list);
  return listItem;
};

const unwrapList = (list: HTMLElement) => {
  const parent = list.parentNode;
  if (!parent) return;
  const fragment = document.createDocumentFragment();
  Array.from(list.children).forEach((child) => {
    if (isElement(child) && child.tagName.toLowerCase() === "li") {
      const paragraph = document.createElement("p");
      while (child.firstChild) {
        paragraph.appendChild(child.firstChild);
      }
      fragment.appendChild(paragraph);
    } else {
      fragment.appendChild(child);
    }
  });
  list.replaceWith(fragment);
};

export const toggleList = (root: HTMLElement, listTag: "ul" | "ol") => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  const listAncestor = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === listTag,
    root
  );

  if (listAncestor) {
    unwrapList(listAncestor);
    return;
  }

  const block = getBlockAncestor(range.startContainer, root);
  if (block) {
    const listItem = convertBlockToList(block, listTag);
    const selection = getSelection();
    if (selection) {
      const newRange = document.createRange();
      newRange.selectNodeContents(listItem);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return;
  }

  const list = document.createElement(listTag);
  const listItem = document.createElement("li");
  const contents = range.extractContents();
  if (contents.childNodes.length === 0) {
    listItem.appendChild(document.createTextNode("\u200b"));
  } else {
    listItem.appendChild(contents);
  }
  list.appendChild(listItem);
  range.insertNode(list);
  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

export const isInlineStyleActive = (
  root: HTMLElement,
  tagName: string
): boolean => {
  const range = getSelectionRange();
  if (!range) return false;
  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }
  return Boolean(
    getClosestElement(
      range.startContainer,
      (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
      root
    )
  );
};

export const isBlockActive = (root: HTMLElement, tagName: string): boolean => {
  const range = getSelectionRange();
  if (!range) return false;
  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }
  const block = getBlockAncestor(range.startContainer, root);
  return block ? block.tagName.toLowerCase() === tagName.toLowerCase() : false;
};

export const isListActive = (
  root: HTMLElement,
  listTag: "ul" | "ol"
): boolean => {
  const range = getSelectionRange();
  if (!range) return false;
  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }
  const listAncestor = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === listTag,
    root
  );
  return Boolean(listAncestor);
};

/**
 * Indent a list item (move it into a nested list)
 */
export const indentListItem = (root: HTMLElement): boolean => {
  const range = getSelectionRange();
  if (!range) return false;

  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }

  // Find the list item containing the cursor
  const listItem = getClosestElement(
    range.startContainer,
    (el) => el.tagName.toLowerCase() === "li",
    root
  );

  if (!listItem) return false;

  // Get the previous sibling list item
  const prevSibling = listItem.previousElementSibling;
  if (!prevSibling || prevSibling.tagName.toLowerCase() !== "li") {
    return false; // Can't indent if there's no previous sibling
  }

  // Get the parent list type
  const parentList = listItem.parentElement;
  if (!parentList || !["ul", "ol"].includes(parentList.tagName.toLowerCase())) {
    return false;
  }

  const listTag = parentList.tagName.toLowerCase() as "ul" | "ol";

  // Check if previous sibling already has a nested list
  let nestedList = Array.from(prevSibling.children).find((child) =>
    ["ul", "ol"].includes(child.tagName.toLowerCase())
  ) as HTMLElement | undefined;

  // If no nested list exists, create one
  if (!nestedList) {
    nestedList = document.createElement(listTag);
    prevSibling.appendChild(nestedList);
  }

  // Move the current list item into the nested list
  nestedList.appendChild(listItem);

  // Restore selection
  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  return true;
};

/**
 * Outdent a list item (move it out of a nested list)
 */
export const outdentListItem = (root: HTMLElement): boolean => {
  const range = getSelectionRange();
  if (!range) return false;

  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }

  // Find the list item containing the cursor
  const listItem = getClosestElement(
    range.startContainer,
    (el) => el.tagName.toLowerCase() === "li",
    root
  );

  if (!listItem) return false;

  // Get the parent list
  const parentList = listItem.parentElement;
  if (!parentList || !["ul", "ol"].includes(parentList.tagName.toLowerCase())) {
    return false;
  }

  // Get the grandparent list item (if it exists)
  const grandparentLi = parentList.parentElement;
  if (!grandparentLi || grandparentLi.tagName.toLowerCase() !== "li") {
    return false; // Can't outdent if not in a nested list
  }

  // Get the great-grandparent list
  const greatGrandparentList = grandparentLi.parentElement;
  if (
    !greatGrandparentList ||
    !["ul", "ol"].includes(greatGrandparentList.tagName.toLowerCase())
  ) {
    return false;
  }

  // Insert the list item after the grandparent list item
  if (grandparentLi.nextSibling) {
    greatGrandparentList.insertBefore(listItem, grandparentLi.nextSibling);
  } else {
    greatGrandparentList.appendChild(listItem);
  }

  // If the parent list is now empty, remove it
  if (parentList.children.length === 0) {
    parentList.remove();
  }

  // Restore selection
  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  return true;
};

export const insertLink = (root: HTMLElement, url: string) => {
  wrapSelection(root, "a", {
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
  });
};

export const insertImage = (
  root: HTMLElement,
  url: string,
  alt: string = ""
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  // Create a wrapper div for the image with resize functionality
  const wrapper = document.createElement("div");
  wrapper.className = "editor-image-wrapper";
  wrapper.contentEditable = "false";
  wrapper.style.display = "inline-block";
  wrapper.style.position = "relative";
  wrapper.style.maxWidth = "100%";
  wrapper.style.margin = "10px 0";
  wrapper.style.cursor = "pointer";

  const image = document.createElement("img");
  image.src = url;
  if (alt) {
    image.alt = alt;
  }
  image.className = "editor-image-resizable";
  image.style.maxWidth = "100%";
  image.style.height = "auto";
  image.style.display = "block";
  image.draggable = false;

  wrapper.appendChild(image);

  // Insert the wrapped image
  range.deleteContents();
  range.insertNode(wrapper);

  // Insert a paragraph after the image for typing
  const para = document.createElement("p");
  para.appendChild(document.createTextNode("\u200B")); // Zero-width space
  wrapper.parentNode?.insertBefore(para, wrapper.nextSibling);

  // Position cursor in the new paragraph
  const selection = getSelection();
  if (selection && para.firstChild) {
    const newRange = document.createRange();
    newRange.setStart(para.firstChild, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

export const clearFormatting = (root: HTMLElement) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);
  if (range.collapsed) return;
  const text = range.toString();
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
};
