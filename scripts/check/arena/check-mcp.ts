/* The MCP package against what it promises. Four claims. It declares the dependencies it
 * actually imports and no others, since a server that resolves at build and throws at spawn is
 * the shape an editor reports as a broken configuration rather than a missing package. Its bin
 * resolves to a file that is there. It carries NO corpus, which is the whole of its design: a
 * document inside it would be a third copy of the language ageing on a schedule of its own, and
 * the emptiness is what this gate asserts rather than a comment claiming it. And the catalogue it
 * would build from a real payload reaches every component the tree declares, since a server that
 * serves half the library answers the other half with silence. dist/ is git-ignored, so the last
 * two skip when nothing has been assembled. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  DIST, SOURCE, ENTRY, BIN, NAME, RUNTIME_DEPENDENCIES, manifest, sources,
} from '../../build/arena/build-mcp-package.ts';
import { catalogue } from '../../generate/core/arena-mcp/catalogue.ts';
import { manifestIn } from '../../generate/core/arena-mcp/payload.ts';
import { AGENT_DIR } from '../../lib/arena/agent-payload.ts';
import { LAYERS } from '../../lib/arena/layers.ts';

export const node = {
  name: 'check:mcp',
  reads: [`${SOURCE}/**`, `${DIST}/**`, 'frameworks/Components.json', 'frameworks/*/dist/agent/**'],
  writes: [],
  feeds: [],
};

export const BARE_IMPORT = /^\s*import\s(?:[^'"]*\sfrom\s)?['"]([^.'"][^'"]*)['"]/gm;

export function importedPackages(base = root) {
  const found = new Set<string>();
  for (const file of sources(base)) {
    for (const one of readFileSync(file, 'utf8').matchAll(BARE_IMPORT)) {
      const specifier = one[1] ?? '';
      if (specifier.startsWith('node:')) continue;
      found.add(specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : (specifier.split('/')[0] ?? specifier));
    }
  }
  return found;
}

export function dependencyProblems(
  base = root, declared: Record<string, string> = RUNTIME_DEPENDENCIES,
) {
  const imported = importedPackages(base);
  const names = new Set(Object.keys(declared));
  const problems = [];
  for (const one of imported) {
    if (names.has(one)) continue;
    problems.push(`${NAME} imports ${one} and declares no dependency on it, so the package installs `
      + 'and the server throws at spawn, which an editor reports as a broken configuration rather '
      + 'than a missing package');
  }
  for (const one of names) {
    if (imported.has(one)) continue;
    problems.push(`${NAME} declares a dependency on ${one} and imports it nowhere, so every consumer `
      + 'installs a package this server never reaches');
  }
  return problems;
}

export function assembled(base = root) {
  return join(base, ...DIST.split('/'));
}

export function binProblems(dir: string) {
  const declared = manifest().bin?.[BIN];
  if (declared !== `./${ENTRY}`) {
    return [`${NAME}: the manifest declares ${BIN} at ${declared} rather than ./${ENTRY}`];
  }
  return existsSync(join(dir, ...ENTRY.split('/')))
    ? []
    : [`${NAME}: ${ENTRY} is declared as the bin and is not there, so the command an editor spawns `
       + 'does not exist'];
}

export const CORPUS = /\.(md|prompt\.md)$/;

export function corpusProblems(dir: string) {
  return walkFiles(dir)
    .map((path) => relPosix(dir, path))
    .filter((rel) => rel !== 'README.md' && CORPUS.test(rel))
    .map((rel) => `${NAME} carries ${rel}. This package serves the corpus its consumer already `
      + 'installs and carries none of its own: a document inside it is a third copy of the language, '
      + 'ageing on a release schedule of its own, which is the thing the design refuses');
}

export function payloadDir(layer: string, base = root) {
  return join(base, 'frameworks', layer, 'dist', AGENT_DIR);
}

export function catalogueProblems(base = root) {
  const declared = readJson(join(base, 'frameworks', 'Components.json')) as Record<string, string[]>;
  const expected = Object.values(declared).flat().length;
  const problems = [];
  for (const layer of LAYERS.filter((one) => one !== 'tailwind')) {
    const payload = payloadDir(layer, base);
    if (!existsSync(payload)) continue;
    const found = manifestIn(payload);
    if (found === null) { problems.push(`${payload} carries no manifest`); continue; }
    const served = catalogue(payload, found).entries
      .filter((one) => one.uri.startsWith('arena://component/')).length;
    if (served === expected) continue;
    problems.push(`${NAME} would serve ${served} component document(s) of the ${layer} layer against `
      + `the ${expected} the tree declares. A server that serves half the library answers the other `
      + 'half with silence, and a caller has no way to tell that from a component that does not exist');
  }
  return problems;
}

export function collect(base = root) {
  const dir = assembled(base);
  const problems = [...dependencyProblems(base), ...catalogueProblems(base)];
  if (!existsSync(dir)) return { problems, assembled: false };
  return {
    problems: [...problems, ...binProblems(dir), ...corpusProblems(dir)],
    assembled: true,
  };
}

function main() {
  const { problems, assembled: built } = collect();
  if (problems.length > 0) {
    console.error(`check-mcp: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-mcp: ${NAME} declares the ${Object.keys(RUNTIME_DEPENDENCIES).length} dependency `
    + `it imports, ${built ? 'ships its bin and carries no corpus' : 'is not assembled, so the bin and '
    + 'the corpus rule went unread'}, and would serve every component the tree declares`);
}

if (isMainModule(import.meta.url)) main();
