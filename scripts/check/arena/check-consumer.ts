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
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, readdirSync, rmSync,
  symlinkSync,
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
import {
  THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET, PLUGIN_CSS, PLUGIN_LAYER, PLUGIN_LAYER_ORDER,
} from '../../generate/core/arena-to-prod/arena-to-prod.ts';
import { DEFAULT_PLUGIN, PLUGIN_TOKENS, pluginName } from '../../generate/core/arena-to-prod/theme-css.ts';
import { ROOT_PLUGIN } from '../core/check-style-plugin.ts';
import { WEIGHT_CLASSES } from '../../generate/core/arena-to-prod/icon-css.ts';
import { captured } from '../../utils/captures.ts';

export const node = {
  name: 'check:consumer',
  reads: ['frameworks/react/dist/**', 'frameworks/angular/dist/**'],
  writes: [],
  feeds: [],
};


export const CLI = 'bin/arena-to-prod.mjs';
export const GLYPH = 'ph-bell';
export const FILL = `.${WEIGHT_CLASSES.fill}`;

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

export const BREAKING: Record<string, { files: Record<string, string>; rules: string[] }> = {
  react: {
    files: {
      'src/App.tsx': "import { ArenaButton, ArenaCard } from '@dravensoft/arena-react';\n"
        + "import { Link } from 'react-router-dom';\n"
        + 'export const App = () => (<div style={{ padding: \'16px\', color: \'#b52a20\' }}>\n'
        + '  <ArenaButton\n'
        + '    onClick={() => go()}\n'
        + '    className="mine"\n'
        + '    icon={<Plus />}\n'
        + '  >\n'
        + '    Go \u{1F680}\n'
        + '  </ArenaButton>\n'
        + '  <Link to="/x">\n'
        + '    <ArenaCard>c</ArenaCard>\n'
        + '  </Link>\n'
        + '</div>);\n',
      'src/app.css': '.arena-button__label { color: #fff; }\n',
    },
    rules: ['own-class', 'router-link', 'raw-value', 'icon-element', 'emoji'],
  },
  angular: {
    files: {
      'src/app.html': '<arena-button\n'
        + '  class="mine"\n'
        + '  icon="ph-bold ph-bell"\n'
        + '>Go \u{1F680}</arena-button>\n'
        + '<a\n'
        + '  routerLink="/x"\n'
        + '>\n'
        + '  <arena-card></arena-card>\n'
        + '</a>\n',
      'src/app.css': '.arena-card__body { color: #fff; padding: 16px; }\n',
    },
    rules: ['own-class', 'router-link', 'raw-value', 'emoji'],
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

export type CliRun = {
  status: number | null; stdout: string; stderr: string;
  theme: string | null; icons: string | null; plugin: string | null;
};

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

export const PLUGINS = { total: './design/console', partial: './design/marketing' };

export const PARTIAL_ANSWERS = {
  'r-surface': { $type: 'dimension', $value: '{r.xs}' },
  'fill-surface': { $type: 'color', $value: '{color.base-300}' },
};

export const PAINTED = 'card.body';

export const PLUGIN_PAINT = `[data-arena-part="${PAINTED}"] {\n`
  + '  background: linear-gradient(180deg, var(--color-base-200), var(--color-base-100));\n}\n';

export const RESTATED = 'card.title';

export const PLUGIN_RESTATE = `[data-arena-part="${RESTATED}"] {\n`
  + '  font-family: var(--ff-heading);\n}\n';

export const REACHING_IN = 'src/reach.css';

export function pluginFixture(layer: string, plugins: string[], base = root) {
  const dir = fixture(layer, SOURCES[layer] ?? {}, AUTO, base);
  const written = readJson(join(dir, 'arena.config.json'));
  writeFileSync(join(dir, 'arena.config.json'), JSON.stringify({ ...written, stylePlugins: plugins }, null, 2));
  for (const entry of plugins) {
    if (entry === DEFAULT_PLUGIN) continue;
    const at = join(dir, ...entry.split('/'));
    mkdirSync(at, { recursive: true });
    if (pluginName(entry) === pluginName(PLUGINS.total)) {
      copyFileSync(join(base, ...ROOT_PLUGIN.split('/')), join(at, PLUGIN_TOKENS));
      continue;
    }
    writeFileSync(join(at, PLUGIN_TOKENS), `${JSON.stringify(PARTIAL_ANSWERS, null, 2)}\n`);
    writeFileSync(join(at, PLUGIN_CSS), PLUGIN_PAINT + PLUGIN_RESTATE);
  }
  writeFileSync(join(dir, ...REACHING_IN.split('/')), PLUGIN_PAINT);
  return dir;
}

export function stylePluginProblems(layer: string, valid: CliRun, partial: CliRun) {
  const problems = [];
  if (valid.status !== 0) {
    problems.push(`${layer}: a config naming two style plugins of its own exited ${valid.status}, so the `
      + `path a consumer takes has been run nowhere outside this repository:\n    ${valid.stderr.trim()}`);
  } else {
    const theme = valid.theme ?? '';
    if (!/:root\{[^}]*--pad-surface/.test(theme)) {
      problems.push(`${layer}: the first plugin in the list answered no role on :root, and that is what a `
        + 'page with no class on it looks like');
    }
    if (!theme.includes(`.arena-${pluginName(PLUGINS.partial)}`)) {
      problems.push(`${layer}: the second plugin reached no scope class of its own, so a build carrying `
        + 'two registers carries one');
    }
    if (theme.includes('/arena.css')) {
      problems.push(`${layer}: the theme still imports the barrel, and the barrel carries the sheet the `
        + 'package assembles, so the appearance this config replaced is loaded beside the one it wrote');
    }
  }
  if (partial.status === 0) {
    problems.push(`${layer}: a root style plugin leaving a role unanswered was accepted. A custom property `
      + 'with no value is invalid at computed-value time, so what a consumer gets is a missing border '
      + 'rather than a plainer appearance');
  } else if (!partial.stderr.includes('does not answer')) {
    problems.push(`${layer}: a partial root style plugin was refused without naming the role nobody `
      + `answers, which is the only thing that says what to write:\n    ${partial.stderr.trim()}`);
  }
  return problems;
}

export function layerProblems(layer: string, valid: CliRun) {
  const problems = [];
  const sheet = valid.plugin;
  if (!sheet) {
    problems.push(`${layer}: a style plugin carrying ${PLUGIN_CSS} produced no ${PLUGIN_SHEET}, so the CSS `
      + 'half of a plugin reaches no page at all');
    return problems;
  }
  if (!sheet.startsWith(PLUGIN_LAYER_ORDER)) {
    problems.push(`${layer}: ${PLUGIN_SHEET} does not lead with the layer order. A bare @layer `
      + `${PLUGIN_LAYER} block met before the order is declared registers that name as the LOWEST `
      + 'layer, and every plugin rule contesting a component rule then loses with nothing to report '
      + `it:\n    ${sheet.slice(0, 80)}`);
  }
  if (!sheet.includes(`@layer ${PLUGIN_LAYER} {`)) {
    problems.push(`${layer}: ${PLUGIN_SHEET} does not open the reserved layer. Every compiled component `
      + 'rule sits in @layer utilities at one class of specificity, so an unlayered plugin rule would '
      + `need !important to reach anything:\n    ${sheet.slice(0, 80)}`);
  }
  if (!sheet.includes(PAINTED)) {
    problems.push(`${layer}: ${PLUGIN_SHEET} carries no rule the plugin wrote, so the wrap is empty`);
  }
  return problems;
}

export function scopeProblems(layer: string, audited: CliRun) {
  const problems = [];
  const reported = audited.stderr.split('\n').filter((line) => line.includes('(own-class)'));
  if (reported.some((line) => line.includes(PLUGIN_CSS))) {
    problems.push(`${layer}: --audit reported a part selector inside a directory the config declares in `
      + 'stylePlugins. That directory is the one place a project\'s appearance is allowed to live, and '
      + `a gate a consumer cannot trust is worse than none:\n    ${reported[0]}`);
  }
  if (!reported.some((line) => line.includes(REACHING_IN))) {
    problems.push(`${layer}: the same rule in ${REACHING_IN} was not reported, so the audit no longer says `
      + 'where a project\'s appearance lives, which is half of what it reports');
  }
  if (audited.stderr.split('\n').some((line) => line.includes(PLUGIN_CSS) && line.includes('gradient'))) {
    problems.push(`${layer}: --audit reported a gradient inside a style plugin. A plugin paints one from its `
      + 'own stylesheet whatever the token tier says, so the norm records it as a report rather than a '
      + 'floor and --strict may not refuse what the norm permits');
  }
  if (!audited.stdout.includes(`paint 2 part(s): ${PAINTED}, ${RESTATED}`)) {
    problems.push(`${layer}: the run does not name the parts the plugin paints, and that note is where the `
      + `evidence for promoting a role comes from:\n    ${audited.stdout.trim()}`);
  }
  const restated = audited.stderr.split('\n').filter((line) => line.includes('changes nothing'));
  if (!restated.some((line) => line.includes(RESTATED))) {
    problems.push(`${layer}: the plugin restates the value ${RESTATED} already paints and the run says `
      + 'nothing. A part counts as painted because the audit reads source text, and a role is grown from '
      + `that count, so a restatement left unreported is evidence for a question nobody asked:\n    ${audited.stderr.trim().slice(0, 200)}`);
  }
  if (restated.some((line) => line.includes(PAINTED))) {
    problems.push(`${layer}: the gradient on ${PAINTED} was called a restatement, and the slot paints no `
      + 'gradient at all, so the rule is reporting a rule that does change something');
  }
  return problems;
}

export function installed(layer: string, dir: string, base = root) {
  const name = PACKAGES.find((p) => p.layer === layer)?.name;
  if (!name) throw new Error(`check-consumer: no package is declared for a layer called "${layer}"`);
  const at = join(dir, 'node_modules', ...name.split('/'));
  mkdirSync(join(at, '..'), { recursive: true });
  if (!existsSync(at)) linkDir(distDir(layer, base), at);
  return join(at, CLI);
}

export function runCli(layer: string, dir: string, base = root, extra: string[] = []) {
  const node = hostBinary('node', 'to run the CLI a consumer installs, the way a consumer runs it');
  const run = spawnSync(node, [installed(layer, dir, base), '--src', 'src', '--out', 'out', ...extra],
    { cwd: dir, encoding: 'utf8' });
  const read = (name: string) => {
    const at = join(dir, 'out', name);
    return readIfExists(at);
  };
  return {
    status: run.status,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    theme: read(THEME_SHEET),
    icons: read(ICONS_SHEET),
    plugin: read(PLUGIN_SHEET),
  };
}

export function auditProblems(layer: string, reported: CliRun, strict: CliRun, rules: string[]) {
  const problems = [];
  for (const rule of rules)
    if (!reported.stderr.includes(`(${rule})`))
      problems.push(`${layer}: --audit read a source breaking the ${rule} rule and reported nothing, `
        + 'so the one signal a consumer gets is silent about it');
  if (reported.status !== 0)
    problems.push(`${layer}: --audit exited ${reported.status} without --strict, and a finding is a `
      + 'report rather than a broken build until a project asks for one');
  if (strict.status !== 1)
    problems.push(`${layer}: --audit --strict exited ${strict.status} over a source breaking `
      + `${rules.length} rule(s), so a project that asked for a hard failure did not get one`);
  return problems;
}

export function cleanAuditProblems(layer: string, clean: CliRun) {
  const found = clean.stderr.split('\n').filter((line) => /\((own-class|router-link|raw-value|icon-element|emoji)\)/.test(line));
  return found.length === 0
    ? []
    : [`${layer}: --audit reported ${found.length} finding(s) over sources that break no rule, and a `
      + `gate a consumer cannot trust is worse than none: ${found[0]}`];
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
  problems.push(...iconProblems(layer, result.icons));
  if (bins.length === 0) problems.push(`${layer}: bin/ ships no command`);
  return problems;
}

export function iconProblems(layer: string, icons: string | null) {
  if (!icons) return [`${layer}: one invocation wrote no ${ICONS_SHEET}, so the icon half of the merge is gone`];
  const problems = [];
  if (!icons.includes(GLYPH)) {
    problems.push(`${layer}: ${ICONS_SHEET} names no ${GLYPH}, so the icon scan stopped reading consumer sources`);
  }
  if (!icons.includes(`${FILL}.${GLYPH}`)) {
    problems.push(`${layer}: the source names ${GLYPH} beside the bold weight alone and ${ICONS_SHEET} carries `
      + `no ${FILL}.${GLYPH} rule. The navigation swaps its active destination to the filled weight with no `
      + 'member for it, so a sheet without that rule loses the icon of the item the user just pressed');
  }
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
      const breaking = BREAKING[layer];
      const broken = fixture(layer, breaking?.files ?? {}, AUTO, base);
      const plugged = pluginFixture(layer, [PLUGINS.total, PLUGINS.partial], base);
      const partialRoot = pluginFixture(layer, [PLUGINS.partial], base);
      dirs.push(auto, unexported, named, unknown, unplaced, broken, plugged, partialRoot);

      const result = runCli(layer, auto, base);
      problems.push(...mergeProblems(layer, result, base));
      problems.push(...stemProblems(layer, result, ['arena-button', 'arena-table'], base));
      problems.push(...unknownSymbolProblems(layer, runCli(layer, unexported, base)));
      problems.push(...listProblems(layer, runCli(layer, named, base), runCli(layer, unknown, base), list));
      problems.push(...unplacedProblems(layer, runCli(layer, unplaced, base), strange?.name ?? ''));
      problems.push(...auditProblems(
        layer,
        runCli(layer, broken, base, ['--audit']),
        runCli(layer, broken, base, ['--audit', '--strict']),
        breaking?.rules ?? [],
      ));
      problems.push(...cleanAuditProblems(layer, runCli(layer, auto, base, ['--audit'])));
      const valid = runCli(layer, plugged, base, ['--strict']);
      problems.push(...stylePluginProblems(layer, valid, runCli(layer, partialRoot, base, ['--strict'])));
      problems.push(...layerProblems(layer, valid));
      problems.push(...scopeProblems(layer, runCli(layer, plugged, base, ['--src', 'design', '--audit'])));
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
  console.log(`check-consumer: both packages run ${CLI} from a node_modules/ path, resolve "auto" to the sheets `
    + `a consumer's sources name, and scope a style plugin of the project's own`
    + `${built ? ', after assembling what was missing' : ''}`);
}

if (isMainModule(import.meta.url)) main();
