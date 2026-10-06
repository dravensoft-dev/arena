/* The kind a manifest declares for each of its slots, and the padding, gap and radius roles
 * each kind may spend. A `kind` map never reaches a class module or a sheet. */

import type { ComponentManifest } from './manifest-shapes.ts';

export const KINDS = ['surface', 'floating', 'control', 'field', 'marker', 'status', 'row', 'none'] as const;

export type SlotKind = typeof KINDS[number];

export const KIND_FREE: ReadonlySet<string> = new Set([
  'gap-items', 'gap-inline', 'gap-stack', 'gap-group', 'gap-component', 'gap-section', 'py-section',
  'rounded-pill', 'rounded-none', 'rounded-[inherit]', 'rounded-media',
]);

export const KIND_AIR: Readonly<Record<SlotKind, { pad: readonly string[]; gap: readonly string[]; radius: readonly string[] }>> = {
  surface: { pad: ['surface', 'surface-head'], gap: ['gap-items', 'gap-inline'], radius: ['rounded-surface'] },
  floating: { pad: ['floating-x', 'floating-y'], gap: ['gap-items', 'gap-inline'], radius: ['rounded-surface-floating'] },
  control: { pad: ['control-x', 'control-y'], gap: ['gap-control'], radius: ['rounded-control', 'rounded-control-sm'] },
  field: { pad: ['control-x', 'control-y'], gap: ['gap-control'], radius: ['rounded-field'] },
  marker: { pad: ['marker-x', 'marker-y'], gap: ['gap-marker'], radius: ['rounded-marker'] },
  status: { pad: ['status-x', 'status-y'], gap: ['gap-items', 'gap-inline'], radius: ['rounded-surface-floating'] },
  row: { pad: ['row-x', 'row-y', 'row-px', 'row-py'], gap: ['gap-row'], radius: ['rounded-control'] },
  none: { pad: [], gap: [], radius: [] },
};

export function kindProblems(manifest: ComponentManifest): string[] {
  const slots = Object.keys(manifest.slots ?? {});
  const kind = manifest.kind ?? {};
  const problems: string[] = [];
  for (const slot of slots) {
    if (!(slot in kind)) problems.push(`${manifest.component}:${slot} declares no kind`);
    else if (!(KINDS as readonly string[]).includes(kind[slot]!)) {
      problems.push(`${manifest.component}:${slot} declares the unknown kind "${kind[slot]}"`);
    }
  }
  for (const slot of Object.keys(kind)) {
    if (!slots.includes(slot)) problems.push(`${manifest.component}:${slot} declares a kind but is no slot`);
  }
  return problems;
}
