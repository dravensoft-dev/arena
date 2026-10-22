/* What a project's own root style plugin does under Increase Contrast, measured where it matters. The
 * text of a build can name the widening and still lose it to a later :root block, so this loads the
 * fixture's built theme sheet in Chromium, once per prefers-contrast value, and reads the computed
 * border width of a box drawn with --bw-surface: at the page root, inside .arena-light and inside the
 * scope class of a second plugin. A box rather than a card root, because a fixture imports only the
 * components its sources use. The page sits beside the sheet so its relative imports still resolve.
 * contrastProblems reads no file and launches nothing. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticServer } from './static-server.ts';
import { THEME_SHEET } from '../../generate/core/arena-cli/sheets.ts';
import { evaluate, type Cdp } from './cdp.ts';

export type ContrastReading = { contrast: 'no-preference' | 'more'; root: string; light: string; nested: string };

export const CONTRASTS: ContrastReading['contrast'][] = ['no-preference', 'more'];
export const ELEMENTS = ['root', 'light', 'nested'] as const;
export const PAGE = 'out';
export const BOX = 'border:var(--bw-surface) solid';

export function contrastProblems(layer: string, readings: ContrastReading[]) {
  const problems = [];
  const plain = readings.find((one) => one.contrast === 'no-preference');
  const more = readings.find((one) => one.contrast === 'more');
  if (!plain || !more) return [`${layer}: the contrast reading is missing the ${plain ? 'more' : 'no-preference'} page`];
  for (const element of ELEMENTS) {
    if (!(parseFloat(more[element]) > parseFloat(plain[element]))) {
      problems.push(`${layer}: the box at the ${element} element measures ${more[element]} under `
        + `prefers-contrast: more and ${plain[element]} under no-preference, so Increase Contrast widens `
        + 'no boundary there');
    }
  }
  return problems;
}

export function pageFor(css: string, packageName: string, scope: string) {
  return {
    css: css
      .replaceAll(`@import '${packageName}/`, `@import '/node_modules/${packageName}/`)
      .replace(/@import url\('https:[^']*'\);\n?/g, ''),
    html: '<!doctype html><html><head><link rel="stylesheet" href="entry.css"></head><body>\n'
      + `<div id="root" style="${BOX}">root</div>\n`
      + `<div class="arena-light"><div id="light" style="${BOX}">light</div></div>\n`
      + `<div class="arena-${scope}"><div id="nested" style="${BOX}">nested</div></div>\n`
      + '</body></html>\n',
  };
}

export async function readContrast(dir: string, packageName: string, cdp: Cdp, scope: string) {
  const { css, html } = pageFor(readFileSync(join(dir, PAGE, THEME_SHEET), 'utf8'), packageName, scope);
  mkdirSync(join(dir, PAGE), { recursive: true });
  writeFileSync(join(dir, PAGE, 'entry.css'), css);
  writeFileSync(join(dir, PAGE, 'index.html'), html);
  const server = await startStaticServer(dir);
  const readings: ContrastReading[] = [];
  try {
    for (const contrast of CONTRASTS) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      try {
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        await cdp.send('Page.enable', {}, sessionId);
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: contrast }] }, sessionId);
        let off = () => {};
        const loaded = new Promise<void>((done) => {
          off = cdp.on((message) => {
            if (message.method === 'Page.loadEventFired' && message.sessionId === sessionId) done();
          });
        });
        await cdp.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/${PAGE}/index.html` }, sessionId);
        await loaded;
        off();
        const widths = await evaluate(cdp, `(() => Object.fromEntries(${JSON.stringify(ELEMENTS)}.map((id) =>
          [id, getComputedStyle(document.getElementById(id)).borderTopWidth])))()`, sessionId);
        readings.push({ contrast, ...widths });
      } finally {
        await cdp.send('Target.closeTarget', { targetId });
      }
    }
  } finally {
    await server.close();
  }
  return readings;
}
