/* What a project's own root style plugin does under Increase Contrast, measured where it matters. The
 * text of a build can name the widening and still lose it to a later :root block, so this loads the
 * fixture's built theme sheet and the package's own card sheet in Chromium, once per prefers-contrast
 * value, and reads the computed border width of an .arena-card__root: at the page root, inside
 * .arena-light and inside the scope class of a second plugin. The card sheet is linked by hand because
 * a fixture imports only the components its sources use. The page sits beside the theme sheet so its
 * relative imports still resolve. contrastProblems reads no file and launches nothing. */


import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticServer } from './static-server.ts';
import { THEME_SHEET } from '../../generate/core/arena-cli/sheets.ts';
import { evaluate, type Cdp } from './cdp.ts';
import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline } from './deadline.ts';

export type ContrastReading = { contrast: 'no-preference' | 'more'; root: string; light: string; nested: string };

export const CONTRASTS: ContrastReading['contrast'][] = ['no-preference', 'more'];
export const ELEMENTS = ['root', 'light', 'nested'] as const;
export const PAGE = 'out';
export const CARD = 'css/components/arena-card.css';

export const LOADED = deadline('consumer-contrast:load', 30_000,
  'a cold browser reads the token stylesheets the theme imports from disk before the load event fires');

export function contrastProblems(layer: string, readings: ContrastReading[]) {
  const problems = [];
  const plain = readings.find((one) => one.contrast === 'no-preference');
  const more = readings.find((one) => one.contrast === 'more');
  if (!plain || !more) return [`${layer}: the contrast reading is missing the ${plain ? 'more' : 'no-preference'} page`];
  for (const element of ELEMENTS) {
    if (!(parseFloat(more[element]) > parseFloat(plain[element]))) {
      problems.push(`${layer}: the card at the ${element} element measures ${more[element]} under `
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
    html: '<!doctype html><html><head><link rel="stylesheet" href="entry.css">\n'
      + `<link rel="stylesheet" href="/node_modules/${packageName}/${CARD}"></head><body>\n`
      + `<div id="root" class="arena-card__root">root</div>\n`
      + `<div class="arena-light"><div id="light" class="arena-card__root">light</div></div>\n`
      + `<div class="arena-${scope}"><div id="nested" class="arena-card__root">nested</div></div>\n`
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
      let off = () => {};
      try {
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        await cdp.send('Page.enable', {}, sessionId);
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: contrast }] }, sessionId);
        const loaded = new Promise<void>((done) => {
          off = cdp.on((message) => {
            if (message.method === 'Page.loadEventFired' && message.sessionId === sessionId) done();
          });
        });
        const url = `http://127.0.0.1:${server.port}/${PAGE}/index.html`;
        await cdp.send('Page.navigate', { url }, sessionId);
        await withTimeout(loaded, LOADED.ms, `${url}: the load event never fired under prefers-contrast: `
          + `${contrast} within ${LOADED.ms}ms, which is that size because ${LOADED.why}`);
        const widths = await evaluate(cdp, `(() => Object.fromEntries(${JSON.stringify(ELEMENTS)}.map((id) =>
          [id, getComputedStyle(document.getElementById(id)).borderTopWidth])))()`, sessionId);
        readings.push({ contrast, ...widths });
      } finally {
        off();
        await cdp.send('Target.closeTarget', { targetId });
      }
    }
  } finally {
    await server.close();
  }
  return readings;
}
