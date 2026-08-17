/* The shape a consumer's arena.config.json declares, stated once. The key list is a
 * literal rather than a read of contracts/design/palette.dark.json, because this file
 * ships inside the npm packages where that source does not exist; the paired suite
 * asserts the two agree, so a colour added to the skin fails here first.
 * FILL_PAIRS and SURFACE_PAIRS say which colour has to be legible on which, and they
 * are here rather than in the gate for the same reason: check:text-contrast holds them
 * over Arena's own skin and the shipped command holds them over the consumer's, and a
 * pair listed in one place only is the half nobody measures. FILL_PAIRS carries no
 * error/error-content, because danger is an outline and error is never a fill. */

export const PALETTE_KEYS = [
  'base-100', 'base-200', 'base-300', 'base-content',
  'primary', 'primary-content',
  'secondary', 'secondary-content',
  'neutral', 'neutral-content',
  'info', 'info-content',
  'success', 'success-content',
  'warning', 'warning-content',
  'error', 'error-content', 'error-fill',
  'cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8',
];

export const OPTIONAL_KEYS = new Set(['error-fill']);

export const FILL_PAIRS = [
  { fill: 'primary', content: 'primary-content' },
  { fill: 'secondary', content: 'secondary-content' },
  { fill: 'neutral', content: 'neutral-content' },
  { fill: 'info', content: 'info-content' },
  { fill: 'success', content: 'success-content' },
  { fill: 'warning', content: 'warning-content' },
  { fill: 'error-fill', content: 'error-content' },
];

export const SURFACE_PAIRS = [
  { ink: 'base-content', on: 'base-100' },
  { ink: 'base-content', on: 'base-200' },
  { ink: 'error', on: 'base-200' },
];

export const TEXT_MIN = 4.5;

export const ARENA_CAT_SLOTS = 8;

export const POLARITIES = ['dark', 'light'];

export const FONT_ROLES = {
  display: ['system-ui', 'sans-serif'],
  body: ['system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'monospace'],
};

export const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  'math', 'emoji', 'fangsong',
]);

export const SOURCE_FORMATS = {
  '.woff2': 'woff2',
  '.woff': 'woff',
  '.ttf': 'truetype',
  '.otf': 'opentype',
};

export const catKeys = () => PALETTE_KEYS.filter((k) => /^cat-\d+$/.test(k));

export const requiredKeys = () => PALETTE_KEYS.filter((k) => !OPTIONAL_KEYS.has(k));
