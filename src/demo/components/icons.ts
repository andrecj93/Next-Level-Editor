/**
 * The site's single crafted stroke-icon set — one source of truth so the
 * marketing site never reaches for an emoji (per the project's established
 * "no emoji, no AI-slop" design direction). Every glyph is a 24×24 stroke path
 * drawn on the same visual grid (1.7 default weight, round caps/joins) so the
 * whole set reads like it was drawn by one hand.
 *
 * Kept in a plain module (not inside Icon.vue) so both the component and its
 * `IconName` type import from here — no dual-script-block SFC gymnastics.
 */
// prettier-ignore
export const ICONS = {
  // editor capabilities
  slash: '<path d="M15.5 5 8.5 19"/>',
  comment: '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9.5 9.5 0 0 1-4-.9L3 20l1.4-4.5A8.38 8.38 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z"/><path d="M8.5 11h7M8.5 14h4"/>',
  braces: '<path d="M8 4c-1.5 0-2.5 1-2.5 2.6V9c0 1.2-.7 2.1-2 2.4v1.2c1.3.3 2 1.2 2 2.4v2.4C5.5 19 6.5 20 8 20"/><path d="M16 4c1.5 0 2.5 1 2.5 2.6V9c0 1.2.7 2.1 2 2.4v1.2c-1.3.3-2 1.2-2 2.4v2.4C18.5 19 17.5 20 16 20"/>',
  export: '<path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  chart: '<path d="M4 20V10M9.5 20V4M15 20v-7M20.5 20v-4"/>',
  mobile: '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M11 18h2"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-3.9-4-7.3-9-7.3Z"/><circle cx="7.6" cy="11" r="1"/><circle cx="10.5" cy="7.4" r="1"/><circle cx="14.6" cy="7.4" r="1"/>',
  puzzle: '<path d="M9.5 4.5a1.7 1.7 0 0 1 3.4 0c0 .3-.1.6-.2.9-.2.5.2 1.1.8 1.1H16a1 1 0 0 1 1 1v2.3c0 .6.6 1 1.1.8.3-.1.6-.2.9-.2a1.7 1.7 0 0 1 0 3.4c-.3 0-.6-.1-.9-.2-.5-.2-1.1.2-1.1.8V17a1 1 0 0 1-1 1h-2.3c-.6 0-1-.6-.8-1.1.1-.3.2-.6.2-.9a1.7 1.7 0 0 0-3.4 0c0 .3.1.6.2.9.2.5-.2 1.1-.8 1.1H7a1 1 0 0 1-1-1v-2.5"/><path d="M6 14.5c-.3.1-.6.2-.9.2a1.7 1.7 0 0 1 0-3.4c.3 0 .6.1.9.2.5.2 1.1-.2 1.1-.8V8a1 1 0 0 1 1-1h1.5"/>',
  shield: '<path d="M12 3 5 6v5c0 4 3 7.4 7 9 4-1.6 7-5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  access: '<circle cx="12" cy="4.5" r="1.6"/><path d="M4.5 8.5c2.4 1 5 1.5 7.5 1.5s5.1-.5 7.5-1.5"/><path d="M12 8.5V16m0 0-2.5 5M12 16l2.5 5"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 13.5h.01M17 13.5h.01M9.5 13.5h5"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.6"/><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M15 4.5v15"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 4.5-4.5a1.5 1.5 0 0 1 2 0L20 20"/>',
  undo: '<path d="M8 8H5V5"/><path d="M5 8a8 8 0 1 1-1.5 6"/>',
  // ui / chrome
  pen: '<path d="M14.5 4.5 19.5 9.5 8.5 20.5H3.5V15.5Z"/><path d="m12.5 6.5 5 5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.2 3.3 5.1 3.6 5.1 3.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.7 10c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sparkle: '<path d="M12 3.5c.4 3.6 1.4 4.6 5 5-3.6.4-4.6 1.4-5 5-.4-3.6-1.4-4.6-5-5 3.6-.4 4.6-1.4 5-5Z"/><path d="M18.5 13.5c.2 1.6.6 2 2.2 2.2-1.6.2-2 .6-2.2 2.2-.2-1.6-.6-2-2.2-2.2 1.6-.2 2-.6 2.2-2.2Z"/>',
  bolt: '<path d="M13 3 5 13.5h5.5L9 21l8-10.5h-5.5Z"/>',
  layers: '<path d="m12 3.5 8 4.2-8 4.2-8-4.2Z"/><path d="m4 12 8 4.2 8-4.2M4 15.8l8 4.2 8-4.2"/>',
} as const;

export type IconName = keyof typeof ICONS;
