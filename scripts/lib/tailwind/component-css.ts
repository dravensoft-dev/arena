/* Turns a manifest into the CSS a component renders, so no Tailwind class name and no
 * Tailwind custom property leaves a package. Every class name is spelt by ManifestClasses.js
 * rather than here: the specimen harness runs that file in a browser and this generator writes
 * the sheet, so a second copy of the template would let a page render classes no sheet defines
 * and no gate would see it. The strip is the load-bearing half. `@apply` emits Tailwind's own
 * namespace with the Arena token only as a fallback, `var(--spacing, var(--sp-1))`, and an
 * adopter who runs Tailwind declares `--spacing` on their unlayered `:root`, wins, and rescales
 * every component silently. Stripping to `var(--sp-1)` also repairs `.arena-compact`, inert while
 * the density tokens resolve on `:root` and inherit resolved. An indirection `Theme.css` does not
 * confirm is an error, and the preset it names is posix: a backslash in a CSS string escapes. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDecls } from '../arena/css-decls.ts';
import { toPosix, type PathModule } from '../../utils/posix-path.ts';
import {
  classBase, classesManifest as rawClassesManifest, compoundSelector, dataAttribute, slotClass, slotPart,
  variantSelector, groupSlots as rawGroupSlots, slotData as rawSlotData,
  arenaSlotDataFor as rawArenaSlotDataFor,
  classesFor as rawClassesFor, arenaClassesFor as rawArenaClassesFor,
} from '../../../frameworks/tailwind/ManifestClasses.js';
import type { ArenaClassManifest, ArenaSelection, ArenaSlotData } from '../../../frameworks/tailwind/ArenaStyles.ts';
import type { ComponentManifest, Manifests, SlotClasses } from './manifest-shapes.ts';
import { captured } from '../../utils/captures.ts';

export const classesManifest = rawClassesManifest as (manifest: ComponentManifest) => ArenaClassManifest;
export const classesFor =
  rawClassesFor as (manifest: ComponentManifest | ArenaClassManifest, chosen?: ArenaSelection) => SlotClasses;
export const arenaClassesFor =
  rawArenaClassesFor as (manifest: ComponentManifest, chosen?: ArenaSelection) => SlotClasses;

export const groupSlots =
  rawGroupSlots as (manifest: ComponentManifest) => Record<string, string[]>;
export const slotData =
  rawSlotData as (manifest: ArenaClassManifest, chosen?: ArenaSelection) => Record<string, ArenaSlotData>;
export const arenaSlotDataFor =
  rawArenaSlotDataFor as (manifest: ComponentManifest, chosen?: ArenaSelection) => Record<string, ArenaSlotData>;

export { classBase, compoundSelector, dataAttribute, slotClass, slotPart, variantSelector };

export const INDIRECTION = /var\(\s*--([a-z0-9-]+)\s*,\s*var\(\s*--([a-z0-9-]+)\s*\)\s*\)/g;
export const isThemeKey = (name: string) => !name.startsWith('tw-');

export function applyRules(manifest: ComponentManifest) {
  const rules: { selector: string; classes: string }[] = [];
  const push = (selector: string, classes: string | undefined) => {
    const trimmed = String(classes ?? '').trim();
    if (trimmed) rules.push({ selector, classes: trimmed });
  };

  for (const [slot, classes] of Object.entries(manifest.slots ?? {}))
    push(slotClass(manifest.component, slot), classes);

  for (const [group, values] of Object.entries(manifest.variants ?? {}))
    for (const [value, slots] of Object.entries(values))
      for (const [slot, classes] of Object.entries(slots ?? {}))
        push(variantSelector(manifest, slot, group, value), classes);

  for (const compound of manifest.compoundVariants ?? []) {
    for (const [slot, classes] of Object.entries(compound.class ?? {}))
      push(compoundSelector(manifest, slot, compound), classes);
  }

  return rules;
}

export function classNames(manifest: ComponentManifest) {
  return applyRules(manifest).map((rule) => rule.selector);
}

export function entryStylesheet(presetPath: string, manifests: Manifests, on?: PathModule) {
  const body = [...manifests.values()]
    .flatMap((manifest) => applyRules(manifest))
    .map(({ selector, classes }) => `  .${selector} { @apply ${classes}; }`)
    .join('\n');
  return `@reference '${toPosix(presetPath, on)}';\n\n@layer utilities {\n${body}\n}\n`;
}

const squeeze = (value: string) => value.trim().replace(/\s+/g, ' ');

function calcReads(css: string, themeMap: Map<string, string>) {
  const reads: { start: number; end: number; key: string; fallback: string; expression: string }[] = [];
  for (const m of css.matchAll(/var\(\s*--([a-z0-9-]+)\s*,\s*(calc\()/g)) {
    const key = captured(m);
    const expression = themeMap.get(key);
    if (!isThemeKey(key) || !expression?.startsWith('calc(')) continue;
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')' && --depth === 0) { end = i + 1; break; }
    }
    if (end < 0) continue;
    const fallback = squeeze(css.slice(m.index + m[0].length - 5, end));
    reads.push({ start: m.index, end: css.indexOf(")", end) + 1, key, fallback, expression });
  }
  return reads;
}

export function themeKeyMap(themeCss: string) {
  const map = new Map();
  for (const decls of parseDecls(themeCss).values()) {
    for (const [name, value] of decls) {
      if (name.endsWith('-*')) continue;
      const single = /^\s*var\(\s*--([a-z0-9-]+)\s*\)\s*$/.exec(value);
      if (single) map.set(name, single[1]);
      else if (/^\s*calc\(/.test(value) && [...value.matchAll(/var\(\s*--/g)].length > 0) map.set(name, squeeze(value));
    }
  }
  return map;
}

export function stripProblems(css: string, themeMap: Map<string, string>) {
  const problems = [];
  for (const m of css.matchAll(INDIRECTION)) {
    const key = captured(m);
    const token = captured(m, 2);
    if (!isThemeKey(key)) continue;
    if (themeMap.get(key) !== token) {
      problems.push(`var(--${key}, var(--${token})) is not a pair Theme.css declares, so the strip `
        + `cannot know that --${token} is what --${key} means; add it to the preset or stop emitting it`);
    }
  }
  for (const read of calcReads(css, themeMap)) {
    if (read.fallback !== read.expression) {
      problems.push(`var(--${read.key}, ${read.fallback}) is not the calc Theme.css declares for --${read.key}, so the `
        + `strip cannot know it is what --${read.key} means; add it to the preset or stop emitting it`);
    }
  }
  return [...new Set(problems)];
}

export function stripIndirection(css: string, themeMap: Map<string, string> = new Map()) {
  let out = css;
  for (const read of calcReads(out, themeMap).reverse()) {
    if (read.fallback === read.expression) out = out.slice(0, read.start) + read.expression + out.slice(read.end);
  }
  for (let previous = null; previous !== out;) {
    previous = out;
    out = out.replace(INDIRECTION, (match, key: string, token: string) => (isThemeKey(key) ? `var(--${token})` : match));
  }
  return out;
}

export function themeMapFor(root: string) {
  return themeKeyMap(readFileSync(join(root, 'frameworks/tailwind/Theme.css'), 'utf8'));
}
