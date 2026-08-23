/* Assembles @dravensoft/arena-mcp into dist/mcp/. It is the only package here with a runtime
 * dependency, and it is a package of its own for exactly that reason: the component libraries
 * promise none, and a server nobody imports into a screen has no business putting one inside
 * them. It carries NO corpus. The language ships in the framework package a project already
 * depends on, so this server resolves that payload at run time and cannot go stale against the
 * components beside it; what it carries is transport. The sources go through emitCli, so a
 * relative specifier lands as .mjs and Node never has to strip a type under node_modules. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  collectFiles, reset, write, copy, report, emitCli, pluginIdentity, SHARED_KEYWORDS,
} from '../../lib/arena/package-assembly.ts';
import { PACKAGES } from '../../generate/core/arena-mcp/payload.ts';

export const NAME = '@dravensoft/arena-mcp';
export const DIST = 'dist/mcp';
export const SOURCE = 'scripts/generate/core/arena-mcp';
export const NPM_PAGE = 'mcp/NPM.md';
export const ENTRY = 'bin/arena-mcp.mjs';
export const BIN = 'arena-mcp';

export const RUNTIME_DEPENDENCIES = {
  '@modelcontextprotocol/server': '^2.0.0',
  zod: '^4.2.0',
};

export const node = {
  name: 'build:mcp-package',
  reads: [`${SOURCE}/**`, `!${SOURCE}/*.test.ts`, NPM_PAGE, '.claude-plugin/plugin.json', 'LICENSE'],
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
    description: 'Arena by Dravensoft over the Model Context Protocol: the router, the references '
      + 'and every component document of the Arena package your project already installs, served '
      + 'to an agent in your editor. It carries no copy of the language.',
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

export function buildMcpPackage(root = repoRoot) {
  const dir = join(root, DIST);
  reset(dir);
  const written = [];

  for (const file of sources(root)) {
    const rel = relPosix(join(root, SOURCE), file);
    written.push(write(dir, `bin/${rel.replace(/\.ts$/, '.mjs')}`, emitCli(readFileSync(file, 'utf8'))));
  }
  if (!written.some((path) => path.endsWith(ENTRY.split('/').at(-1) ?? ''))) {
    throw new Error(`build-mcp-package: nothing was written to ${ENTRY}, which the manifest declares `
      + 'as the bin, so the package would install a command that is not there');
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
