/* Emits the React kitchen-sink entry from the layer-neutral model. Every instance is rendered by
 * playground-react's renderNode, the same function the playground pages go through, so a fixture
 * cannot mean one thing on one page and something else on the other: a difference between a
 * component here and the same component on its playground would be a difference in this file
 * rather than in the component, and it would be invisible. The furniture around each instance is
 * plain markup on the shared class names, since a frame built from Arena would change appearance
 * with the change being examined. */

import { kitchenSinkPage, KS, bodyClass, MOUNT_ID, READY_SIGNAL, entryFile } from '../arena/kitchen-sink-page.ts';
import { UP as COMPONENT_UP } from '../arena/playground-page.ts';
import { renderNode } from './playground-react.ts';
import { placeOf } from '../arena/playground-model.ts';
import type { Place, Places } from '../arena/playground-model.ts';
import type { SinkModel } from '../arena/kitchen-sink-model.ts';

export const UP = COMPONENT_UP.slice('../'.length);

export function importPath(place: Place) {
  return `../../components/${place.category}/${place.dir}/${place.name}.tsx`;
}

export function tile(item: SinkModel['sections'][number]['items'][number], places: Places, depth: number) {
  const pad = '  '.repeat(depth);
  return `${pad}<div className="${KS.tile}">\n`
    + `${pad}  <span className="${KS.label}">${item.component}</span>\n`
    + `${pad}  <div className="${bodyClass(item.staged)}">\n`
    + `${renderNode(item.node, places, depth + 2)}\n`
    + `${pad}  </div>\n`
    + `${pad}</div>`;
}

export function section(one: SinkModel['sections'][number], places: Places, depth: number) {
  const pad = '  '.repeat(depth);
  return `${pad}<section className="${KS.section}">\n`
    + `${pad}  <h2 className="${KS.title}">${one.title}</h2>\n`
    + `${pad}  <div className="${KS.row}">\n`
    + `${one.items.map((item) => tile(item, places, depth + 2)).join('\n')}\n`
    + `${pad}  </div>\n`
    + `${pad}</section>`;
}

export function header(model: SinkModel, depth: number) {
  const pad = '  '.repeat(depth);
  return `${pad}<header className="${KS.head}">\n`
    + `${pad}  <h1 className="${KS.voice}">${model.extension}</h1>\n`
    + (model.note ? `${pad}  <p className="${KS.note}">{${JSON.stringify(model.note)}}</p>\n` : '')
    + `${pad}</header>`;
}

export function reactSinkEntry(model: SinkModel, places: Places, banner: string) {
  const imports = model.uses.map((name) => {
    const place = placeOf(places, name);
    return `import { ${name} } from '${importPath(place)}';`;
  });

  return `${banner}
import React from 'react';
import { createRoot } from 'react-dom/client';
${imports.join('\n')}

function Sink() {
  return (
    <React.Fragment>
${header(model, 3)}
${model.sections.map((one) => section(one, places, 3)).join('\n')}
    </React.Fragment>
  );
}

createRoot(document.getElementById('${MOUNT_ID}')!).render(<Sink />);
${READY_SIGNAL};
`;
}

export function reactSinkPage(model: SinkModel, banner: string) {
  const importmap = {
    imports: {
      react: `${UP}frameworks/react/vendor/React.generated.js`,
      'react/jsx-runtime': `${UP}frameworks/react/vendor/ReactJsxRuntime.generated.js`,
      'react-dom/client': `${UP}frameworks/react/vendor/ReactDomClient.generated.js`,
    },
  };
  return kitchenSinkPage({
    extension: model.extension,
    up: UP,
    banner,
    head: `<script type="importmap">\n${JSON.stringify(importmap, null, 2)}\n</script>\n`,
    mount: `<div id="${MOUNT_ID}"></div>`,
    script: entryFile(model.extension, 'js'),
  });
}
