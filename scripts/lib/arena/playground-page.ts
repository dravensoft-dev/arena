/* The demo page every layer serves, built in one place so the two differ in exactly the two
 * lines they have to: what mounts the app, and what the app is loaded from. A page authored
 * per layer would drift in its stylesheet list or its toggle markup, and a difference in the
 * frame reads as a difference in the component, which is the one thing these pages must never
 * do. It lives under scripts/ because a cross-layer emitter is outside what
 * check:layer-independence scopes, being the mechanism that keeps the layers comparable. */

import { HAND_DRAWN, categoryOf, manifestFor } from '../tailwind/manifest-surfaces.ts';
import { PREFLIGHT, sheetPath } from '../../build/tailwind/build-tailwind.ts';
import { composedBy, composedGraph } from './composed-surfaces.ts';
import { kebab } from '../../utils/case.ts';
import type { PlaygroundModel } from './playground-model.ts';

export const UP = '../../../../../';

export const PHOSPHOR_WEIGHTS = ['bold', 'fill', 'duotone'];

export function surfacesDrawn(model: Pick<PlaygroundModel, 'component' | 'uses'>,
  graph = composedGraph(), root?: string) {
  const instantiated = [model.component, ...model.uses];
  const surfaces = new Set<string>();
  for (const name of [...instantiated, ...composedBy(instantiated, graph)]) {
    const manifest = manifestFor(name, root);
    if (manifest) { surfaces.add(manifest); continue; }
    if (!HAND_DRAWN.has(name)) {
      throw new Error(`playground-page: ${model.component}'s page draws ${name}, and no manifest describes `
        + 'its surface, so the page would link no stylesheet for it and render it unstyled, silently');
    }
  }
  return [...surfaces].sort();
}

export function sheetLinks(model: Pick<PlaygroundModel, 'component' | 'uses'>,
  graph = composedGraph(), root?: string) {
  const link = (rel: string) => `<link rel="stylesheet" href="${UP}${rel}">`;
  return [
    link(PREFLIGHT),
    ...surfacesDrawn(model, graph, root).map((name) => link(sheetPath(
      `frameworks/tailwind/components/${categoryOf(name, root)}/${kebab(name)}/${name}.manifest.json`,
    ))),
  ].join('\n');
}

export function toggleDock() {
  return [
    '<div class="dtoggle-dock">',
    '<button class="dtoggle themebtn" type="button" data-light="0" aria-label="ArenaSwitch theme">'
    + '<span class="tlabel">Dark</span><span class="knob"></span></button>',
    '<button class="dtoggle" type="button" id="density" data-compact="0" aria-label="ArenaSwitch density">'
    + '<span class="tlabel">Comfortable</span><span class="knob"></span></button>',
    '<button class="dtoggle" type="button" id="extension" data-extension="none" aria-label="Design extension">'
    + '<span class="tlabel">No extension</span><span class="cycle"></span></button>',
    '</div>',
  ].join('\n');
}

export function playgroundPage({ component, banner, mount, head = '', script }: {
  component: string; banner: string; mount: string; head?: string; script: string;
}) {
  const styles = [
    `<link rel="stylesheet" href="${UP}intro/styles.css">`,
    `<link rel="stylesheet" href="${UP}intro/toggle.css">`,
    `<link rel="stylesheet" href="${UP}intro/playground.css">`,
    ...PHOSPHOR_WEIGHTS.map(
      (weight) => `<link rel="stylesheet" href="${UP}node_modules/@phosphor-icons/web/src/${weight}/style.css">`,
    ),
  ];

  return `${banner}<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${component} · Arena playground</title>
${styles.join('\n')}
${head}</head>
<body class="pg-page">
${toggleDock()}
${mount}
<script src="${UP}intro/theme.js"></script>
<script src="${UP}intro/density.js"></script>
<script src="${UP}intro/extension.js"></script>
<script type="module" src="${script}"></script>
</body>
</html>
`;
}
