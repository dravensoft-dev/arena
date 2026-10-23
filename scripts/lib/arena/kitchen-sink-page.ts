/* The kitchen-sink page every layer serves, built in one place so the two differ in exactly the two
 * lines they have to: what mounts the app, and what it is loaded from. A sibling of playground-page.ts
 * rather than a caller: it carries a scope class on <html> naming the appearance, which lets
 * check:pixel-parity know what it is looking at. The theme button is load-bearing: intro/theme.js
 * applies nothing without a .themebtn. The whole barrel is linked, an order computed twice being one
 * that can differ. Ready re-asks after the frames, since document.fonts.ready is a snapshot taken
 * before mounting starts the rest, and waits for every svg use to have a box, bounded by SPRITE. */

import { BARREL } from '../../build/tailwind/build-tailwind.ts';
import { deadline } from './deadline.ts';
import { PHOSPHOR_WEIGHTS } from './playground-page.ts';
import { scopeClass } from './kitchen-sink-model.ts';

export const READY = 'data-arena-sink-ready';

export const MOUNT_ID = 'root';

export const PAGE_FILE = 'index.generated.html';

export function entryFile(sink: string, ext: string) {
  return `${sink}.sink.entry.generated.${ext}`;
}

export function themeDock() {
  return [
    '<div class="dtoggle-dock">',
    '<button class="dtoggle themebtn" type="button" data-light="0" aria-label="ArenaSwitch theme">'
    + '<span class="tlabel">Dark</span><span class="knob"></span></button>',
    '</div>',
  ].join('\n');
}

export function kitchenSinkPage({ sink, up, banner, mount, head = '', script }: {
  sink: string; up: string; banner: string; mount: string; head?: string; script: string;
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
  const scope = scopeClass(sink);

  return `${banner}<!doctype html>
<html lang="en"${scope ? ` class="${scope}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${sink} · Arena kitchen sink</title>
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

export const SPRITE = deadline('kitchen-sink:sprite', 10_000,
  'the sprite is one local file the static server answers from disk, so a use still boxless after ten '
  + 'seconds names a symbol the file does not hold, and the page must report that, not wait on it');

export const READY_SIGNAL = `(async () => {
  const boxed = () => {
    for (const use of document.querySelectorAll('svg use')) {
      try {
        const box = Reflect.get(use, 'getBBox').call(use);
        if (!(box.width > 0 && box.height > 0)) return false;
      } catch { return false; }
    }
    return true;
  };
  const spriteBy = Date.now() + ${SPRITE.ms};
  for (;;) {
    await document.fonts.ready;
    await new Promise((frame) => requestAnimationFrame(() => requestAnimationFrame(frame)));
    if (document.fonts.status !== 'loaded') continue;
    if (boxed()) break;
    if (Date.now() > spriteBy) return;
  }
  document.documentElement.setAttribute('${READY}', '');
})()`;

export const KS = {
  head: 'ks-head',
  sink: 'ks-sink',
  note: 'ks-note',
  section: 'ks-section',
  title: 'ks-title',
  row: 'ks-row',
  tile: 'ks-tile',
  label: 'ks-label',
  body: 'ks-body',
  stage: 'ks-stage',
} as const;

export function varsStyle(vars: Record<string, string> | undefined) {
  return Object.entries(vars ?? {}).map(([name, value]) => `${name}: ${value}`).join('; ');
}

export function bodyClass(staged: boolean) {
  return staged ? KS.stage : KS.body;
}
