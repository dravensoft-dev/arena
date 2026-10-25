/* Works out the glyphs a project draws. This module reads no file: sources arrive as text. An
 * IconScan is the glyphs each weight draws, plus the ones named beside no weight, which every
 * weight in use carries. The fill weight carries the fill pairs, the loose
 * names and the glyphs named in a source that draws a component swapping its active destination
 * to fill. The package ships its glyphs per component, and a build merges only the drawn ones. */


export const WEIGHT_CLASSES = {
  thin: 'ph-thin',
  light: 'ph-light',
  regular: 'ph',
  bold: 'ph-bold',
  duotone: 'ph-duotone',
  fill: 'ph-fill',
};

export const ARENA_WEIGHTS = Object.keys(WEIGHT_CLASSES);

const CLASS_TOKENS = new Set(Object.values(WEIGHT_CLASSES));
const GROUP = /(?<![\w-])ph(?:-[a-z0-9]+)*(?:\s+ph(?:-[a-z0-9]+)*)*(?![\w-])/g;

export const SYMBOL_REF = /#ph-(thin|light|regular|bold|duotone|fill)-([a-z0-9]+(?:-[a-z0-9]+)*)/g;

export type IconScan = { pairs: Map<string, Set<string>>; loose: Set<string> };

export function scan(source: string,
  found: IconScan = { pairs: new Map(), loose: new Set() }) {
  for (const [, weight = '', name = ''] of source.matchAll(SYMBOL_REF)) {
    let bucket = found.pairs.get(weight);
    if (!bucket) { bucket = new Set(); found.pairs.set(weight, bucket); }
    bucket.add(`ph-${name}`);
  }
  for (const [group] of source.replace(SYMBOL_REF, '').matchAll(GROUP)) {
    const weights = [];
    const glyphs = [];
    for (const token of group.split(/\s+/)) {
      if (CLASS_TOKENS.has(token)) {
        const named = ARENA_WEIGHTS.find((weight) => (WEIGHT_CLASSES as Record<string, string>)[weight] === token);
        if (named) weights.push(named);
      }
      else glyphs.push(token);
    }
    if (glyphs.length === 0) continue;
    if (weights.length === 0) { for (const glyph of glyphs) found.loose.add(glyph); continue; }
    for (const weight of weights) {
      let bucket = found.pairs.get(weight);
      if (!bucket) { bucket = new Set(); found.pairs.set(weight, bucket); }
      for (const glyph of glyphs) bucket.add(glyph);
    }
  }
  return found;
}

export type ShippedIcons = { pairs: Record<string, string[]>; loose: string[] };

export type ShippedIconMap = { components: Record<string, ShippedIcons>; fills: string[] };

export function mergeShipped(manifest: ShippedIconMap, into: IconScan, components: Set<string> | null = null) {
  for (const [key, icons] of Object.entries(manifest.components ?? {})) {
    if (components && !components.has(key)) continue;
    for (const [weight, glyphs] of Object.entries(icons.pairs ?? {})) {
      let bucket = into.pairs.get(weight);
      if (!bucket) { bucket = new Set<string>(); into.pairs.set(weight, bucket); }
      for (const glyph of glyphs) bucket.add(glyph);
    }
    for (const glyph of icons.loose ?? []) into.loose.add(glyph);
  }
  return into;
}

export function iconNames(icons: ShippedIcons) {
  return new Set([...(icons.loose ?? []), ...Object.values(icons.pairs ?? {}).flat()]);
}

export function shippedNames(manifest: ShippedIconMap, components: Set<string> | null = null) {
  const names = new Set<string>();
  for (const [key, icons] of Object.entries(manifest.components ?? {})) {
    if (components && !components.has(key)) continue;
    for (const name of iconNames(icons)) names.add(name);
  }
  return names;
}

export function glyphNames(found: IconScan) {
  const names = new Set(found.loose);
  for (const glyphs of found.pairs.values()) for (const glyph of glyphs) names.add(glyph);
  return names;
}

export function fillSourceGlyphs(sources: string[], drawsFill: (source: string) => boolean) {
  const names = new Set<string>();
  for (const source of sources) {
    if (drawsFill(source)) for (const glyph of glyphNames(scan(source))) names.add(glyph);
  }
  return names;
}

export function drawnGlyphs(found: IconScan, fillSources: Set<string>) {
  if (found.pairs.size === 0) return [];
  return ARENA_WEIGHTS.flatMap((weight) => {
    const pair = found.pairs.get(weight);
    if (weight === 'fill') {
      const glyphs = new Set([...(pair ?? []), ...found.loose, ...fillSources]);
      return glyphs.size ? [{ weight, glyphs }] : [];
    }
    if (weight === 'regular') {
      const glyphs = new Set([...(pair ?? []), ...found.loose]);
      return glyphs.size ? [{ weight, glyphs }] : [];
    }
    return pair ? [{ weight, glyphs: new Set([...pair, ...found.loose]) }] : [];
  });
}
