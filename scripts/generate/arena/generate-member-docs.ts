/* Writes each contracted member's `description` into both layers' own TypeScript, above the
 * member it describes, so tsc and ng-packagr carry it into what a consumer's editor reads.
 * Nothing here transforms an emitted declaration: the fix is source, and the compiler does the
 * rest. check-api.ts then holds every block equal to its contract, so the copy cannot rot. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { docComment } from './generate-api-types.ts';
import { normaliseDoc } from '../../lib/arena/api-surface.ts';
import { memberEntries } from '../../lib/arena/contract-shapes.ts';
import type { ContractCandidate } from '../../lib/arena/contract-shapes.ts';
import type { ComponentTree } from '../../lib/arena/layers.ts';
import { captured } from '../../utils/captures.ts';

export const COMPONENT_SOURCES = [
  'frameworks/react/components/**/*.tsx', 'frameworks/angular/components/**/*.ts',
  '!frameworks/**/*.generated.*', '!frameworks/**/*.test.*',
];

export const node = {
  name: 'generate:member-docs',
  reads: ['contracts/api/components', 'frameworks/Components.json', ...COMPONENT_SOURCES],
  writes: COMPONENT_SOURCES,
  feeds: [
    'build:angular-demo',
    'build:angular-package',
    'build:angular-tests',
    'build:demos',
    'build:react-barrel',
    'build:react-package',
    'check:angular',
    'check:api',
    'check:appearance',
    'check:parts',
    'check:arbitrary',
    'check:behaviour',
    'check:boolean-inputs',
    'check:compliance',
    'check:demos',
    'check:dimensions',
    'check:duplicate-constants',
    'check:focus-trap',
    'check:generated',
    'check:icons',
    'check:layer-independence',
    'check:optional-inputs',
    'check:playgrounds',
    'check:react-barrel',
    'check:react-types',
    'check:script-tokens',
    'check:shared-arithmetic',
    'check:skills',
    'check:states',
    'generate:playgrounds',
    'build:site',
  ],
};

export const MEMBER_START: Record<string, RegExp> = {
  react: /^(\s*)([A-Za-z_$][\w$]*)(\??\s*:)/,
  angular: /^(\s*)(?:readonly\s+)([A-Za-z_$][\w$]*)(\s*=)/,
};

export function stripDocAbove(lines: string[], at: number) {
  let start = at;
  const above = (n: number) => lines[n - 1]?.trim() ?? '';
  while (start > 0 && above(start).startsWith('*')) start -= 1;
  if (start > 0 && above(start).startsWith('/**')) return start - 1;
  const single = lines[at - 1]?.trim();
  if (single && single.startsWith('/**') && single.endsWith('*/')) return at - 1;
  return at;
}

export const PACKED_MEMBERS = /^(\s*)((?:[A-Za-z_$][\w$]*\??\s*:\s*[^;{}]+;\s*){2,})$/;

export function unpackMembers(source: string) {
  return source.split('\n').flatMap((line) => {
    const packed = PACKED_MEMBERS.exec(line);
    if (!packed) return [line];
    const indent = captured(packed);
    return captured(packed, 2).trim().split(';').filter((d) => d.trim()).map((d) => `${indent}${d.trim()};`);
  }).join('\n');
}

export const REACT_PROPS_OPEN = /^export interface \w+Props\b[^{]*\{/;

export function applyDocs(source: string, docs: Map<string, string>, layer: string) {
  const lines = (layer === 'react' ? unpackMembers(source) : source).split('\n');
  const out = [];
  let reachable = layer !== 'react';
  const start = MEMBER_START[layer];
  if (!start) throw new Error(`applyDocs: no member pattern is declared for a layer called "${layer}"`);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (layer === 'react') {
      if (REACT_PROPS_OPEN.test(line)) reachable = true;
      else if (reachable && /^\}/.test(line)) reachable = false;
    }
    const match = reachable ? start.exec(line) : null;
    const wanted = match ? docs.get(captured(match, 2)) : undefined;
    if (!match || wanted === undefined) { out.push(line); continue; }

    const from = stripDocAbove(lines, i);
    out.length -= (i - from);
    out.push(docComment(wanted, match[1]));
    out.push(lines[i]);
  }
  return out.join('\n');
}

export function docsFor(
  contract: ContractCandidate,
  layer: string,
  bindingName: (name: string, form: string, layer: string) => string,
) {
  const docs = new Map();
  for (const [name, spec] of memberEntries(contract.api)) {
    if (!spec.description) continue;
    docs.set(bindingName(name, spec.form, layer), normaliseDoc(spec.description));
  }
  return docs;
}

export function writeMemberDocs({
  contracts, sources, bindingName,
  read = readFileSync as (path: string, encoding: string) => string,
  write = writeFileSync as (path: string, text: string) => void,
}: {
  contracts: ContractCandidate[];
  sources: Map<string, Record<string, string>>;
  bindingName: (name: string, form: string, layer: string) => string;
  read?: (path: string, encoding: string) => string;
  write?: (path: string, text: string) => void;
}) {
  const written = [];
  for (const contract of contracts) {
    const perLayer = Object.entries(
      (contract.component === undefined ? undefined : sources.get(contract.component)) ?? {},
    ) as [string, string][];
    for (const [layer, path] of perLayer) {
      if (!path) continue;
      const before = read(path, 'utf8');
      const after = applyDocs(before, docsFor(contract, layer, bindingName), layer);
      if (after !== before) { write(path, after); written.push(path); }
    }
  }
  return written;
}

type Resolver = (
  tree: ComponentTree, exists: (path: string) => boolean,
) => { implementations: Map<string, string> };

export function componentSources(
  resolveReact: Resolver, resolveAngular: Resolver, readLayer: (layer: string) => ComponentTree,
  exists: (path: string) => boolean,
) {
  const react = resolveReact(readLayer('react'), exists).implementations;
  const angular = resolveAngular(readLayer('angular'), exists).implementations;
  const sources = new Map();
  for (const [name, path] of react) sources.set(name, { react: join(root, path) });
  for (const [name, path] of angular) {
    sources.set(name, { ...(sources.get(name) ?? {}), angular: join(root, path) });
  }
  return sources;
}

async function main() {
  const { existsSync, readdirSync } = await import('node:fs');
  const { bindingName, resolveReactImplementations, resolveAngularImplementations } =
    await import('../../check/arena/check-api.ts');
  const { readLayer } = await import('../../lib/arena/layers.ts');

  const dir = join(root, 'contracts/api/components');
  const contracts = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => readJson(join(dir, f)));

  const sources = componentSources(
    resolveReactImplementations, resolveAngularImplementations, readLayer,
    (path: string) => existsSync(join(root, path)),
  );
  const written = writeMemberDocs({ contracts, sources, bindingName });
  for (const path of written) console.log(`generate-member-docs: wrote ${path.replace(`${root}/`, '')}`);
  console.log(`generate-member-docs: ${written.length} source(s) updated`);
}

if (isMainModule(import.meta.url)) await main();
