/* What a typical Arena screen downloads, measured the way the plan-1.29 probe measured it: rollup with Arena kept
 * in a chunk of its own and esbuild minifying, brotli q11 beside the previous build as dictionary. check:weight
 * reads these figures against its budgets; weightProblems is the pure half. React comes from a vendored esm
 * entry, and moduleSideEffects is passed so tree-shaking works. The screen imports by name, never `import *`.
 * A Patch rewrites a module before it is bundled: a dist file by its path relative to dist, the app's two
 * modules by name. cssFigures runs the dist's `arena build` on a fixture under the repo's .cache/. Bun 1.3.14
 * ignores zlib's brotli dictionary, so a dictionary run goes through node, by stdin. */

import { brotliCompressSync, constants } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rollup, type Plugin } from 'rollup';
import { build, transform } from 'esbuild';
import { deadline, type Deadline } from './deadline.ts';
import { hostBinary } from './host-binary.ts';
import { linkDir } from './platform.ts';
import { isInside, relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from './repo-root.ts';

export const ARENA_BUILD: Deadline = deadline('weight:arena-build', 120_000,
  'one arena build on a twelve-component fixture takes about a second; the bound only ends a hang');

export type Patch = (file: string, text: string) => string;

const WITH_DICTIONARY = `
const zlib = require('node:zlib');
const all = require('node:fs').readFileSync(0);
const split = all.readUInt32BE(0) + 4;
const out = zlib.brotliCompressSync(all.subarray(split), {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_LGWIN]: 24 },
  dictionary: all.subarray(4, split),
});
process.stdout.write(String(out.length));
`;

export function brotliKB(bytes: Uint8Array, dictionary?: Uint8Array): number {
  let size: number;
  if (dictionary) {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(dictionary.length);
    const ran = spawnSync(hostBinary('node', 'to compress with a brotli dictionary, which bun 1.3.14 ignores'),
      ['-e', WITH_DICTIONARY], { input: Buffer.concat([head, dictionary, bytes]), maxBuffer: 1 << 20, timeout: ARENA_BUILD.ms });
    if (ran.status !== 0) throw new Error(`weight-measure: brotli with a dictionary exited ${ran.status}: ${ran.stderr}`);
    size = Number(ran.stdout.toString());
  } else {
    size = brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 },
    }).length;
  }
  return Math.round(size / 10.24) / 100;
}

const TYPICAL = ['ArenaAppBar', 'ArenaSideNav', 'ArenaButton', 'ArenaInput', 'ArenaCard', 'ArenaTable',
  'ArenaDialog', 'ArenaToastHost', 'ArenaStatCard', 'ArenaLineChart', 'ArenaSelect', 'ArenaTabs'];

export function typicalScreen(layer: 'react'): { components: string[] } {
  if (layer !== 'react') throw new Error(`weight-measure: the typical screen is measured for react, not ${layer}`);
  return { components: [...TYPICAL] };
}

function componentNamesIn(dist: string): string[] {
  const names = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const at = join(dir, entry.name);
      if (entry.isDirectory()) walk(at);
      else if (/^Arena\w+\.js$/.test(entry.name) && !entry.name.includes('generated')) {
        for (const m of readFileSync(at, 'utf8').matchAll(/^export (?:function|const) (Arena[A-Z]\w*)/gm)) names.add(m[1] ?? '');
      }
    }
  };
  walk(join(dist, 'components'));
  return [...names].sort();
}

const LOGIC = `
export function summarise(rows) {
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const byRegion = new Map();
  for (const r of rows) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + r.amount);
  return { total, regions: [...byRegion].map(([region, amount]) => ({ region, amount })) };
}
export const TITLE = 'Sales dashboard';
`;

function screen(names: string[]): string {
  const uses = names.map((n) => `h(${n}, { key: ${JSON.stringify(n)}, title: TITLE, label: TITLE, rows: s.regions, `
    + 'columns: [], items: [], options: [], tabs: [], series: [], open: false, value: \'\' })').join(',\n    ');
  return `
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { ${names.join(', ')} } from '@dravensoft/arena-react';
import { summarise, TITLE } from './app-logic.js';
function App() {
  const s = summarise([{ region: 'n', amount: 1 }]);
  return h('main', null,
    ${uses});
}
createRoot(document.getElementById('root')).render(h(App));
`;
}

const VENDOR = '\0react-vendor';
const LOGIC_ID = '\0app-logic.js';
const ENTRY_ID = '\0app-entry.js';

async function reactVendor(): Promise<string> {
  const names = Object.keys(await import('react')).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'default');
  const built = await build({
    stdin: {
      contents: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\n`
        + `export default React;\nexport const { ${names.join(', ')} } = React;\nexport { createRoot };\n`,
      resolveDir: repoRoot,
    },
    bundle: true, format: 'esm', write: false, logLevel: 'error', nodePaths: [join(repoRoot, 'node_modules')],
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return built.outputFiles[0]?.text ?? '';
}

export async function reactBundle(
  dist: string, entry: 'typical' | 'full', patch?: Patch,
): Promise<{ app: Uint8Array; react: Uint8Array; arena: Uint8Array }> {
  const names = entry === 'full' ? componentNamesIn(dist) : typicalScreen('react').components;
  const vendor = await reactVendor();
  const inDist = (id: string) => !id.startsWith('\0') && isInside(dist, id);
  const edit = (file: string, text: string) => (patch ? patch(file, text) : text);
  const plugin: Plugin = {
    name: 'weight-resolve',
    resolveId(source) {
      if (source === 'react' || source === 'react-dom/client') return VENDOR;
      if (source === '@dravensoft/arena-react') return join(dist, 'Index.generated.js');
      if (source === './app-logic.js') return LOGIC_ID;
      if (source === ENTRY_ID) return ENTRY_ID;
      return null;
    },
    load(id) {
      if (id === VENDOR) return vendor;
      if (id === LOGIC_ID) return edit('app-logic.js', LOGIC);
      if (id === ENTRY_ID) return edit('typical.js', screen(names));
      return null;
    },
    transform(code, id) {
      return inDist(id) && patch ? { code: patch(relPosix(dist, id), code), map: null } : null;
    },
  };
  const bundle = await rollup({
    input: ENTRY_ID,
    treeshake: { moduleSideEffects: (id) => !(inDist(id) && id.endsWith('.js')) },
    onwarn: () => {},
    plugins: [plugin, {
      name: 'weight-minify',
      async renderChunk(code) { return { code: (await transform(code, { minify: true, format: 'esm' })).code, map: null }; },
    }],
  });
  const { output } = await bundle.generate({
    format: 'es', entryFileNames: '[name]-[hash].js', chunkFileNames: '[name]-[hash].js',
    manualChunks: (id) => (id === VENDOR ? 'react' : inDist(id) ? 'arena' : undefined),
  });
  await bundle.close();
  const chunks = output.filter((o) => o.type === 'chunk');
  const bytes = (pick: (c: (typeof chunks)[number]) => boolean, what: string) => {
    const found = chunks.find(pick);
    if (!found) throw new Error(`weight-measure: the bundle holds no ${what} chunk, only ${chunks.map((c) => c.name).join(', ')}`);
    return Buffer.from(found.code);
  };
  return {
    app: bytes((c) => c.isEntry, 'entry'),
    react: bytes((c) => c.name === 'react', 'react'),
    arena: bytes((c) => c.name === 'arena', 'arena'),
  };
}

export type CssFigures = {
  arena: Uint8Array; app: Uint8Array; theme: Uint8Array; sprite: Uint8Array; fonts: Uint8Array[];
};

const PACKAGE_IMPORT = /^@import '@dravensoft\/[^']+';$/;

async function sheet(dir: string, file: string, patch: Patch | undefined, dist: string): Promise<Uint8Array> {
  const built = await build({
    entryPoints: [join(dir, 'src', file)], bundle: true, minify: true, write: false, logLevel: 'error',
    external: ['*.woff2', '*.woff', '*.ttf'], absWorkingDir: dir,
    plugins: patch ? [{
      name: 'weight-patch',
      setup(b) {
        b.onLoad({ filter: /\.css$/ }, (args) => {
          const text = readFileSync(args.path, 'utf8');
          const under = isInside(dist, args.path);
          return { contents: under ? patch(relPosix(dist, args.path), text) : text, loader: 'css', resolveDir: join(args.path, '..') };
        });
      },
    }] : [],
  });
  return Buffer.from(built.outputFiles[0]?.contents ?? new Uint8Array());
}

export async function cssFigures(dist: string, entry: 'typical' | 'full', patch?: Patch): Promise<CssFigures> {
  const names = entry === 'full' ? componentNamesIn(dist) : typicalScreen('react').components;
  const base = join(repoRoot, '.cache', 'check-weight');
  const dir = join(base, `css-${entry}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'node_modules', '@dravensoft'), { recursive: true });
  linkDir(dist, join(dir, 'node_modules', '@dravensoft', 'arena-react'));
  try {
    const example = JSON.parse(readFileSync(join(dist, 'arena.config.example.json'), 'utf8')) as { fonts?: Record<string, unknown> };
    writeFileSync(join(dir, 'arena.config.json'), JSON.stringify({ ...example, stylesheet: { components: 'auto' } }, null, 2));
    mkdirSync(join(dir, 'fonts'), { recursive: true });
    for (const f of readdirSync(join(dist, 'fonts'))) if (f.endsWith('.woff2')) writeFileSync(join(dir, 'fonts', f), readFileSync(join(dist, 'fonts', f)));
    writeFileSync(join(dir, 'src', 'App.jsx'), `import { ${names.join(', ')} } from '@dravensoft/arena-react';\n`
      + `export function App() { return <main>${names.map((n) => `<${n} />`).join('')}</main>; }\n`);
    const ran = spawnSync(hostBinary('node', 'to run the CLI a consumer installs'),
      [join(dir, 'node_modules', '@dravensoft', 'arena-react', 'bin', 'arena.mjs'), 'build', '--config', 'arena.config.json', '--src', 'src', '-o', 'out'],
      { cwd: dir, encoding: 'utf8', timeout: ARENA_BUILD.ms });
    if (ran.status !== 0) throw new Error(`weight-measure: arena build exited ${ran.status}: ${ran.stderr}${ran.stdout}`);
    const out = join(dir, 'out');
    const generated = readFileSync(join(out, 'arena.generated.css'), 'utf8');
    writeFileSync(join(dir, 'src', 'theme.css'), generated);
    writeFileSync(join(dir, 'src', 'arena-half.css'), generated.split('\n').filter((l) => PACKAGE_IMPORT.test(l)).join('\n'));
    writeFileSync(join(dir, 'src', 'app-half.css'), generated.split('\n').filter((l) => !PACKAGE_IMPORT.test(l)).join('\n'));
    const files = readdirSync(out);
    const one = (re: RegExp, what: string) => {
      const found = files.find((f) => re.test(f));
      if (!found) throw new Error(`weight-measure: arena build wrote no ${what} among ${files.join(', ')}`);
      return readFileSync(join(out, found));
    };
    return {
      arena: await sheet(dir, 'arena-half.css', patch, dist),
      app: await sheet(dir, 'app-half.css', patch, dist),
      theme: await sheet(dir, 'theme.css', patch, dist),
      sprite: one(/^icons-[0-9a-f]+\.svg$/, 'sprite'),
      fonts: files.filter((f) => /^[\w-]+-[0-9a-f]{10}\.woff2$/.test(f)).map((f) => readFileSync(join(out, f))),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export type Figure = { figure: string; kb: number };
export type Budget = Figure & { reason: string };
export type Ceiling = { figure: string; kb: number; reason: string };

export function weightProblems(figures: Figure[], budgets: Budget[], ceilings: Ceiling[]): string[] {
  const problems: string[] = [];
  const known = new Map(figures.map((f) => [f.figure, f.kb]));
  for (const { figure, kb, reason } of budgets) {
    const got = known.get(figure);
    if (got === undefined) problems.push(`${figure}: budgeted at ${kb} KB but not measured`);
    else if (got > kb) problems.push(`${figure}: ${got} KB is over its budget of ${kb} KB (${reason})`);
  }
  for (const { figure, kb, reason } of ceilings) {
    const got = known.get(figure);
    if (got === undefined) problems.push(`${figure}: ceilinged at ${kb} KB but not measured`);
    else if (got > kb) problems.push(`${figure}: ${got} KB is over its ceiling of ${kb} KB (${reason})`);
  }
  return problems;
}
