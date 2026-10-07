/* Derives a component's playground from its API contract and its Fixture -- one
 * frameworks/demos/<Name>.demo.json, which check:playgrounds validates -- and names what it
 * derives, so the two renderers read a shape rather than infer one. It is the ONLY place a
 * member's knob, initial state and URL codec are decided. A form it cannot model THROWS
 * rather than dropping the member, since one missing by accident and one missing by design
 * look identical on a page. The bind classes are not cosmetic: an Angular input() bound to
 * undefined holds undefined rather than falling back, so a member carrying a default may
 * never unbind, and a seed outranks a contract default. A Control's fields vary by form, so
 * it spreads into a Knob; a slot list holds nodes and a HOST's may also hold $subject,
 * which wrap() answers before any renderer recurses. */
import { memberEntries, fieldEntries } from './contract-shapes.ts';
import type { ComponentContract, MemberSpec, TypeContract, Types } from './contract-shapes.ts';


export const PINNED = 'pinned';
export const DEFAULTED = 'defaulted';
export const OPTIONAL = 'optional';

export const SUBJECT = '$subject';

export const INBOUND_FORMS = new Set(['primitive', 'enum', 'object', 'array', 'slot', 'functionInput']);

export type Control = {
  control: string;
  codec: string;
  options?: (string | number)[];
  fields?: unknown[];
  params?: Record<string, string>;
  returns?: string;
  itemForm?: string;
  itemType?: string | null;
};

export type Knob = Control & {
  member: string;
  form: string;
  type: string | null;
  bind: string;
  bound: boolean;
  initial: unknown;
  nodes: any;
  doc: string;
};

export type PlaygroundEvent = {
  name: string;
  payload: string | null;
  bind: string | null;
  doc: string;
};

export type FixtureNode = {
  component?: string;
  element?: string;
  text?: string;
  members?: Record<string, any>;
  class?: string;
  slots?: Record<string, FixtureChild[]>;
  [other: string]: any;
};

export type FixtureChild = FixtureNode | typeof SUBJECT | null;

export type Fixture = {
  component: string;
  note?: string;
  seed?: Record<string, any>;
  class?: string;
  slots?: Record<string, FixtureChild[]>;
  bind?: Record<string, any>;
  host?: FixtureChild;
  vars?: Record<string, string>;
};

export type Place = { name: string; category: string; dir: string; self?: boolean };

export type Places = Map<string, Place>;

export type PlaygroundModel = {
  component: string;
  description: string;
  note: string;
  affordances: string[];
  knobs: Knob[];
  events: PlaygroundEvent[];
  host: any;
  uses: string[];
  class?: string;
  vars?: Record<string, string>;
};

export class UnmodelledForm extends Error {
  constructor(message: string) { super(message); this.name = 'UnmodelledForm'; }
}

export function enumValues(types: Types, name: string | undefined) {
  const { values } = typeOf(types, name);
  if (!values || values.length === 0) {
    throw new UnmodelledForm(`type ${name} is used as an enum and declares no values`);
  }
  return values;
}

export function placeOf(places: Places, component: string | undefined): Place {
  const place = component === undefined ? undefined : places.get(component);
  if (!place) {
    throw new UnmodelledForm(
      `a fixture names <${component}>, and no component directory under frameworks/ provides it. `
      + 'Places are derived from the tree, so this is the fixture naming something that is not there.',
    );
  }
  return place;
}

export function typeOf(types: Types, name: string | undefined) {
  const found = name === undefined ? undefined : (types instanceof Map ? types.get(name) : types?.[name]);
  if (!found) throw new UnmodelledForm(`no type named ${name} is declared in contracts/api/types`);
  return found;
}

export function bindClass(spec: Pick<MemberSpec, 'required' | 'default'>) {
  if (spec.required) return PINNED;
  if ('default' in spec) return DEFAULTED;
  return OPTIONAL;
}

export function neutralValue(spec: MemberSpec, types: Types): unknown {
  if (spec.form === 'primitive') {
    if (spec.type === 'boolean') return false;
    if (spec.type === 'number') return 0;
    return '';
  }
  if (spec.form === 'enum') return enumValues(types, spec.type)[0];
  if (spec.form === 'array') return [];
  if (spec.form === 'object') return neutralObject(typeOf(types, spec.type), types);
  if (spec.form === 'slot') return '';
  if (spec.form === 'functionInput') return 'none';
  throw new UnmodelledForm(`no neutral value for form ${spec.form}`);
}

export function neutralObject(type: TypeContract, types: Types) {
  const out: Record<string, unknown> = {};
  for (const [name, field] of fieldEntries(type.fields)) {
    if ('default' in field) out[name] = field.default;
    else if (field.required) out[name] = neutralValue(field, types);
  }
  return out;
}

export function objectFields(type: TypeContract, types: Types) {
  return fieldEntries(type.fields).map(([name, field]) => ({
    name,
    form: field.form,
    type: field.type,
    required: Boolean(field.required),
    options: field.form === 'enum' ? enumValues(types, field.type) : undefined,
    initial: 'default' in field ? field.default : neutralValue(field, types),
  }));
}

export function controlFor(spec: MemberSpec, types: Types, nodes?: FixtureChild[] | null): Control {
  if (spec.form === 'primitive') {
    if (spec.type === 'boolean') return { control: 'check', codec: 'flag' };
    if (spec.type === 'number') return { control: 'number', codec: 'number' };
    return { control: 'text', codec: 'raw' };
  }
  if (spec.form === 'enum') return { control: 'select', codec: 'raw', options: enumValues(types, spec.type) };
  if (spec.form === 'array') {
    return spec.of === 'string' || spec.of === 'number'
      ? { control: 'lines', codec: 'json', itemForm: spec.of }
      : { control: 'json', codec: 'json', itemType: spec.of };
  }
  if (spec.form === 'object') return { control: 'fields', codec: 'json', fields: objectFields(typeOf(types, spec.type), types) };
  if (spec.form === 'functionInput') {
    return { control: 'select', codec: 'raw', options: ['none', 'nonEmpty', 'alwaysInvalid'], params: spec.params, returns: spec.returns };
  }
  if (spec.form === 'slot') {
    return isTextNodes(nodes) ? { control: 'slotText', codec: 'raw' } : { control: 'slotPresence', codec: 'flag' };
  }
  throw new UnmodelledForm(
    spec.form === 'consumerData'
      ? 'consumerData is a record Arena routes and never inspects, so no control can offer a value for it'
      : `form ${spec.form} has no control`,
  );
}

export function isTextNodes(nodes: FixtureChild[] | null | undefined): nodes is [{ text: string }] {
  return Array.isArray(nodes) && nodes.length === 1
    && typeof nodes[0] === 'object' && nodes[0] !== null && typeof nodes[0].text === 'string';
}

export function knobFor(component: string, name: string, spec: MemberSpec,
  fixture: Pick<Fixture, 'seed' | 'slots'>, types: Types): Knob {
  if (spec.form === 'slot' && spec.params) {
    throw new UnmodelledForm(
      `${component}.${name} is a parameterised slot, which is a per-item renderer no layer may declare`,
    );
  }
  const nodes = spec.form === 'slot' ? fixture.slots?.[name] ?? null : null;
  const bind = bindClass(spec);
  const seeded = fixture.seed && name in fixture.seed;

  if (bind === PINNED && spec.form !== 'slot' && !seeded) {
    throw new UnmodelledForm(
      `${component}.${name} is required and carries no default, so ${component}.demo.json must seed it`,
    );
  }
  if (bind === PINNED && spec.form === 'slot' && nodes === null) {
    throw new UnmodelledForm(`${component}.${name} is a required slot, so ${component}.demo.json must fill it`);
  }

  const initial = spec.form === 'slot'
    ? (isTextNodes(nodes) ? nodes[0].text : nodes !== null)
    : seeded ? fixture.seed?.[name]
      : 'default' in spec ? spec.default
        : neutralValue(spec, types);

  return {
    member: name,
    form: spec.form,
    type: spec.type ?? spec.of ?? null,
    bind,
    bound: bind !== OPTIONAL || (spec.form === 'slot' ? nodes !== null : Boolean(seeded)),
    ...controlFor(spec, types, nodes),
    initial,
    nodes,
    doc: spec.description ?? '',
  };
}

export function eventFor(name: string, spec: MemberSpec, fixture: Pick<Fixture, 'bind'>): PlaygroundEvent {
  return {
    name,
    payload: spec.payload ?? null,
    bind: fixture.bind?.[name] ?? null,
    doc: spec.description ?? '',
  };
}

export function collectUses(node: FixtureChild, into: string[] = []): string[] {
  if (node === SUBJECT || node === null || node === undefined) return into;
  if (Array.isArray(node)) { for (const one of node) collectUses(one, into); return into; }
  if (typeof node !== 'object') return into;
  if (node.component && !into.includes(node.component)) into.push(node.component);
  for (const list of Object.values(node.slots ?? {})) collectUses(list, into);
  return into;
}

export function countSubjects(node: FixtureChild): number {
  if (node === SUBJECT) return 1;
  if (Array.isArray(node)) return node.reduce((n, one) => n + countSubjects(one), 0);
  if (node === null || typeof node !== 'object') return 0;
  return Object.values(node.slots ?? {}).reduce((n, list) => n + countSubjects(list), 0);
}

export function playgroundModel(contract: ComponentContract,
  fixture: Omit<Fixture, 'component'>, types: Types): PlaygroundModel {
  const knobs: Knob[] = [];
  const events: PlaygroundEvent[] = [];
  for (const [name, spec] of memberEntries(contract.api)) {
    if (spec.form === 'event') events.push(eventFor(name, spec, fixture));
    else if (INBOUND_FORMS.has(spec.form)) knobs.push(knobFor(contract.component, name, spec, fixture, types));
    else throw new UnmodelledForm(`${contract.component}.${name} declares form ${spec.form}, which the playground cannot model`);
  }

  const host = fixture.host ?? null;
  if (host !== null && countSubjects(host) !== 1) {
    throw new UnmodelledForm(
      `${contract.component}.demo.json declares a host holding ${countSubjects(host)} "${SUBJECT}" placeholders, and exactly one marks where the component goes`,
    );
  }

  const uses = collectUses(host);
  for (const knob of knobs) collectUses(knob.nodes, uses);

  return {
    component: contract.component,
    description: contract.description ?? '',
    note: fixture.note ?? '',
    affordances: contract.affordances ?? [],
    knobs,
    events,
    host,
    uses,
    ...(fixture.class ? { class: fixture.class } : {}),
    ...(fixture.vars && Object.keys(fixture.vars).length > 0 ? { vars: fixture.vars } : {}),
  };
}
