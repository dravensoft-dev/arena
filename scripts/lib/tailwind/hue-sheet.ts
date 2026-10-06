/* The hue sheet of a component: for each group a manifest maps to hues, one rule per slot the
 * group's attribute reaches and per value, writing the four channels of the hue that value names
 * (or `initial` for a value that names none). A rule rather than an inherited custom property is
 * the point: the element reading a channel is the element the rule writes it on, so a badge inside
 * a danger alert reads its own colour and never the alert's. Hues.json is the table of what each
 * hue writes, and the answers behind its roles belong to the style plugin. Rules follow the
 * manifest's group order, which decides a slot two groups reach, as a tag's colorId after its tone. */

import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { groupSlots, variantSelector } from './component-css.ts';
import type { ComponentManifest } from './manifest-shapes.ts';

export type HueChannels = Readonly<{ ink: string; edge: string; 'fill-strong': string; 'fill-soft': string }>;

export const HUE_CHANNELS = ['--arena-hue-ink', '--arena-hue-edge', '--arena-hue-fill-strong', '--arena-hue-fill-soft'] as const;

export const HUE_SHEETS = 'frameworks/tailwind/consume/hues';
export const HUES_FILE = 'frameworks/tailwind/Hues.json';
export const IDENTITY = 'identity-N';
export const IDENTITY_COUNT = 8;

const KEYS = ['ink', 'edge', 'fill-strong', 'fill-soft'] as const;

export function readHues(root = repoRoot): Map<string, HueChannels> {
  const table = (readJson(join(root, HUES_FILE)) as { hues: Record<string, HueChannels> }).hues;
  const out = new Map<string, HueChannels>();
  for (const [name, channels] of Object.entries(table)) {
    if (name !== IDENTITY) { out.set(name, channels); continue; }
    for (let n = 1; n <= IDENTITY_COUNT; n += 1) {
      const own = Object.fromEntries(KEYS.map((key) => [key, channels[key].replace(/\bN\b/g, String(n))]));
      out.set(IDENTITY.replace('N', String(n)), own as HueChannels);
    }
  }
  return out;
}

export function huePath(manifestFile: string) {
  return manifestFile
    .replace('frameworks/tailwind/components/', `${HUE_SHEETS}/`)
    .replace(/\.manifest\.json$/, '.hues.generated.css');
}

const INITIAL: HueChannels = { ink: 'initial', edge: 'initial', 'fill-strong': 'initial', 'fill-soft': 'initial' };

export function hueRules(manifest: ComponentManifest, hues: Map<string, HueChannels>) {
  const mapped = manifest.hues;
  if (!mapped) return '';
  const reached = groupSlots(manifest);
  const rules: string[] = [];
  for (const group of Object.keys(manifest.variants ?? {})) {
    const values = mapped[group];
    if (!values) continue;
    for (const [value, hue] of Object.entries(values)) {
      if (value === 'on') continue;
      let channels = INITIAL;
      if (typeof hue === 'string') {
        const named = hues.get(hue);
        if (!named) throw new Error(`hue-sheet: ${manifest.component}.hues.${group}.${value} names hue "${hue}", which ${HUES_FILE} does not declare`);
        channels = named;
      }
      for (const slot of reached[group] ?? []) {
        rules.push(`.${variantSelector(manifest, slot, group, value)} {\n`
          + HUE_CHANNELS.map((channel, i) => `  ${channel}: ${channels[KEYS[i] as keyof HueChannels]};\n`).join('')
          + '}');
      }
    }
  }
  return rules.join('\n');
}

export function hueProblems(manifest: ComponentManifest, hues: Map<string, HueChannels>) {
  const problems: string[] = [];
  const slots = Object.keys(manifest.slots ?? {});
  for (const [group, values] of Object.entries(manifest.hues ?? {})) {
    const own = manifest.variants?.[group];
    if (!own) { problems.push(`${manifest.component}.hues.${group} names no group of the manifest`); continue; }
    for (const [value, hue] of Object.entries(values)) {
      if (value === 'on') {
        for (const slot of Array.isArray(hue) ? hue : [])
          if (!slots.includes(slot)) problems.push(`${manifest.component}.hues.${group}.on names slot "${slot}", which the manifest lacks`);
        continue;
      }
      if (!(value in own)) problems.push(`${manifest.component}.hues.${group}.${value} names a value the group lacks`);
      else if (typeof hue === 'string' && !hues.has(hue))
        problems.push(`${manifest.component}.hues.${group}.${value} names hue "${hue}", which ${HUES_FILE} does not declare`);
    }
  }
  return problems;
}
