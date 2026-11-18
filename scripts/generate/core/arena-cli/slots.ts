/* The colour slot catalogue: the tier above the roles. A slot is one coloured part of one
 * component, per property and state, and a plugin answers it with a role its accepts set names.
 * The command ships this file, so it imports nothing outside this directory. */

export const SLOT_PROPERTIES = ['fill', 'ink', 'edge', 'icon'] as const;
export const SLOT_STATES = ['rest', 'hover', 'pressed', 'selected', 'selected-hover', 'selected-pressed', 'disabled'] as const;

export type SlotProperty = (typeof SLOT_PROPERTIES)[number];
export type SlotState = (typeof SLOT_STATES)[number];

export type ColorSlot = {
  scope: 'family' | 'component';
  family?: string;
  component?: string;
  option: string;
  part: string;
  property: SlotProperty;
  state: SlotState;
  channel?: string;
  accepts: SlotProperty;
  on?: string;
  default?: string;
  derive?: { from: string; mix?: 'mix-hover' | 'mix-pressed' };
  level?: string;
  optional?: true;
  draws?: string;
};

export type SlotCatalogue = {
  accepts: Record<SlotProperty, string[]>;
  refused: string[];
  states: string[];
  families: Record<string, { parts: string[] }>;
  rings: Record<string, string>;
  slots: Record<string, ColorSlot>;
};

export function slotStem(component: string): string {
  return component.replace(/^Arena/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function expectedName(slot: ColorSlot): string {
  const owner = slot.scope === 'family' ? slot.family : slotStem(slot.component ?? '');
  return [owner, slot.option, slot.part, slot.property, slot.state].join('-');
}

export const glob = (pattern: string) =>
  new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

export function acceptedRole(catalogue: SlotCatalogue, slot: ColorSlot, role: string, colourRoles: ReadonlySet<string>): boolean {
  const patterns = catalogue.accepts[slot.accepts] ?? [];
  if (role === 'transparent') return patterns.includes('transparent');
  if (catalogue.refused.includes(role) || !colourRoles.has(role)) return false;
  return patterns.some((p) => p !== 'transparent' && glob(p).test(role));
}

const SLOT_ANSWER = /^\{([a-z][a-z0-9-]*)\}$/;

export function slotAnswer(value: string, name: string, catalogue: SlotCatalogue, colourRoles: ReadonlySet<string>): boolean {
  const slot = catalogue.slots[name];
  if (!slot || typeof value !== 'string') return false;
  const text = value.trim();
  if (text === 'transparent') return acceptedRole(catalogue, slot, text, colourRoles);
  const role = SLOT_ANSWER.exec(text)?.[1];
  return role !== undefined && acceptedRole(catalogue, slot, role, colourRoles);
}

export function slotProblem(where: string, name: string, value: string, catalogue: SlotCatalogue): string {
  const slot = catalogue.slots[name];
  const takes = (catalogue.accepts[slot?.accepts ?? 'fill'] ?? []).map((p) => (p === 'transparent' ? p : `{${p}}`)).join(', ');
  return `${where}: --${name} is ${JSON.stringify(value)}, and a ${slot?.accepts ?? 'colour'} slot takes a role from its accepts set: ${takes}. `
    + 'A slot is answered with a role the set names, or with transparent where the set lists it; a palette alias, '
    + 'a literal, another slot and the focus edge are refused.';
}

export function fadeMarkers(answered: Iterable<string>, catalogue: SlotCatalogue): [string, string][] {
  const markers = new Set<string>();
  for (const name of answered) {
    const slot = catalogue.slots[name];
    if (!slot || slot.state !== 'disabled') continue;
    const owner = slot.scope === 'family' ? slot.family : slotStem(slot.component ?? '');
    markers.add(`--${owner}-${slot.option}-${slot.part}-fade-disabled`);
  }
  return [...markers].map((name) => [name, '1']);
}
