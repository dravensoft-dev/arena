/* The input of the theme-css golden: one rich config with no "runtimePalettes" key, two style plugins
 * that both answer a light group, three palettes and sheets with aliases, role references, scopes and
 * a catalogue. theme-css-golden.css is themeCss of this input as the emitter wrote it at bb3e930c, the
 * commit before the runtime-palette work, so theme-css.test.ts can hold today's output to it byte for byte. */

import { PALETTE_KEYS } from '../palette-keys.ts';

const ARENA = 'com.dravensoft.arena';

const colors = (base: string, over: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  PALETTE_KEYS.forEach((key, i) => { out[key] = `#${((0x141010 + i * 0x0b0d0a) & 0xffffff).toString(16).padStart(6, '0')}`; });
  return { ...out, 'base-100': base, ...over };
};

export function goldenInput(readPlugin: (name: string, answers: Record<string, any>) => any) {
  const config: any = {
    palettes: [
      { name: 'dark', default: true, polarity: 'dark', colors: colors('#141010', { 'base-200': '#1e1919', 'base-content': '#f3ede5', primary: '#ff8a5b' }) },
      { name: 'light', polarity: 'light', colors: colors('#ffffff', { 'base-200': '#f4efe9', 'base-content': '#1a1614', primary: '#c2410c' }) },
      { name: 'dusk', polarity: 'dark', colors: colors('#1b1830', { 'base-200': '#25213f', 'base-content': '#f3ede5', primary: '#a78bfa' }) },
    ],
    fonts: {
      display: { family: 'Archivo', src: 'https://example.com/a.woff2' },
      body: { family: 'Familjen Grotesk', src: './fonts/b.woff2' },
      mono: { family: 'Spline Sans Mono', src: './fonts/m.woff2' },
    },
    stylePlugins: ['./design/console', './design/marketing'],
  };

  const sheets: any = {
    layers: ['css/reset.css', 'css/base.css'],
    components: ['button', 'card'],
    scopes: ['inverse'],
    aliases: ['--ink:var(--color-base-100);', '--focus-ring:var(--color-secondary);'],
    roleReferences: ['--fill-x:var(--color-base-200);', '--fill-surface:var(--color-base-200);'],
    catalogue: {
      tokens: {
        'fs-h3': '24px', 'font-display': "'Archivo',system-ui,sans-serif",
        'font-body': "'Familjen Grotesk',system-ui,sans-serif", 'fw-black': '900', 'fw-regular': '400',
        'color-base-200': 'var(--color-base-200)', 'color-secondary': 'var(--color-secondary)',
        bw: '1px', 'bw-surface': '1px', 'shadow-surface-rest': '0px 0px 0px 0px rgba(0,0,0,0)',
        'fill-surface': 'var(--color-base-200)', 'fill-page': 'var(--color-base-100)',
        'lh-prose': '1.6', 'lh-heading': '1.5', 'measure-prose': '72ch',
        'rhythm-group': '12px', 'rhythm-section': '24px',
      },
      roles: {
        'ff-eyebrow': { type: 'fontFamily' },
        'tt-eyebrow': { type: 'keyword', values: ['none', 'uppercase', 'lowercase', 'capitalize'] },
        'step-title-surface': { type: 'dimension' },
        'ink-eyebrow': { type: 'color' },
        'fill-surface': { type: 'color' },
        'bw-surface': { type: 'dimension' },
        'lh-heading': { type: 'number' },
        'measure-prose': { type: 'number' },
      },
    },
  };

  const root = readPlugin('console', {
    'ff-eyebrow': { $type: 'fontFamily', $value: '{font.display}' },
    'tt-eyebrow': { $type: 'keyword', $value: 'none' },
    'step-title-surface': { $type: 'dimension', $value: '{fs.h3}' },
    'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' },
    'fill-surface': { $type: 'color', $value: '{color.base-200}' },
    'bw-surface': { $type: 'dimension', $value: { value: 1, unit: 'px' } },
    'lh-heading': { $type: 'number', $value: 1.5 },
    'measure-prose': { $type: 'number', $value: 72, $extensions: { [ARENA]: { cssUnit: 'ch' } } },
    light: {
      'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' },
      'fill-surface': { $type: 'color', $value: '{color.base-200}' },
    },
  });
  const marketing = readPlugin('marketing', {
    'bw-surface': { $type: 'dimension', $value: { value: 0, unit: 'px' } },
    'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' },
    light: { 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } },
  });

  return { config, options: { sheets, importHeader: false, plugins: [root, marketing] } };
}
