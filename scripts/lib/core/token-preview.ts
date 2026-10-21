/* Maps a token group to how the Overview draws it, and flattens a DTCG tree into the
 * rows that page lists. Here rather than in the token source, which stays platform
 * neutral. The Overview reaches this through the bundle build:intro writes. * A FlatToken is one row of that list: the custom-property name, the group it belongs
 * to, the path it was reached by, and whatever DTCG said about it. */

import { childEntries } from './dtcg-shapes.ts';
import type { DtcgNode } from './dtcg-shapes.ts';

const BY_GROUP: Record<string, string> = {
  color: 'swatch',
  font: 'family',
  fw: 'weight',
  fs: 'size',
  lh: 'leading',
  ls: 'tracking',
  sp: 'bar',
  gutter: 'bar',
  'container-max': 'bar',
  bp: 'breakpoint',
  dz: 'control',
  r: 'radius',
  bw: 'rule',
  'bw-strong': 'rule',
  shadow: 'elevation',
  'scrim-blur': 'bar',
  focus: 'rule',
  dur: 'duration',
  ease: 'easing',
};

const BY_TYPE: Record<string, string> = {
  color: 'swatch',
  dimension: 'bar',
  duration: 'duration',
  cubicBezier: 'easing',
  fontFamily: 'family',
  fontWeight: 'weight',
  shadow: 'elevation',
  number: 'value',
};

export function previewFor(group: string, type: string) {
  return BY_GROUP[group] ?? BY_TYPE[type] ?? 'value';
}

export type FlatToken = {
  name: string;
  group: string;
  path: string[];
  $type?: string;
  $description?: string;
};

export function flattenTokens(tree: DtcgNode): FlatToken[] {
  const out: FlatToken[] = [];
  const walk = (node: DtcgNode, path: string[], inheritedType?: string) => {
    const type = node.$type ?? inheritedType;
    if (node.$value !== undefined) {
      out.push({
        name: path.join('-'),
        group: path[0] as string,
        path,
        $type: type,
        $description: node.$description,
      });
      return;
    }
    for (const [key, child] of childEntries(node)) {
      walk(child, [...path, key], type);
    }
  };
  walk(tree, [], undefined);
  return out;
}
