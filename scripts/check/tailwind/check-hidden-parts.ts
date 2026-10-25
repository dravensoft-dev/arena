/* A part kept for assistive technology is positioned absolutely: `sr-only` is `position: absolute`
 * at 1px, and a native input drawn `absolute opacity-0`. Its containing block is the nearest
 * positioned ancestor, and when the component root is not positioned that ancestor lies outside the
 * component. Inside a scroller that is not positioned the part is not clipped, and the document's
 * scrollable area grows to reach it. A manifest holding a hidden slot therefore positions its root,
 * or names in HELD the positioned slot of the same manifest that contains the part, with the reason.
 * An entry naming no hidden slot, a stale one, or one whose slot is not positioned fails, and so
 * does a sweep that finds no hidden slot. */

import { isMainModule } from '../../utils/main-module.ts';
import { readManifests } from '../arena/check-measured-box.ts';

export const node = {
  name: 'check:hidden-parts',
  reads: ['frameworks/tailwind/components/**'],
  writes: [],
  feeds: [],
};

type Manifest = { component: string; slots?: Record<string, string> };

export const HELD = new Map<string, { by: string; why: string }>([
  ['ArenaTag.closeLabel', { by: 'close', why: 'the close button label, drawn inside the positioned close slot; the browser sweep sees it held there' }],
  ['ArenaProgressBar.announcement', { by: 'track', why: 'the live announcement, drawn inside the positioned track; the browser sweep sees it held there' }],
  ['ArenaCalendar.detailShed', { by: 'chip', why: 'the text of an event the narrow cell sheds, drawn inside the positioned chip; the browser sweep sees it held there' }],
  ['ArenaSlider.thumbLabel', { by: 'thumb', why: 'the thumb value label, inside the positioned thumb; no sink draws it, so the static half alone holds it' }],
  ['ArenaSegmentedControl.input', { by: 'segment', why: 'the native radio of a segment, inside the positioned segment (the control draws no root part); the browser sweep sees it held there' }],
]);

export function hiddenSlots(classes: string): boolean {
  const tokens = classes.split(/\s+/).filter(Boolean);
  return tokens.includes('sr-only') || (tokens.includes('absolute') && tokens.includes('opacity-0'));
}

export function positioned(classes: string): boolean {
  return classes.split(/\s+/).some((token) => ['relative', 'absolute', 'fixed', 'sticky'].includes(token));
}

export function hiddenPartProblems(manifests: Iterable<Manifest>, held = HELD): string[] {
  const problems: string[] = [];
  const hidden = new Set<string>();
  const rootPositioned = new Map<string, boolean>();
  const bySlots = new Map<string, Record<string, string>>();
  for (const { component, slots = {} } of manifests) {
    bySlots.set(component, slots);
    const rooted = positioned(slots.root ?? '');
    rootPositioned.set(component, rooted);
    for (const [slot, classes] of Object.entries(slots)) {
      if (!hiddenSlots(classes)) continue;
      const key = `${component}.${slot}`;
      hidden.add(key);
      if (rooted) continue;
      const entry = held.get(key);
      if (!entry) {
        problems.push(`${key} is a hidden part and ${component} has no positioned root: position the root, or name in HELD the positioned slot that contains it`);
        continue;
      }
      const by = bySlots.get(component)?.[entry.by];
      if (by === undefined) problems.push(`HELD ${key} names the slot "${entry.by}", which ${component} does not have`);
      else if (!positioned(by)) problems.push(`HELD ${key} names the slot "${entry.by}", which is not positioned`);
    }
  }
  for (const key of held.keys()) {
    const component = key.slice(0, key.indexOf('.'));
    if (!hidden.has(key)) problems.push(`HELD ${key} names no hidden slot`);
    else if (rootPositioned.get(component)) problems.push(`HELD ${key} is stale: ${component} has a positioned root`);
  }
  if (hidden.size === 0) problems.push('the sweep found no hidden slot in any manifest, so it checked nothing');
  return problems;
}

function main() {
  const problems = hiddenPartProblems(readManifests().values());
  if (problems.length) {
    for (const problem of problems) console.error(`check-hidden-parts: ${problem}`);
    process.exit(1);
  }
  console.log('check-hidden-parts: clean -- every hidden part has a positioned containing block inside its component');
}

if (isMainModule(import.meta.url)) main();
