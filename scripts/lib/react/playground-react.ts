/* Emits a React demo entry from the layer-neutral model. Every member is written out as its
 * own attribute rather than spread, so the two layers' entries read as translations of each
 * other; Angular has no spread and this side has no reason to diverge from it. A literal
 * reaches JSX through JSON.stringify inside an expression container, which is one escaping
 * rule for every form rather than one per type. renderNode spells a bare text node for
 * CHILDREN position, where a container is what carries a string, and expressionNode is the
 * same node for EXPRESSION position, where the caller has already opened one: the two list
 * builders place their items there, so spelling it the first way nests a container in a
 * container and the file stops parsing. */

import { playgroundPage, sheetLinks, UP } from '../arena/playground-page.ts';
import { bindingName } from '../arena/api-surface.ts';
import { placeOf, SUBJECT } from '../arena/playground-model.ts';
import type { FixtureChild, FixtureNode, Knob, Place, Places, PlaygroundEvent, PlaygroundModel }
  from '../arena/playground-model.ts';

export const PRIMITIVES = new Set(['string', 'number', 'boolean']);

export const VALIDATOR_TABLE = `
const VALIDATORS: Record<string, (value: string) => string> = {
  nonEmpty: (value: string) => (value.trim().length === 0 ? 'Required.' : ''),
  alwaysInvalid: () => 'Never valid, on purpose.',
};

function validatorFor(name: string | undefined): ((value: string) => string) | undefined {
  return name === undefined ? undefined : VALIDATORS[name];
}
`;

export function typeExpr(knob: Knob) {
  if (knob.form === 'slot') return knob.control === 'slotText' ? 'string' : 'boolean';
  if (knob.form === 'array') return `${knob.type}[]`;
  if (knob.form === 'functionInput') return 'string';
  return knob.type;
}

export function contractTypes(model: { knobs: Knob[] }) {
  const names = new Set();
  for (const knob of model.knobs) {
    if (!knob.type) continue;
    if (knob.form === 'enum' || knob.form === 'object') names.add(knob.type);
    if (knob.form === 'array' && !PRIMITIVES.has(knob.type)) names.add(knob.type);
  }
  return [...names].sort();
}

export function importPath(place: Place) {
  return `../../${place.category}/${place.dir}/${place.name}.tsx`;
}

export function literal(value: unknown) {
  return `{${JSON.stringify(value)}}`;
}

export function attributes(members: Record<string, any> | undefined, indent: string) {
  return (Object.entries(members ?? {}) as [string, any][])
    .map(([name, value]) => `\n${indent}${name}=${literal(value)}`)
    .join('');
}

export function renderNode(node: FixtureNode, places: Places, depth: number): string {
  const pad = '  '.repeat(depth);
  if (typeof node.text === 'string' && !node.element) return `${pad}{${JSON.stringify(node.text)}}`;
  if (typeof node.element === 'string' || typeof node.text === 'string') {
    const tag = node.element ?? 'span';
    const attrs = attributes(node.attrs, `${pad}  `);
    if (node.text === undefined) return `${pad}<${tag}${attrs} />`;
    return `${pad}<${tag}${attrs}>{${JSON.stringify(node.text)}}</${tag}>`;
  }

  const place = placeOf(places, node.component);
  const slots = node.slots ?? {};
  const named = (Object.entries(slots) as [string, FixtureNode[]][])
    .filter(([name]) => name !== 'content');
  const attrs = attributes(node.members, `${pad}  `)
    + named.map(([name, list]) => `\n${pad}  ${name}={${inlineList(list, places, depth + 1)}}`).join('');
  const children = (slots.content ?? []) as FixtureNode[];
  if (children.length === 0) return `${pad}<${place.name}${attrs} />`;
  return `${pad}<${place.name}${attrs}>\n${children.map((one) => renderNode(one, places, depth + 1)).join('\n')}\n${pad}</${place.name}>`;
}

export function keyed(rendered: string, index: number) {
  return rendered.replace(/^(<[A-Za-z][\w.]*)/, `$1 key={${index}}`);
}

export function expressionNode(node: FixtureNode, places: Places, depth: number) {
  if (typeof node.text === 'string' && !node.element) return JSON.stringify(node.text);
  return renderNode(node, places, depth);
}

export function inlineList(list: FixtureNode[], places: Places, depth: number) {
  const rendered = list.map((one) => expressionNode(one, places, depth).trim());
  if (rendered.length === 1) return rendered[0];
  return `[${rendered.map((one, i) => keyed(one, i)).join(', ')}]`;
}

export function slotChildren(knob: Knob, places: Places, depth: number) {
  const pad = '  '.repeat(depth);
  if (knob.control === 'slotText') return `${pad}{k.${knob.member}}`;
  return `${pad}{k.${knob.member} ? ${listExpression(knob.nodes ?? [], places, depth)} : undefined}`;
}

export function listExpression(nodes: FixtureNode[], places: Places, depth: number) {
  const pad = '  '.repeat(depth);
  const rendered = nodes.map((one) => expressionNode(one, places, depth + 1));
  if (rendered.length === 1) return `(\n${rendered[0]}\n${pad})`;
  return `[\n${rendered.map((one, i) => keyed(one.trimStart(), i).split('\n').map((l, n) => (n === 0 ? `${pad}  ${l}` : l)).join('\n')).join(',\n')},\n${pad}]`;
}

export function slotAttribute(knob: Knob, places: Places, pad: string, depth: number) {
  if (knob.control === 'slotText') {
    return `\n${pad}${knob.member}={k.${knob.member} === undefined ? undefined : <React.Fragment>{k.${knob.member}}</React.Fragment>}`;
  }
  return `\n${pad}${knob.member}={k.${knob.member} ? ${listExpression(knob.nodes ?? [], places, depth)} : undefined}`;
}

export function memberAttribute(knob: Knob, pad: string) {
  if (knob.form === 'functionInput') return `\n${pad}${knob.member}={validatorFor(k.${knob.member})}`;
  return `\n${pad}${knob.member}={k.${knob.member}}`;
}

export function eventAttribute(event: PlaygroundEvent, pad: string) {
  const bound = bindingName(event.name, 'event', 'react');
  return event.payload
    ? `\n${pad}${bound}={(payload) => play.fire(${JSON.stringify(event.name)}, payload)}`
    : `\n${pad}${bound}={() => play.fire(${JSON.stringify(event.name)})}`;
}

export function renderSubject(model: PlaygroundModel, places: Places, depth: number) {
  const pad = '  '.repeat(depth);
  const inner = `${pad}  `;
  const name = model.component;
  const content = model.knobs.find((knob) => knob.form === 'slot' && knob.member === 'content');

  const attrs = model.knobs
    .filter((knob) => knob.form !== 'slot')
    .map((knob) => memberAttribute(knob, inner))
    .concat(model.knobs
      .filter((knob) => knob.form === 'slot' && knob.member !== 'content')
      .map((knob) => slotAttribute(knob, places, inner, depth + 1)))
    .concat(model.events.map((event) => eventAttribute(event, inner)))
    .join('');

  if (!content) return `${pad}<${name}${attrs} />`;
  return `${pad}<${name}${attrs}>\n${slotChildren(content, places, depth + 1)}\n${pad}</${name}>`;
}

export function holdsSubject(node: FixtureChild): boolean {
  if (node === '$subject') return true;
  if (node === null || typeof node !== 'object') return false;
  return (Object.values(node.slots ?? {}) as any[][]).some((list) => list.some((one) => holdsSubject(one)));
}

export function renderTree(model: PlaygroundModel, places: Places, depth: number) {
  if (model.host === null) return renderSubject(model, places, depth);
  const wrap = (node: FixtureNode | typeof SUBJECT, level: number): string => {
    const pad = '  '.repeat(level);
    if (node === '$subject') return renderSubject(model, places, level);
    if (!holdsSubject(node)) return renderNode(node, places, level);
    const place = placeOf(places, node.component);
    const slots = node.slots ?? {};
    const named = (Object.entries(slots) as [string, FixtureNode[]][])
      .filter(([name]) => name !== 'content');
    const attrs = attributes(node.members, `${pad}  `)
      + named.map(([name, list]) => `\n${pad}  ${name}={${inlineList(list, places, level + 1)}}`).join('');
    const children = ((slots.content ?? []) as FixtureChild[])
      .filter((one): one is FixtureNode | typeof SUBJECT => one !== null)
      .map((one) => wrap(one, level + 1)).join('\n');
    if (children.length === 0) return `${pad}<${place.name}${attrs} />`;
    return `${pad}<${place.name}${attrs}>\n${children}\n${pad}</${place.name}>`;
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

export function reactEntry(model: PlaygroundModel, places: Places, banner: string) {
  const types = contractTypes(model);
  const components = [...new Set([model.component, ...model.uses])]
    .map((name) => {
      const place = placeOf(places, name);
      return `import { ${name} } from '${place.self ? `./${name}.tsx` : importPath(place)}';`;
    });

  const imports = [
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { Playground } from '../../../playground/Playground.tsx';",
    "import { usePlayground } from '../../../playground/PlaygroundState.ts';",
    "import type { KnobModel } from '../../../playground/PlaygroundCodec.generated.ts';",
    types.length > 0 ? `import type { ${types.join(', ')} } from '../../../Api.generated.ts';` : '',
    ...components,
  ].filter(Boolean);

  return `${banner}
${imports.join('\n')}

const MODEL: KnobModel = ${JSON.stringify(model, null, 2)};

${knobsInterface(model)}
${validatorTable(model)}
function Demo() {
  const play = usePlayground(MODEL);
  const k = play.values as unknown as Knobs;
  return (
    <Playground model={MODEL} play={play}>
${renderTree(model, places, 3)}
    </Playground>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
`;
}

export function reactPage(model: PlaygroundModel, banner: string) {
  const importmap = {
    imports: {
      react: `${UP}frameworks/react/vendor/React.generated.js`,
      'react/jsx-runtime': `${UP}frameworks/react/vendor/ReactJsxRuntime.generated.js`,
      'react-dom/client': `${UP}frameworks/react/vendor/ReactDomClient.generated.js`,
    },
  };
  return playgroundPage({
    component: model.component,
    banner,
    head: `${sheetLinks(model)}\n`
      + `<script type="importmap">\n${JSON.stringify(importmap, null, 2)}\n</script>\n`,
    mount: '<div id="root"></div>',
    script: `${model.component}.demo.entry.generated.js`,
  });
}
