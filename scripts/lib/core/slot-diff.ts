/* The leaf diff of two derived catalogues. --dump writes readColorSlots(root); two files print their diff (D30). */

import { readFileSync, writeFileSync } from 'node:fs';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';
import { readColorSlots } from './color-slots.ts';

export type SlotDiff = { added: string[]; removed: string[]; changed: { name: string; fields: Record<string, [unknown, unknown]> }[] };

export function slotDiff(before: SlotCatalogue, after: SlotCatalogue): SlotDiff {
  const b = before.slots, a = after.slots;
  const changed: SlotDiff['changed'] = [];
  for (const name of Object.keys(a).filter((n) => n in b).sort()) {
    const fields: Record<string, [unknown, unknown]> = {};
    const x = b[name] as unknown as Record<string, unknown>, y = a[name] as unknown as Record<string, unknown>;
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) fields[k] = [x[k], y[k]];
    }
    if (Object.keys(fields).length) changed.push({ name, fields });
  }
  return { added: Object.keys(a).filter((n) => !(n in b)).sort(), removed: Object.keys(b).filter((n) => !(n in a)).sort(), changed };
}

export function formatSlotDiff(diff: SlotDiff): string {
  return [`${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed`,
    ...diff.added.map((n) => `+ ${n}`), ...diff.removed.map((n) => `- ${n}`),
    ...diff.changed.map((c) => `~ ${c.name} ${JSON.stringify(c.fields)}`)].join('\n');
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] === '--dump') {
    writeFileSync(args[1] as string, JSON.stringify(readColorSlots(args[2]), null, 1));
  } else {
    const [before, after] = args.map((p) => JSON.parse(readFileSync(p, 'utf8')) as SlotCatalogue);
    console.log(formatSlotDiff(slotDiff(before as SlotCatalogue, after as SlotCatalogue)));
  }
}
