/* Assembles @dravensoft/arena-mcp into dist/mcp/. It is the only package here with a runtime
 * dependency, and a package of its own for that reason: the component libraries promise none. It
 * carries the corpus once per layer under agent/<layer>/, since the framework packages carry the
 * components and nothing else, and both layers, since a package cannot know at assembly time which
 * half it will be asked for; the server picks, reads the installed package's version and says so
 * when the two differ. The sources go through emitCli, so a relative specifier lands as .mjs and
 * Node never strips a type under node_modules. The rule module travels into bin/ with every module
 * it imports from beside itself, and check:mcp reports one that did not, so an import the
 * companion list misses fails the gate rather than the first spawn. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { writeVocabularyIndex } from '../../lib/arena/vocabulary-index.ts';
import {
  collectFiles, reset, write, copy, report, emitCli, pluginIdentity, SHARED_KEYWORDS,
  copyAgentPayload,
} from '../../lib/arena/package-assembly.ts';
import { AGENT_DIR, PACKAGES } from '../../generate/core/arena-mcp/payload.ts';

export const NAME = '@dravensoft/arena-mcp';
export const DIST = 'dist/mcp';
export const SOURCE = 'scripts/generate/core/arena-mcp';
export const NPM_PAGE = 'mcp/NPM.md';
export const ENTRY = 'bin/arena-mcp.mjs';
export const BIN = 'arena-mcp';
export const LAYERS = ['react', 'angular'];
export const REGISTRY_NAME = 'io.github.dravensoft-dev/arena';

export const AUDIT_SOURCE = 'scripts/generate/core/arena-cli/audit.ts';
export const AUDIT_FILE = 'bin/audit.mjs';
export const AUDIT_SPECIFIER = "'../arena-cli/audit.mjs'";
export const AUDIT_BESIDE = "'./audit.mjs'";
export const AUDIT_COMPANIONS = ['scripts/generate/core/arena-cli/icon-css.ts'];

export function beside(emitted: string) {
  if (!emitted.includes(AUDIT_SPECIFIER)) {
    throw new Error(`build-mcp-package: the server does not import ${AUDIT_SPECIFIER}, and this `
      + 'step exists to put that module beside it. The rule module is the one thing the server '
      + 'reads from outside its own directory, and bin/ is flat, so a rename that moves the '
      + 'specifier has to move this constant with it rather than shipping a dead import.');
  }
  return emitted.split(AUDIT_SPECIFIER).join(AUDIT_BESIDE);
}

export const RUNTIME_DEPENDENCIES = {
  '@modelcontextprotocol/server': '^2.0.0',
  zod: '^4.2.0',
};

export const node = {
  name: 'build:mcp-package',
  reads: [
    `${SOURCE}/**`, `!${SOURCE}/*.test.ts`, AUDIT_SOURCE, ...AUDIT_COMPANIONS, NPM_PAGE,
    '.claude-plugin/plugin.json', 'LICENSE',
    'skills/design/SKILL.md', 'skills/design/references/*.md', 'skills/design/references/*/*.md',
    'frameworks/INDEX.md', 'frameworks/VOCABULARY.md', 'contracts/design/*.json', 'contracts/api/components/*.json', 'contracts/behaviour/*.json',
    'frameworks/angular/ProjectionMarkers.ts', 'frameworks/angular/forms/*.ts',
    'frameworks/*/INDEX.md', 'frameworks/*/components/*/INDEX.md',
    'frameworks/*/components/**/*.prompt.md',
    'frameworks/*/components/**/*.behaviour.json',
    'plugin-style-store/default/*', 'plugin-style-store/complete/*', 'plugin-style-store/catalogue/INDEX.md',
    'plugin-style-store/catalogue/*/*', 'arena-from-scratch/identity*.html',
    'frameworks/tailwind/vocabulary/**', 'frameworks/tailwind/components/**/*.json',
  ],
  writes: [`${DIST}/**`],
  feeds: ['check:community', 'check:mcp'],
  releaseOnly: 'nothing in this repository consumes the assembled artefact, so a development loop pays '
    + 'nothing for it and bun run build:packages is where it is produced',
};

export function mcpKeywords(shared = SHARED_KEYWORDS) {
  return ['mcp', 'model-context-protocol', 'mcp-server', ...shared];
}

export function manifest(root = repoRoot) {
  return {
    name: NAME,
    mcpName: REGISTRY_NAME,
    description: 'Arena by Dravensoft over the Model Context Protocol: the router, the references '
      + 'and every component document, in React and in Angular, served to an agent in your '
      + 'editor. It carries the language the component packages leave out.',
    keywords: mcpKeywords(),
    ...pluginIdentity(root),
    type: 'module',
    bin: { [BIN]: `./${ENTRY}` },
    engines: { node: '>=20' },
    dependencies: RUNTIME_DEPENDENCIES,
    exports: { '.': `./${ENTRY}`, './package.json': './package.json' },
  };
}

export function sources(root = repoRoot) {
  const from = join(root, SOURCE);
  const found = collectFiles(from, (path) => path.endsWith('.ts') && !path.endsWith('.test.ts'));
  if (found.length === 0) {
    throw new Error(`build-mcp-package: ${SOURCE} holds no source, so the package would declare a bin `
      + 'that resolves to nothing and every editor configured against it would fail at spawn');
  }
  return found.sort();
}

export function servedPackages() {
  return PACKAGES;
}

export function buildMcpPackage(root = repoRoot, dir = join(root, DIST)) {
  reset(dir);
  const written = [];

  for (const file of sources(root)) {
    const rel = relPosix(join(root, SOURCE), file);
    const emitted = emitCli(readFileSync(file, 'utf8'));
    const text = rel === 'arena-mcp.ts' ? beside(emitted) : emitted;
    written.push(write(dir, `bin/${rel.replace(/\.ts$/, '.mjs')}`, text));
  }
  written.push(write(dir, AUDIT_FILE,
    emitCli(readFileSync(join(root, ...AUDIT_SOURCE.split('/')), 'utf8'))));
  for (const companion of AUDIT_COMPANIONS) {
    written.push(write(dir, `bin/${companion.split('/').at(-1)?.replace(/\.ts$/, '.mjs')}`,
      emitCli(readFileSync(join(root, ...companion.split('/')), 'utf8'))));
  }
  if (!written.some((path) => path.endsWith(ENTRY.split('/').at(-1) ?? ''))) {
    throw new Error(`build-mcp-package: nothing was written to ${ENTRY}, which the manifest declares `
      + 'as the bin, so the package would install a command that is not there');
  }

  for (const layer of LAYERS) {
    written.push(...copyAgentPayload(dir, layer, NAME, root));
    written.push(writeVocabularyIndex(join(dir, AGENT_DIR, layer), root));
  }

  written.push(copy(join(root, ...NPM_PAGE.split('/')), dir, 'README.md'));
  written.push(copy(join(root, 'LICENSE'), dir, 'LICENSE'));
  written.push(write(dir, 'package.json', `${JSON.stringify(manifest(root), null, 2)}\n`));
  return { dir, written };
}

function main() {
  const { dir, written } = buildMcpPackage();
  console.log(report('build-mcp-package', dir, written));
}

if (isMainModule(import.meta.url)) main();
