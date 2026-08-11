/* The one gate that runs what a consumer runs. Every other package claim reads dist/ as
 * files; this spawns the CLI each package ships, from a `node_modules/` path, and reads what
 * it writes. The location is load-bearing: Node refuses to strip types under node_modules on
 * purpose, so a command run from dist/ proves nothing about the same command where it is
 * installed. The dist is symlinked into the fixture's node_modules and run from there;
 * arena-to-prod walks up from bin/ to find its root, so that link IS the package, and the
 * config is the example the package itself ships. Assembly is a prerequisite rather than a
 * step: a dist/ already there is left alone, and only a missing one is built, because
 * build:packages costs minutes and this gate costs seconds. The named sheet list is read from
 * the README the package ships, which is that layer's PACKAGE.md. */

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson, readIfExists } from '../../utils/read-file.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { linkDir } from '../../lib/arena/platform.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { PACKAGES, distDir } from './check-packages.ts';
import { CLI_BINS } from '../../lib/arena/package-assembly.ts';
import { THEME_SHEET, ICONS_SHEET } from '../../generate/core/arena-to-prod/arena-to-prod.ts';
import { captured } from '../../utils/captures.ts';

export const node = {
  name: 'check:consumer',
  reads: ['frameworks/react/dist/**', 'frameworks/angular/dist/**'],
  writes: [],
  feeds: [],
};


export const CLI = 'bin/arena-to-prod.mjs';
export const GLYPH = 'ph-bell';

export const SOURCES: Record<string, Record<string, string>> = {
  react: {
    'src/App.tsx': "import { ArenaButton, ArenaTable } from '@dravensoft/arena-react';\n"
      + "export const App = () => <ArenaButton icon=\"ph-bold ph-bell\">Go</ArenaButton>;\n",
    'src/Old.txt': 'not a source extension, so the walk never reads it\n',
  },
  angular: {
    'src/app.html': '<arena-button icon="ph-bold ph-bell">Go</arena-button>\n<arena-table></arena-table>\n',
  },
};

export const UNPLACED: Record<string, { files: Record<string, string>; name: string }> = {
  react: {
    files: {
      'src/App.tsx': "import { ArenaButton, ArenaWidget } from '@dravensoft/arena-react';\n"
        + 'export const App = () => (<><ArenaButton>Go</ArenaButton><ArenaWidget /></>);\n',
    },
    name: 'ArenaWidget',
  },
  angular: {
    files: { 'src/app.html': '<arena-button>Go</arena-button>\n<arena-widget></arena-widget>\n' },
    name: 'arena-widget',
  },
};

export const UNKNOWN: Record<string, Record<string, string>> = {
  react: { 'src/App.tsx': "import { Button } from '@dravensoft/arena-react';\nexport const App = () => <Button>Go</Button>;\n" },
  angular: { 'src/app.html': '<arena-nothing-at-all></arena-nothing-at-all>\n' },
};

export function assembled(layer: string, base = root) {
  return existsSync(join(distDir(layer, base), 'package.json'));
}

export function assemble(base = root) {
  const missing = PACKAGES.filter(({ layer }) => !assembled(layer, base)).map(({ layer }) => layer);
  if (missing.length === 0) return { built: false, missing };
  const run = spawnSync(process.execPath, ['run', 'build:packages'], { cwd: base, encoding: 'utf8' });
  if (run.status !== 0) {
    throw new Error(`check-consumer: ${missing.join(' and ')} is not assembled and build:packages failed:\n`
      + `${run.stderr ?? ''}`);
  }
  return { built: true, missing };
}

export type CliRun = { status: number | null; stderr: string; theme: string | null; icons: string | null };

export function fixture(
  layer: string, files: Record<string, string>, stylesheet: Record<string, unknown>, base = root,
) {
  const dir = mkdtempSync(join(tmpdir(), `arena-consumer-${layer}-`));
  const example = readJson(join(distDir(layer, base), 'arena.config.example.json'));
  writeFileSync(join(dir, 'arena.config.json'), JSON.stringify({ ...example, stylesheet }, null, 2));
  for (const [rel, body] of Object.entries(files) as [string, string][]) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  return dir;
}

export function installed(layer: string, dir: string, base = root) {
  const name = PACKAGES.find((p) => p.layer === layer)?.name;
  if (!name) throw new Error(`check-consumer: no package is declared for a layer called "${layer}"`);
  const at = join(dir, 'node_modules', ...name.split('/'));
  mkdirSync(join(at, '..'), { recursive: true });
  if (!existsSync(at)) linkDir(distDir(layer, base), at);
  return join(at, CLI);
}

export function runCli(layer: string, dir: string, base = root) {
  const node = hostBinary('node', 'to run the CLI a consumer installs, the way a consumer runs it');
  const run = spawnSync(node, [installed(layer, dir, base), '--src', 'src', '--out', 'out'],
    { cwd: dir, encoding: 'utf8' });
  const read = (name: string) => {
    const at = join(dir, 'out', name);
    return readIfExists(at);
  };
  return { status: run.status, stderr: run.stderr ?? '', theme: read(THEME_SHEET), icons: read(ICONS_SHEET) };
}

export function importedSheets(css: string | null) {
  return [...(css ?? '').matchAll(/@import '[^']*\/css\/components\/([^']+)\.css';/g)].map((m) => m[1]).sort();
}

export function mergeProblems(layer: string, result: CliRun, base = root) {
  const problems = [];
  const bins = readdirSync(join(distDir(layer, base), 'bin'))
    .filter((f) => f.endsWith('.ts') || f.endsWith('.mjs'));
  if (Object.keys(CLI_BINS).length !== 1) {
    problems.push(`${layer}: the package advertises ${Object.keys(CLI_BINS).length} commands. One command reads `
      + 'one config and writes both sheets; a second one is the split this major removed');
  }
  if (result.status !== 0) {
    problems.push(`${layer}: ${CLI} exited ${result.status} on a config the package itself ships:\n    ${result.stderr.trim()}`);
    return problems;
  }
  if (!result.theme) problems.push(`${layer}: one invocation wrote no ${THEME_SHEET}`);
  if (!result.icons) problems.push(`${layer}: one invocation wrote no ${ICONS_SHEET}, so the icon half of the merge is gone`);
  if (result.icons && !result.icons.includes(GLYPH)) {
    problems.push(`${layer}: ${ICONS_SHEET} names no ${GLYPH}, so the icon scan stopped reading consumer sources`);
  }
  if (bins.length === 0) problems.push(`${layer}: bin/ ships no command`);
  return problems;
}

export function stemProblems(layer: string, result: CliRun, expected: string[], base = root) {
  const problems = [];
  const sheet = join(distDir(layer, base), 'css', 'components', 'arena-button.css');
  if (!existsSync(sheet)) {
    problems.push(`${layer}: css/components/arena-button.css is not shipped, so a sheet stem is not the class it defines`);
  } else if (!readFileSync(sheet, 'utf8').includes('.arena-button__root')) {
    problems.push(`${layer}: css/components/arena-button.css defines no .arena-button__root. A sheet's stem `
      + 'and the class inside it are one name, which is what lets a consumer name a component and reach its CSS');
  }
  const drawn = importedSheets(result.theme);
  for (const name of expected) {
    if (!drawn.includes(name)) {
      problems.push(`${layer}: "components": "auto" resolved [${drawn.join(', ')}] and not ${name}, `
        + 'so what the consumer wrote reached no sheet');
    }
  }
  return problems;
}

export function unplacedProblems(layer: string, result: CliRun, name: string) {
  if (result.status !== 0) return [`${layer}: the run naming ${name} exited ${result.status} instead of reporting it`];
  if (result.stderr.includes(`${name} is not a component this package ships`)) return [];
  return [`${layer}: a source names ${name}, which this package does not ship, and the run said nothing `
    + 'about it. A name the scan cannot place is the one warning that separates a typo from a component '
    + `whose sheet is simply missing, and both render with no border and no colour:\n    ${result.stderr.trim()}`];
}

export function unknownSymbolProblems(layer: string, result: CliRun) {
  if (result.status === 0 && importedSheets(result.theme).length > 0) {
    return [`${layer}: a source naming a symbol this package does not export still resolved `
      + `[${importedSheets(result.theme).join(', ')}]. Nothing answers to a name Arena does not ship: there is `
      + 'no alias and no re-export, and a consumer hears it from the command rather than from a blank screen'];
  }
  return [];
}

export function listProblems(layer: string, named: CliRun, unknown: CliRun, list: string[] = []) {
  const problems = [];
  if (named.status !== 0) {
    problems.push(`${layer}: the sheet list its own README documents, [${list.join(', ')}], was refused:\n    ${named.stderr.trim()}`);
  }
  if (unknown.status === 0) {
    problems.push(`${layer}: a stylesheet.components naming "button" was accepted, so a consumer's stale list `
      + 'fails at render rather than at the command');
  } else if (!unknown.stderr.includes('arena-button')) {
    problems.push(`${layer}: the refusal does not list the sheets the package ships, which is the only thing `
      + 'that tells a migrating consumer what to write instead');
  }
  return problems;
}

const AUTO = { components: 'auto', preflight: false };

export const DOCUMENTED_LIST = /"components":\s*\[([^\]]*)\]/g;

export function documented(page: string) {
  const lists = [...page.matchAll(DOCUMENTED_LIST)];
  if (lists.length !== 1) return { lists: lists.length, names: null };
  const names = captured(lists[0] ?? null).split(',').map((one) => one.trim().replace(/^"|"$/g, '')).filter(Boolean);
  return { lists: 1, names };
}

export function collect(base = root) {
  const problems = [];
  const { built } = assemble(base);
  const dirs = [];
  try {
    for (const { layer } of PACKAGES) {
      const sources = SOURCES[layer] ?? {};
      const auto = fixture(layer, sources, AUTO, base);
      const unexported = fixture(layer, UNKNOWN[layer] ?? {}, AUTO, base);
      const { lists, names: list } = documented(readFileSync(join(distDir(layer, base), 'README.md'), 'utf8'));
      if (!list) {
        problems.push(`${layer}: the shipped README spells ${lists} stylesheet.components lists rather than one, `
          + 'so the example a consumer copies is either absent or shadowed by another');
        continue;
      }
      const named = fixture(layer, sources, { components: list }, base);
      const unknown = fixture(layer, sources, { components: ['button'] }, base);
      const strange = UNPLACED[layer];
      const unplaced = fixture(layer, strange?.files ?? {}, AUTO, base);
      dirs.push(auto, unexported, named, unknown, unplaced);

      const result = runCli(layer, auto, base);
      problems.push(...mergeProblems(layer, result, base));
      problems.push(...stemProblems(layer, result, ['arena-button', 'arena-table'], base));
      problems.push(...unknownSymbolProblems(layer, runCli(layer, unexported, base)));
      problems.push(...listProblems(layer, runCli(layer, named, base), runCli(layer, unknown, base), list));
      problems.push(...unplacedProblems(layer, runCli(layer, unplaced, base), strange?.name ?? ''));
    }
  } finally {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  }
  return { problems, built };
}

function main() {
  const { problems, built } = collect();
  if (problems.length > 0) {
    console.error(`check-consumer: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-consumer: both packages run ${CLI} from a node_modules/ path and resolve "auto" to the sheets `
    + `a consumer's sources name${built ? ', after assembling what was missing' : ''}`);
}

if (isMainModule(import.meta.url)) main();
