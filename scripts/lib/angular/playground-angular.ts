/* Emits an Angular demo entry from the layer-neutral model. Two rules earn their keep here.
 * A literal inside a fixture node becomes a typed class field rather than template text,
 * because inlining it would mean escaping both the template's quotes and the surrounding
 * backtick's ${; and a named slot is wrapped in @if, because a host querying contentChild
 * counts an empty marked element as filled, so blanking the text would render a header in
 * this layer and none in the other. A marker directive is read from the layer's own source
 * rather than listed here, so a new one joins without an edit. */

import { playgroundPage, sheetLinks } from '../arena/playground-page.ts';
import { kebab } from '../../utils/case.ts';
import { placeOf, SUBJECT } from '../arena/playground-model.ts';
import { captured } from '../../utils/captures.ts';
import type { MemberSpec } from '../arena/contract-shapes.ts';
import type { FixtureNode, Knob, Place, Places, PlaygroundEvent, PlaygroundModel }
  from '../arena/playground-model.ts';

type Field = { name: string; type: string; value: unknown; member: string; node: FixtureNode };

type FieldRef = Pick<Field, 'name' | 'member' | 'node'>;

type Markers = Map<string, string>;

export const PRIMITIVES = new Set(['string', 'number', 'boolean']);

export const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

export const VALIDATOR_TABLE = `
const VALIDATORS: Record<string, (value: string) => string> = {
  nonEmpty: (value: string) => (value.trim().length === 0 ? 'Required.' : ''),
  alwaysInvalid: () => 'Never valid, on purpose.',
};

function validatorFor(name: string | undefined): ((value: string) => string) | undefined {
  return name === undefined ? undefined : VALIDATORS[name];
}
`;

export const MARKERS_SOURCE = 'frameworks/angular/ProjectionMarkers.ts';

export function markerNames(source: string): Markers {
  const found: Markers = new Map();
  for (const m of source.matchAll(/selector:\s*'\[(\w+)\]'[^}]*}\)\s*export class (\w+)/g)) {
    found.set(captured(m), captured(m, 2));
  }
  return found;
}

export function selector(name: string) {
  return kebab(name);
}

export function typeExpr(knob: Knob) {
  if (knob.form === 'slot') return knob.control === 'slotText' ? 'string' : 'boolean';
  if (knob.form === 'array') return `${knob.type}[]`;
  if (knob.form === 'functionInput') return 'string';
  return knob.type;
}

export function contractTypes(model: PlaygroundModel, fields: Field[]) {
  const names = new Set();
  for (const knob of model.knobs) {
    if (!knob.type) continue;
    if (knob.form === 'enum' || knob.form === 'object') names.add(knob.type);
    if (knob.form === 'array' && !PRIMITIVES.has(knob.type)) names.add(knob.type);
  }
  for (const field of fields) if (field.type && !PRIMITIVES.has(field.type.replace('[]', ''))) {
    names.add(field.type.replace('[]', ''));
  }
  return [...names].sort();
}

export function importPath(place: Place) {
  return `../../${place.category}/${place.dir}/${place.name}`;
}

export function fieldTypeFor(spec: MemberSpec): string {
  if (spec.form === 'array') return `${spec.of}[]`;
  if (spec.form === 'primitive' || spec.form === 'enum' || spec.form === 'object') return spec.type ?? 'unknown';
  return 'unknown';
}

export function staticAttribute(value: unknown) {
  return typeof value === 'string';
}

export function attributeText(value: unknown) {
  return escapeText(String(value)).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function collectFields(node: FixtureNode | string | null, contracts: Map<string, any>,
  into: Field[], prefix: string): Field[] {
  if (node === '$subject' || node === null || typeof node !== 'object') return into;
  if (typeof node.component === 'string') {
    const api = contracts.get(node.component)?.api ?? {};
    for (const [member, value] of Object.entries(node.members ?? {}) as [string, any][]) {
      if (staticAttribute(value)) continue;
      const name = `${prefix}${node.component}${member.slice(0, 1).toUpperCase()}${member.slice(1)}${into.length}`;
      into.push({ name, type: fieldTypeFor(api[member] ?? {}), value, member, node });
    }
    for (const list of Object.values(node.slots ?? {}) as any[][]) {
      for (const one of list) collectFields(one, contracts, into, prefix);
    }
  }
  return into;
}

export function fieldFor(fields: FieldRef[],
  node: FixtureNode, member: string) {
  return fields.find((one) => one.node === node && one.member === member)?.name;
}

export function nodeAttributes(node: FixtureNode, fields: FieldRef[]) {
  return (Object.entries(node.members ?? {}) as [string, any][])
    .map(([member, value]) => (staticAttribute(value)
      ? ` ${member}="${attributeText(value)}"`
      : ` [${member}]="${fieldFor(fields, node, member)}"`))
    .join('');
}

export function renderNode(node: FixtureNode, places: Places, fields: FieldRef[],
  markers: Markers, depth: number, imports: Set<string>): string {
  const pad = '  '.repeat(depth);
  if (typeof node.text === 'string' && !node.element) return `${pad}${escapeText(node.text)}`;
  if (typeof node.element === 'string' || typeof node.text === 'string') {
    const tag = node.element ?? 'span';
    const attrs = Object.entries(node.attrs ?? {}).map(([name, value]) => ` ${name}="${String(value)}"`).join('');
    if (VOID_ELEMENTS.has(tag)) return `${pad}<${tag}${attrs} />`;
    if (node.text === undefined) return `${pad}<${tag}${attrs}></${tag}>`;
    return `${pad}<${tag}${attrs}>${escapeText(node.text)}</${tag}>`;
  }

  const place = placeOf(places, node.component);
  const tag = selector(place.name);
  imports.add(place.name);
  const slots = node.slots ?? {};
  const attrs = nodeAttributes(node, fields);
  const children = [];
  for (const [name, list] of Object.entries(slots) as [string, any[]][]) {
    for (const one of list) {
      const marked = name === 'content' ? '' : ` ${name}`;
      const marker = markers.get(name);
      if (marked && marker) imports.add(marker);
      children.push(projected(one, places, fields, markers, depth + 1, imports, marked));
    }
  }
  if (children.length === 0) return `${pad}<${tag}${attrs}></${tag}>`;
  return `${pad}<${tag}${attrs}>\n${children.join('\n')}\n${pad}</${tag}>`;
}

export function projected(node: FixtureNode, places: Places, fields: FieldRef[],
  markers: Markers, depth: number, imports: Set<string>, marked: string) {
  const pad = '  '.repeat(depth);
  if (!marked) return renderNode(node, places, fields, markers, depth, imports);
  if (typeof node.text === 'string' && !node.element) return `${pad}<span${marked}>${escapeText(node.text)}</span>`;
  const rendered = renderNode(node, places, fields, markers, depth, imports).trimStart();
  return `${pad}${rendered.replace(/^(<[\w-]+)/, `$1${marked}`)}`;
}

export function escapeText(text: string) {
  return text.replace(/\{\{/g, '{{ "{{" }}').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

export function slotBlock(knob: Knob, places: Places, fields: FieldRef[],
  markers: Markers, depth: number, imports: Set<string>, marked: string) {
  const pad = '  '.repeat(depth);
  if (knob.control === 'slotText') {
    const body = marked ? `<span${marked}>{{ k().${knob.member} }}</span>` : `{{ k().${knob.member} }}`;
    return `${pad}@if (k().${knob.member} !== undefined) {\n${pad}  ${body}\n${pad}}`;
  }
  const nodes = ((knob.nodes ?? []) as FixtureNode[])
    .map((one) => projected(one, places, fields, markers, depth + 1, imports, marked));
  if (!marked) return `${pad}@if (k().${knob.member}) {\n${nodes.join('\n')}\n${pad}}`;
  return nodes.map((one: string) => `${pad}@if (k().${knob.member}) {\n${one}\n${pad}}`).join('\n');
}

export function renderSubject(model: PlaygroundModel, places: Places,
  fields: FieldRef[],
  markers: Markers, depth: number, imports: Set<string>) {
  const pad = '  '.repeat(depth);
  const inner = `${pad}  `;
  const tag = selector(model.component);
  imports.add(model.component);

  const attrs = model.knobs
    .filter((knob) => knob.form !== 'slot')
    .map((knob) => (knob.form === 'functionInput'
      ? `\n${inner}[${knob.member}]="validatorFor(k().${knob.member})"`
      : `\n${inner}[${knob.member}]="k().${knob.member}"`))
    .concat(model.events.map((event) => (event.payload
      ? `\n${inner}(${event.name})="play.fire('${event.name}', $event)"`
      : `\n${inner}(${event.name})="play.fire('${event.name}')"`)))
    .join('');

  const slots = model.knobs.filter((knob) => knob.form === 'slot');
  if (slots.length === 0) return `${pad}<${tag}${attrs}></${tag}>`;

  const blocks = slots.map((knob) => {
    const marked = knob.member === 'content' ? '' : ` ${knob.member}`;
    const draws = knob.control === 'slotText' || (knob.nodes ?? []).length > 0;
    const marker = markers.get(knob.member);
    if (marked && draws && marker) imports.add(marker);
    return slotBlock(knob, places, fields, markers, depth + 1, imports, marked);
  });
  return `${pad}<${tag}${attrs}>\n${blocks.join('\n')}\n${pad}</${tag}>`;
}

export function holdsSubject(node: FixtureNode | string | null): boolean {
  if (node === '$subject') return true;
  if (node === null || typeof node !== 'object') return false;
  return (Object.values(node.slots ?? {}) as any[][]).some((list) => list.some((one) => holdsSubject(one)));
}

export function renderTree(model: PlaygroundModel, places: Places, fields: FieldRef[],
  markers: Markers, depth: number, imports: Set<string>) {
  if (model.host === null) return renderSubject(model, places, fields, markers, depth, imports);
  const wrap = (node: FixtureNode | typeof SUBJECT, level: number): string => {
    const pad = '  '.repeat(level);
    if (node === '$subject') return renderSubject(model, places, fields, markers, level, imports);
    if (!holdsSubject(node)) return renderNode(node, places, fields, markers, level, imports);
    const place = placeOf(places, node.component);
    const tag = selector(place.name);
    imports.add(place.name);
    const attrs = nodeAttributes(node, fields);
    const children = [];
    for (const [name, list] of Object.entries(node.slots ?? {}) as [string, any[]][]) {
      for (const one of list) {
        const marked = name === 'content' ? '' : ` ${name}`;
        const marker = markers.get(name);
        if (marked && marker) imports.add(marker);
        children.push(holdsSubject(one)
          ? wrap(one, level + 1)
          : projected(one, places, fields, markers, level + 1, imports, marked));
      }
    }
    if (children.length === 0) return `${pad}<${tag}${attrs}></${tag}>`;
    return `${pad}<${tag}${attrs}>\n${children.join('\n')}\n${pad}</${tag}>`;
  };
  return wrap(model.host, depth);
}

export function knobsInterface(model: { knobs: Knob[] }) {
  const rows = model.knobs.map((knob) => {
    const optional = knob.bind === 'optional' ? '?' : '';
    return `  ${knob.member}${optional}: ${typeExpr(knob)};`;
  });
  return `interface Knobs {\n${rows.join('\n')}\n}`;
}

export function validatorTable(model: { knobs: Knob[] }) {
  return model.knobs.some((knob) => knob.form === 'functionInput') ? VALIDATOR_TABLE : '';
}

export function angularEntry(model: PlaygroundModel, places: Places,
  contracts: Map<string, any>, markersSource: string, banner: string) {
  const markers = markerNames(markersSource);
  const fields: Field[] = [];
  collectFields(model.host, contracts, fields, 'host');
  for (const knob of model.knobs) {
    for (const node of knob.nodes ?? []) collectFields(node, contracts, fields, 'slot');
  }

  const imports = new Set<string>();
  const template = renderTree(model, places, fields, markers, 3, imports);
  const used = [...imports].sort();
  const types = contractTypes(model, fields);

  const componentImports = [...new Set(used)]
    .filter((name) => places.has(name))
    .map((name) => {
      const place = placeOf(places, name);
      return `import { ${name} } from '${place.self ? `./${name}` : importPath(place)}';`;
    });
  const markerImports = used.filter((name) => !places.has(name));

  const fieldRows = fields.map(
    (field) => `  protected readonly ${field.name}: ${field.type} = ${JSON.stringify(field.value)};`,
  );

  return `${banner}import * as angularJitCompiler from '@angular/compiler';
import { ChangeDetectionStrategy, Component, computed, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Playground } from '../../../playground/Playground';
import { PlaygroundStore } from '../../../playground/PlaygroundState';
import type { KnobModel } from '../../../playground/PlaygroundCodec.generated';
${types.length > 0 ? `import type { ${types.join(', ')} } from '../../../Api.generated';\n` : ''}${
  markerImports.length > 0 ? `import { ${markerImports.join(', ')} } from '../../../ProjectionMarkers';\n` : ''
}${componentImports.join('\n')}

const MODEL: KnobModel = ${JSON.stringify(model, null, 2)};

${knobsInterface(model)}
${validatorTable(model)}
@Component({
  selector: 'demo-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Playground, ${used.join(', ')}],
  template: \`
    <demo-playground [play]="play">
${template}
    </demo-playground>
  \`,
})
class Demo {
  protected readonly play = new PlaygroundStore(MODEL);
  protected readonly k = computed(() => this.play.values() as unknown as Knobs);
${model.knobs.some((knob) => knob.form === 'functionInput') ? '  protected readonly validatorFor = validatorFor;\n' : ''}
${fieldRows.length > 0 ? `${fieldRows.join('\n')}\n` : ''}}

/* @angular/* ships partially compiled and nothing here runs the Angular linker, so an injectable
 * like PlatformLocation resolves through the JIT fallback and the compiler has to be in this
 * bundle. It is READ rather than imported for its side effect alone: the package declares its
 * side effects as the one path "./fesm2022/compiler.mjs", which a bundler holding the resolved
 * file in the host spelling does not match on Windows, so it drops the bare import as dead. The
 * page then loads its entry, throws at bootstrap and renders an empty document. */
Reflect.set(globalThis, 'arenaAngularJitCompiler', angularJitCompiler);

bootstrapApplication(Demo, { providers: [provideZonelessChangeDetection()] });
`;
}

export function angularPage(model: PlaygroundModel, banner: string) {
  return playgroundPage({
    component: model.component,
    banner,
    head: `${sheetLinks(model)}\n`,
    mount: '<demo-root></demo-root>',
    script: `../../../build/demo/js/${model.component}.demo.entry.generated.js`,
  });
}
