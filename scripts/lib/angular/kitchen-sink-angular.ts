/* Emits the Angular kitchen-sink entry from the layer-neutral model, through the same
 * renderNode and collectFields the playground pages go through, for the reason the React half
 * gives: a fixture that meant one thing here and another on a playground would be a difference
 * in this file wearing a component's face. Fields are collected into one array for the whole
 * page rather than one per instance, because collectFields names a field from the array's own
 * length and two arrays would hand two instances the same name.
 *
 * The compiler is read into globalThis for the reason the playground entry states: @angular/*
 * ships partially compiled, nothing here runs the linker, and a bundler that drops the bare
 * import as dead leaves the page throwing at bootstrap and rendering an empty document. */

import { kitchenSinkPage, KS, bodyClass, READY_SIGNAL, entryFile } from '../arena/kitchen-sink-page.ts';
import { UP } from '../react/kitchen-sink-react.ts';
import { renderNode, collectFields, markerNames, PRIMITIVES, MARKERS_SOURCE } from './playground-angular.ts';
import { placeOf } from '../arena/playground-model.ts';
import type { Place, Places } from '../arena/playground-model.ts';
import type { SinkModel } from '../arena/kitchen-sink-model.ts';

export { MARKERS_SOURCE };

export const MOUNT = 'sink-root';

export function importPath(place: Place) {
  return `../../components/${place.category}/${place.dir}/${place.name}`;
}

export function fieldTypes(fields: { type: string }[]) {
  const names = new Set<string>();
  for (const field of fields) {
    const bare = (field.type ?? '').replace('[]', '');
    if (bare && bare !== 'unknown' && !PRIMITIVES.has(bare)) names.add(bare);
  }
  return [...names].sort();
}

export function escapeTitle(text: string) {
  return text.replace(/\{\{/g, '{{ "{{" }}').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

export function angularSinkEntry(model: SinkModel, places: Places,
  contracts: Map<string, any>, markersSource: string, banner: string) {
  const markers = markerNames(markersSource);
  const fields: any[] = [];
  for (const one of model.sections)
    for (const item of one.items) collectFields(item.node, contracts, fields, 'sink');

  const imports = new Set<string>();
  const sections = model.sections.map((one) => {
    const tiles = one.items.map((item) => `        <div class="${KS.tile}">
          <span class="${KS.label}">${item.component}</span>
          <div class="${bodyClass(item.staged)}">
${renderNode(item.node, places, fields, markers, 6, imports)}
          </div>
        </div>`).join('\n');
    return `      <section class="${KS.section}">
        <h2 class="${KS.title}">${escapeTitle(one.title)}</h2>
        <div class="${KS.row}">
${tiles}
        </div>
      </section>`;
  }).join('\n');

  const used = [...imports].sort();
  const componentImports = used
    .filter((name) => places.has(name))
    .map((name) => `import { ${name} } from '${importPath(placeOf(places, name))}';`);
  const markerImports = used.filter((name) => !places.has(name));

  const fieldRows = fields.map(
    (field) => `  protected readonly ${field.name}: ${field.type} = ${JSON.stringify(field.value)};`,
  );

  const header = `      <header class="${KS.head}">
        <h1 class="${KS.sink}">${model.extension}</h1>${model.note ? `
        <p class="${KS.note}">${escapeTitle(model.note)}</p>` : ''}
      </header>`;

  const types = fieldTypes(fields);

  return `${banner}import * as angularJitCompiler from '@angular/compiler';
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
${types.length > 0 ? `import type { ${types.join(', ')} } from '../../Api.generated';\n` : ''}${
  markerImports.length > 0 ? `import { ${markerImports.join(', ')} } from '../../ProjectionMarkers';\n` : ''
}${componentImports.join('\n')}

@Component({
  selector: '${MOUNT}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [${used.join(', ')}],
  template: \`
${header}
${sections}
  \`,
})
class Sink {
${fieldRows.length > 0 ? `${fieldRows.join('\n')}\n` : ''}}

Reflect.set(globalThis, 'arenaAngularJitCompiler', angularJitCompiler);

bootstrapApplication(Sink, { providers: [provideZonelessChangeDetection()] })
  .then(() => ${READY_SIGNAL});
`;
}

export function angularSinkPage(model: SinkModel, banner: string) {
  return kitchenSinkPage({
    extension: model.extension,
    up: UP,
    banner,
    mount: `<${MOUNT}></${MOUNT}>`,
    script: `${UP}frameworks/angular/build/demo/js/${entryFile(model.extension, 'js')}`,
  });
}
