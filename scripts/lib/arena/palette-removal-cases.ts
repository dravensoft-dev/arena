/* The palette-removal cases both layers run (React `unregisterArenaPalette`, Angular `ArenaThemeService.unregister`).
 * It imports nothing from either layer, so each layer's adapter loads it as plain data and drives its own API. */

export type RemovalPolarity = 'dark' | 'light';
export type RemovalConfigKey = 'default' | 'three';

export const REMOVAL_CONFIGS: Record<RemovalConfigKey, { palettes: { name: string; polarity: RemovalPolarity }[]; default: string }> = {
  default: {
    palettes: [{ name: 'dark', polarity: 'dark' }, { name: 'light', polarity: 'light' }],
    default: 'dark',
  },
  three: {
    palettes: [
      { name: 'dark', polarity: 'dark' },
      { name: 'light', polarity: 'light' },
      { name: 'high-contrast', polarity: 'light' },
    ],
    default: 'dark',
  },
};

export function removalPalette(name: string, polarity: RemovalPolarity): { name: string; polarity: RemovalPolarity; properties: Record<string, string> } {
  return {
    name,
    polarity,
    properties: {
      '--color-base-100': '#1b1830',
      '--color-base-200': '#25213f',
      '--color-base-content': '#f3ede5',
      '--level-2': '8%',
      '--arena-palette': name,
    },
  };
}

export type RemovalStep =
  | { do: 'register'; name: string; polarity: RemovalPolarity }
  | { do: 'set'; name: string }
  | { do: 'toggle' }
  | { do: 'remove'; name: string; returns: boolean }
  | { do: 'remove'; name: string; throws: string };

export interface RemovalObserved {
  listed: string[];
  current: string;
  stored: string | null;
  cached: string | null;
  inline: boolean;
  polarity: RemovalPolarity | null;
  unknown: string[];
}

export interface RemovalCase {
  key: string;
  title: string;
  config: RemovalConfigKey;
  prefersLight: boolean;
  unread?: true;
  seed?: { stored: string; cached: string; polarity: RemovalPolarity };
  steps: RemovalStep[];
  expect: RemovalObserved;
}

export type ScopeStep =
  | RemovalStep
  | { do: 'mount'; name: string }
  | { do: 'check'; scope: 'pending' | 'painted'; warned: number; polarity?: RemovalPolarity; page?: string };

export interface ScopeRemovalCase {
  key: string;
  title: string;
  prefersLight: boolean;
  steps: ScopeStep[];
}

const DECLARED = ['dark', 'light', 'high-contrast'];
const declaredText = DECLARED.join(', ');

const reg = (name: string, polarity: RemovalPolarity): RemovalStep => ({ do: 'register', name, polarity });
const rm = (name: string, returns: boolean): RemovalStep => ({ do: 'remove', name, returns });

const AT_START: RemovalObserved = {
  listed: DECLARED, current: 'dark', stored: null, cached: null, inline: false, polarity: null, unknown: [],
};

export const REMOVAL_CASES: RemovalCase[] = [
  {
    key: 'other',
    title: 'removing a palette that is not current leaves the stored name, the copy and the paint alone',
    config: 'three',
    prefersLight: false,
    steps: [reg('a', 'dark'), reg('b', 'light'), { do: 'set', name: 'b' }, rm('a', true)],
    expect: { listed: [...DECLARED, 'b'], current: 'b', stored: 'b', cached: 'b', inline: true, polarity: 'light', unknown: ['a'] },
  },
  {
    key: 'current',
    title: 'removing the current palette returns the page to the preferred one and clears the stored name and the copy',
    config: 'three',
    prefersLight: false,
    steps: [reg('a', 'dark'), { do: 'set', name: 'a' }, rm('a', true)],
    expect: { ...AT_START, unknown: ['a'] },
  },
  {
    key: 'current-light',
    title: 'removing the current palette returns the page to the light palette when the system prefers light',
    config: 'three',
    prefersLight: true,
    steps: [reg('a', 'dark'), { do: 'set', name: 'a' }, rm('a', true)],
    expect: { ...AT_START, current: 'light', unknown: ['a'] },
  },
  {
    key: 'unknown',
    title: 'removing a name nothing registered returns false and changes nothing',
    config: 'three',
    prefersLight: false,
    steps: [rm('nope', false)],
    expect: AT_START,
  },
  {
    key: 'declared',
    title: 'removing a declared palette throws and changes nothing',
    config: 'three',
    prefersLight: false,
    steps: [{
      do: 'remove',
      name: 'dark',
      throws: `no palette named "dark" can be unregistered, because the theme config declares it; the declared palettes are ${declaredText}`,
    }],
    expect: AT_START,
  },
  {
    key: 'twice',
    title: 'removing a palette a second time returns false',
    config: 'three',
    prefersLight: false,
    steps: [reg('a', 'dark'), rm('a', true), rm('a', false)],
    expect: AT_START,
  },
  {
    key: 'reregister',
    title: 'registering a removed current palette again does not make it current again',
    config: 'three',
    prefersLight: false,
    steps: [reg('a', 'dark'), { do: 'set', name: 'a' }, rm('a', true), reg('a', 'dark')],
    expect: { ...AT_START, listed: [...DECLARED, 'a'] },
  },
  {
    key: 'toggle',
    title: 'toggle after the current palette is removed walks from the preferred palette',
    config: 'three',
    prefersLight: false,
    steps: [reg('a', 'dark'), reg('b', 'light'), { do: 'set', name: 'b' }, rm('b', true), { do: 'toggle' }],
    expect: { listed: [...DECLARED, 'a'], current: 'light', stored: 'light', cached: null, inline: false, polarity: null, unknown: ['b'] },
  },
  {
    key: 'toggle-next',
    title: 'toggle no longer reaches a removed palette, so the walk from the last listed one wraps to the first',
    config: 'three',
    prefersLight: false,
    steps: [reg('a', 'dark'), reg('b', 'light'), { do: 'set', name: 'a' }, rm('b', true), { do: 'toggle' }],
    expect: { listed: [...DECLARED, 'a'], current: 'dark', stored: 'dark', cached: null, inline: false, polarity: null, unknown: ['b'] },
  },
  {
    key: 'unread',
    title: 'removing the palette the stored name restores before anything was read returns true and clears both keys',
    config: 'default',
    prefersLight: false,
    unread: true,
    seed: { stored: 'a', cached: 'a', polarity: 'dark' },
    steps: [rm('a', true)],
    expect: { listed: ['dark', 'light'], current: 'dark', stored: null, cached: null, inline: false, polarity: null, unknown: ['a'] },
  },
];

const check = (scope: 'pending' | 'painted', warned: number, polarity?: RemovalPolarity, page?: string): ScopeStep => ({
  do: 'check', scope, warned, ...(polarity === undefined ? {} : { polarity }), ...(page === undefined ? {} : { page }),
});

export const SCOPE_REMOVAL_CASES: ScopeRemovalCase[] = [
  {
    key: 'painted-first',
    title: 'a scope that painted goes pending with one warning when its palette is removed, and paints again when it returns',
    prefersLight: false,
    steps: [
      reg('a', 'dark'), { do: 'mount', name: 'a' }, check('painted', 0, 'dark'),
      rm('a', true), check('pending', 1),
      reg('a', 'dark'), check('painted', 1, 'dark'),
    ],
  },
  {
    key: 'later',
    title: 'a scope that already warned for a name does not warn again when that name is removed later',
    prefersLight: false,
    steps: [
      { do: 'mount', name: 'later' }, check('pending', 1),
      reg('later', 'dark'), check('painted', 1, 'dark'),
      rm('later', true), check('pending', 1),
      reg('later', 'dark'), check('painted', 1, 'dark'),
    ],
  },
  {
    key: 'page-and-scope',
    title: 'removing the palette the page and a scope both wear leaves the page on the preferred palette and the scope pending',
    prefersLight: false,
    steps: [
      reg('a', 'dark'), { do: 'set', name: 'a' }, { do: 'mount', name: 'a' },
      rm('a', true), check('pending', 1, undefined, 'dark'),
    ],
  },
];
