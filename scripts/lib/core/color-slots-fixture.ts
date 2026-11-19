/* A small group of parts, members and manifests for the colour-slot tests: slotFixture wraps parts
 * (and the members that read them) in declarations with a four-property accepts set and the
 * toggle state sets, and fixtureManifests writes the class each member of the box fixture reads
 * for every slot, so a test can break one read. A helper for tests only. */

import { memberValue } from '../../generate/core/arena-cli/slots.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';
import type { ComponentManifest } from '../tailwind/manifest-shapes.ts';
import type { GroupPart, SlotDeclarations } from './color-slots.ts';

export const slotFixture = (
  parts: Record<string, GroupPart>, members: SlotDeclarations['members'] = {}, group = 'fields',
): SlotDeclarations => ({
  accepts: { fill: ['fill-*', 'transparent'], ink: ['ink-*'], edge: ['edge-*', 'transparent'], icon: ['ink-*'] },
  refused: [],
  states: ['rest', 'hover', 'pressed', 'disabled', 'selected', 'selected-hover', 'selected-pressed', 'selected-disabled'],
  stateSets: {
    base: ['rest', 'hover', 'pressed', 'disabled'],
    toggle: ['rest', 'hover', 'pressed', 'disabled', 'selected', 'selected-hover', 'selected-pressed', 'selected-disabled'],
    on: ['selected'],
    plain: ['rest', 'hover'],
    light: ['rest', 'hover', 'selected'],
  },
  selected: { fill: '{fill-selected}', ink: '{ink-selected}', edge: '{edge-selected}' },
  groups: { [group]: { parts } },
  members,
  exceptions: {},
  rings: {},
});

export const fixtureManifests = (c: SlotCatalogue): Map<string, ComponentManifest> => {
  const token = (name: string, member: string, modifier: string, utility: string) => `${modifier}${utility}${memberValue(c, member, name, 'tailwind')}]`;
  const read = (member: string, property: string, part: string, state: string, option?: string) => {
    const mod = { rest: '', hover: 'hover:', selected: '', 'selected-hover': 'hover:' }[state] as string;
    const name = option === undefined ? `choices-${part}-${property}-${state}` : `choices-${option}-${part}-${property}-${state}`;
    return token(name, member, mod, property === 'fill' ? 'bg-[color:' : 'border-[color:');
  };
  const box = (state: string) => read('ArenaBox.box', 'fill', 'box', state);
  return new Map<string, ComponentManifest>([
    ['ArenaBox', { component: 'ArenaBox', slots: { box: `${box('rest')} ${box('hover')}` }, variants: { checked: { true: { box: box('selected') } } } } as unknown as ComponentManifest],
    ['ArenaField', {
      component: 'ArenaField',
      slots: { field: `${read('ArenaField.field', 'edge', 'field', 'rest', 'plain')} ${read('ArenaField.field', 'edge', 'field', 'hover', 'plain')}` },
      variants: { state: { error: { field: `${read('ArenaField.field', 'edge', 'field', 'rest', 'error')} ${read('ArenaField.field', 'edge', 'field', 'hover', 'error')}` } } },
    } as unknown as ComponentManifest],
    ['ArenaRange', {
      component: 'ArenaRange',
      slots: { fill: `${token('choices-fill-fill-selected', 'ArenaRange.fill', '', 'bg-[color:')}` },
      variants: { checked: { true: {} } },
    } as unknown as ComponentManifest],
    ['ArenaCalm', { component: 'ArenaCalm', slots: { calm: `${token('choices-only-calm-fill-rest', 'ArenaCalm.calm', '', 'bg-[color:')} ${token('choices-only-calm-fill-hover', 'ArenaCalm.calm', 'hover:', 'bg-[color:')}` } } as unknown as ComponentManifest],
  ]);
};
