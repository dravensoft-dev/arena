/* The consumer references a gate reads in place of a layer's npm page. A topic that differs by
 * layer is one file, so a section names its layer in its heading: "in React", "the Angular
 * package". A section naming neither layer answers both, and a sub-heading inherits the layer of
 * the heading above it unless it names one itself. The text a layer is held to is its own
 * sections and the shared ones, never the other layer's: a symbol written only under an Angular
 * heading is no home for a React export. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const REFERENCES = 'skills/design/references';

export type Layer = 'react' | 'angular';

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*)$/;

export function layerOfHeading(heading: string): Layer | null {
  const react = /\bReact\b/.test(heading);
  const angular = /\bAngular\b/.test(heading);
  if (react === angular) return null;
  return react ? 'react' : 'angular';
}

export function layerText(text: string, layer: Layer) {
  const kept: string[] = [];
  const owners: (Layer | null)[] = [];
  let owner: Layer | null = null;
  let fenced = false;
  for (const line of text.split('\n')) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = fenced ? null : HEADING.exec(line);
    if (heading) {
      const level = (heading[1] ?? '#').length;
      owners.length = Math.min(owners.length, level - 1);
      while (owners.length < level - 1) owners.push(null);
      owner = layerOfHeading(heading[2] ?? '') ?? (level > 2 ? owners[level - 2] ?? null : null);
      owners[level - 1] = owner;
    }
    if (owner === null || owner === layer) kept.push(line);
  }
  return kept.join('\n');
}

export function referenceText(base: string, files: string[], layer: Layer) {
  return files
    .map((name) => join(base, ...REFERENCES.split('/'), name))
    .filter((path) => existsSync(path))
    .map((path) => layerText(readFileSync(path, 'utf8'), layer))
    .join('\n');
}

export function plainReferenceText(base: string, files: string[]) {
  return files
    .map((name) => join(base, ...REFERENCES.split('/'), name))
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
}
