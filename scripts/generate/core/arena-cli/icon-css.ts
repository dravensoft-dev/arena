/* Cuts a Phosphor weight sheet down to the glyphs a project draws. This module reads no file: the
 * sheet arrives as text and the font path already resolved. A sheet's rules are flat, so a brace
 * scan is enough. An IconScan is the glyphs each weight draws, plus the ones named beside no
 * weight, which every weight in use carries. The fill weight carries the fill pairs, the loose
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
const BLOCK = /([^{}]+)\{([^{}]*)\}/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

export type IconScan = { pairs: Map<string, Set<string>>; loose: Set<string> };

type Declarations = [string, string][];

type WeightRules = {
  fontFace: Declarations | null;
  base: Declarations | null;
  glyphs: Map<string, [string, Declarations][]>;
};

export function scan(source: string,
  found: IconScan = { pairs: new Map(), loose: new Set() }) {
  for (const [group] of source.matchAll(GROUP)) {
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
    return pair ? [{ weight, glyphs: new Set([...pair, ...found.loose]) }] : [];
  });
}

function declarations(body: string): Declarations {
  return body.split(';').map((one) => one.trim()).filter(Boolean).map((one) => {
    const colon = one.indexOf(':');
    return [one.slice(0, colon).trim(), one.slice(colon + 1).trim()];
  });
}

export function sheetRules(css: string, weight: string): WeightRules {
  const selector = (WEIGHT_CLASSES as Record<string, string>)[weight];
  const icon = new RegExp(`^\\.${selector}\\.(ph-[a-z0-9-]+):(before|after)$`);
  const out: WeightRules = { fontFace: null, base: null, glyphs: new Map() };

  for (const m of css.replace(COMMENT, '').matchAll(BLOCK)) {
    const head = m[1] ?? '';
    const body = m[2] ?? '';
    const at = head.trim();
    if (at === '@font-face') { out.fontFace = declarations(body); continue; }
    if (at === `.${selector}`) { out.base = declarations(body); continue; }
    const match = icon.exec(at);
    if (!match) continue;
    const glyph = match[1] ?? '';
    const pseudo = match[2] ?? '';
    let rules = out.glyphs.get(glyph);
    if (!rules) { rules = []; out.glyphs.set(glyph, rules); }
    rules.push([pseudo, declarations(body)]);
  }
  return out;
}

export function woff2Source(css: string, weight: string) {
  const { fontFace } = sheetRules(css, weight);
  const src = fontFace?.find(([name]) => name === 'src')?.[1] ?? '';
  return /url\(["']?([^"')]+\.woff2)["']?\)/.exec(src)?.[1] ?? null;
}

const rule = (at: string, decls: Declarations) => `${at}{${decls.map(([name, value]) => `${name}:${value}`).join(';')}}`;

export function subset(css: string, weight: string, glyphs: Set<string>, fontPath: string) {
  const rules = sheetRules(css, weight);
  if (!rules.fontFace || !rules.base || rules.glyphs.size === 0) {
    throw new Error(`icons: the ${weight} sheet has no @font-face, no .${(WEIGHT_CLASSES as Record<string, string>)[weight]} rule `
      + 'or no icon rule, so Phosphor is not shaped the way this reads it');
  }

  const src: [string, string] = ['src', `url('${fontPath}') format('woff2')`];
  const face = rules.fontFace.filter(([name]) => name !== 'src');
  const at = face.findIndex(([name]) => name === 'font-family');
  face.splice(at + 1, 0, src);

  const selector = (WEIGHT_CLASSES as Record<string, string>)[weight];
  const lines = [rule('@font-face', face), rule(`.${selector}`, rules.base)];
  const missing = [];
  for (const glyph of [...glyphs].sort()) {
    const found = rules.glyphs.get(glyph);
    if (!found) { missing.push(glyph); continue; }
    for (const [pseudo, decls] of found) lines.push(rule(`.${selector}.${glyph}:${pseudo}`, decls));
  }
  return { css: lines.join('\n'), missing, kept: glyphs.size - missing.length };
}

export function iconsCss(
  sheets: { weight: string; css: string; fontPath: string; glyphs: Set<string> }[],
  source: string,
) {
  const parts = [`/* GENERATED by arena build from ${source}. Edit those, not this file. */`];
  const missing = new Map();
  const kept = new Set();
  for (const { weight, css, fontPath, glyphs } of sheets) {
    const one = subset(css, weight, glyphs, fontPath);
    parts.push(one.css);
    for (const glyph of glyphs) if (!one.missing.includes(glyph)) kept.add(glyph);
    if (one.missing.length) missing.set(weight, one.missing);
  }
  return { css: `${parts.join('\n\n')}\n`, missing, kept: kept.size };
}
