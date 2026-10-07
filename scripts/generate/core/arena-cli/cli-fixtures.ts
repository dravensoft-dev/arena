import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PALETTE_KEYS } from './palette-keys.ts';
import { parseArgs, resolved } from './arena-to-prod.ts';
import type { ComponentMap } from './components.ts';

export const colors = (overrides: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) out[key] = '#141010';
  return { ...out, ...overrides };
};

export const readable = {
  palettes: [{ name: 'dark', default: true, polarity: 'dark',
    colors: colors({ 'base-content': '#f3ede5',
      'cat-1': '#3c7b0a', 'cat-2': '#3b63be', 'cat-3': '#0a924b', 'cat-4': '#6a59bc',
      'cat-5': '#00a3c0', 'cat-6': '#884da9', 'cat-7': '#00a99a', 'cat-8': '#984697' }) }],
  fonts: {
    display: { family: 'Archivo', src: 'https://example.com/a.woff2' },
    body: { family: 'Familjen Grotesk', src: 'https://example.com/b.woff2' },
    mono: { family: 'Spline Sans Mono', src: 'https://example.com/m.woff2' },
  },
};

export const PHOSPHOR_SHEET = (selector: string, family: string) => `@font-face {
  font-family: "${family}";
  src: url("./${family}.woff2") format("woff2"), url("./${family}.ttf") format("truetype");
  font-weight: normal;
}

${selector} { font-family: "${family}" !important; }

${selector}.ph-bell:before { content: "\\e0ce"; }
${selector}.ph-moon:before { content: "\\e330"; }
${selector}.ph-sun:before { content: "\\e6a2"; }
`;

export function phosphor(weights: Record<string, string> = { bold: 'Phosphor-Bold', fill: 'Phosphor-Fill' }) {
  const root = mkdtempSync(join(tmpdir(), 'arena-phosphor-'));
  const web = join(root, 'node_modules', '@phosphor-icons', 'web');
  mkdirSync(web, { recursive: true });
  writeFileSync(join(web, 'package.json'), JSON.stringify({ name: '@phosphor-icons/web' }));
  for (const [weight, family] of Object.entries(weights)) {
    const dir = join(web, 'src', weight);
    mkdirSync(dir, { recursive: true });
    const selector = weight === 'regular' ? '.ph' : `.ph-${weight}`;
    writeFileSync(join(dir, 'style.css'), PHOSPHOR_SHEET(selector, family));
    writeFileSync(join(dir, `${family}.woff2`), '');
  }
  return { root, web };
}

export function project(config: any = readable, files: Record<string, string> = { 'app.html': '<i class="ph-bold ph-bell"></i>' }) {
  const root = mkdtempSync(join(tmpdir(), 'arena-to-prod-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  if (config) writeFileSync(join(root, 'arena.config.json'), JSON.stringify(config));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, 'src', name), content);
  return root;
}

export const options = (
  root: string,
  extra: { strict?: boolean; importHeader?: boolean; undrawn?: boolean } = {},
) => resolved(parseArgs([
  '--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src'),
  ...(extra.strict ? ['--strict'] : []),
  ...(extra.undrawn ? ['--undrawn'] : []),
  ...(extra.importHeader === false ? ['--no-import'] : []),
]));

export function quietly(run: () => void) {
  const log = console.log, error = console.error;
  const said: string[] = [];
  console.log = (m) => said.push(m);
  console.error = (m) => said.push(m);
  try { return { code: run(), said }; } finally { console.log = log; console.error = error; }
}

export const MAP: ComponentMap = {
  match: 'selector',
  draws: { 'arena-button': 'button', 'arena-table': 'table', 'arena-bar-chart': null },
  needs: { table: ['pagination', 'select'] },
};

export const SHEETS = { layers: ['css/base.css', 'css/components.css'], components: ['button', 'pagination', 'select', 'table'] };

export const auto = { ...readable, stylesheet: { components: 'auto' } };
