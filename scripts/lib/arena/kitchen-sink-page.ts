/* The kitchen-sink page every layer serves, built in one place so the two differ in exactly the
 * two lines they have to: what mounts the app, and what it is loaded from. A sibling of
 * playground-page.ts rather than a caller, because the two answer opposite questions: that page
 * offers a control that cycles the design extension, and this page IS one, spelled as the scope
 * class on <html>, which is what lets check:pixel-parity navigate to a URL and know what it is
 * looking at. The theme button is the one control drawn and is load-bearing: intro/theme.js
 * retries until it finds a .themebtn and applies nothing before it does, so a page without one
 * ignores ?theme=light and only one theme could be compared. The whole component barrel is
 * linked rather than the list a playground computes, since a page holding everything names every
 * sheet and an order computed twice is an order that can differ. */

import { BARREL } from '../../build/tailwind/build-tailwind.ts';
import { PHOSPHOR_WEIGHTS } from './playground-page.ts';
import { scopeClass } from './kitchen-sink-model.ts';

export const READY = 'data-arena-sink-ready';

export const MOUNT_ID = 'root';

export const PAGE_FILE = 'index.generated.html';

export function entryFile(extension: string, ext: string) {
  return `${extension}.sink.entry.generated.${ext}`;
}

export function themeDock() {
  return [
    '<div class="dtoggle-dock">',
    '<button class="dtoggle themebtn" type="button" data-light="0" aria-label="ArenaSwitch theme">'
    + '<span class="tlabel">Dark</span><span class="knob"></span></button>',
    '</div>',
  ].join('\n');
}

export function kitchenSinkPage({ extension, up, banner, mount, head = '', script }: {
  extension: string; up: string; banner: string; mount: string; head?: string; script: string;
}) {
  const styles = [
    `<link rel="stylesheet" href="${up}intro/styles.css">`,
    `<link rel="stylesheet" href="${up}intro/toggle.css">`,
    `<link rel="stylesheet" href="${up}intro/kitchen-sink.css">`,
    `<link rel="stylesheet" href="${up}${BARREL}">`,
    ...PHOSPHOR_WEIGHTS.map(
      (weight) => `<link rel="stylesheet" href="${up}node_modules/@phosphor-icons/web/src/${weight}/style.css">`,
    ),
  ];
  const scope = scopeClass(extension);

  return `${banner}<!doctype html>
<html lang="en"${scope ? ` class="${scope}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${extension} · Arena kitchen sink</title>
${styles.join('\n')}
${head}</head>
<body class="ks-page">
${themeDock()}
${mount}
<script src="${up}intro/theme.js"></script>
<script type="module" src="${script}"></script>
</body>
</html>
`;
}

export const READY_SIGNAL = `document.fonts.ready.then(() => requestAnimationFrame(
  () => requestAnimationFrame(() => document.documentElement.setAttribute('${READY}', ''))))`;

export const KS = {
  head: 'ks-head',
  voice: 'ks-voice',
  note: 'ks-note',
  section: 'ks-section',
  title: 'ks-title',
  row: 'ks-row',
  tile: 'ks-tile',
  label: 'ks-label',
  body: 'ks-body',
  stage: 'ks-stage',
} as const;

export function bodyClass(staged: boolean) {
  return staged ? KS.stage : KS.body;
}
