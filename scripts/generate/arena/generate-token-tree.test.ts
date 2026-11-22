/* The tree's two properties are that every role lands in exactly one leaf and that a leaf is placed
 * by a person and only filled by the script. These hold both over the real role file and over temp
 * trees, so a page with no markers is refused and a page that is current comes back unchanged. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import {
  TREE, TREE_DIR, TREE_OPEN, TREE_CLOSE, roleLeaf, markupLeaf, regionBodies, renderTree, writeTree,
  COMPAT, roleUtilities, roleColourKeys, combination, stateRows, defaultAnswer,
} from './generate-token-tree.ts';
import { compileLayer, escapeClass } from '../../lib/tailwind/tailwind-compile.ts';

const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

const put = (base: string, rel: string, text: string) => {
  mkdirSync(dirname(join(base, rel)), { recursive: true });
  writeFileSync(join(base, rel), text);
};

const role = (audience: string, task: string, extra: Record<string, unknown> = {}, description = 'A role. It asks something.') => ({
  $type: 'dimension', $description: description, $extensions: { [ARENA_EXT]: { audience, task, userScale: 'fixed', question: 'What is it?', ...extra } },
});

const fixture = () => {
  const base = mkdtempSync(join(tmpdir(), 'token-tree-'));
  made.push(base);
  put(base, 'contracts/design/roles.json', JSON.stringify({
    'r-surface': role('markup', 'edges', {}, 'The corner of a surface. It is a role.'),
    'size-sm-control-h': role('component', 'component-size', { default: '{sp-8}' }),
  }));
  put(base, 'frameworks/tailwind/Theme.css', '@theme {\n  --radius-surface: var(--r-surface);\n  --radius-surface-alt: var(--r-surface);\n}\n');
  put(base, 'contracts/design/layering.json', JSON.stringify({
    z: { $type: 'number', $description: 'Layering.', nav: { $value: 800, $description: 'Fixed page navigation. It sits low.' }, toast: { $value: 1300, $description: 'Above all.' } },
  }));
  put(base, 'plugin-style-store/default/plugin.tokens.json', JSON.stringify({
    'r-surface': { $type: 'dimension', $value: '{r.lg}' },
    'size-sm-control-h': { $type: 'dimension', $value: '{dz.ctl-h}' },
  }));
  for (const [index, children] of Object.entries(TREE)) {
    const dir = dirname(index);
    const own = index === 'index.md' ? 'Tokens' : `${dir} index`;
    put(base, `${TREE_DIR}/${index}`, `# ${own}\n\nRead this when you pick a token for ${dir}. More text.\n\n${TREE_OPEN}\n\nold\n\n${TREE_CLOSE}\n`);
    for (const child of children) {
      const rel = child.endsWith('index.md') ? child : `${dir === '.' ? '' : `${dir}/`}${child}.md`;
      if (child.endsWith('index.md')) continue;
      put(base, `${TREE_DIR}/${rel}`, `# ${child} leaf\n\nIntro. Read this when you want ${child}. Tail.\n\n${TREE_OPEN}\n\nold\n\n${TREE_CLOSE}\n`);
    }
  }
  return base;
};

test('every role lands in exactly one role leaf', () => {
  const roles = readJson(join(repoRoot, 'contracts/design/roles.json')) as Record<string, { $extensions: Record<string, { audience: string; task: string }> }>;
  const counts: Record<string, number> = {};
  for (const [name, token] of Object.entries(roles)) {
    const leaf = roleLeaf(name, token.$extensions[ARENA_EXT]!);
    counts[leaf] = (counts[leaf] ?? 0) + 1;
  }
  assert.deepEqual(counts, {
    'plugin/surfaces-and-text.md': 20, 'plugin/edges.md': 22, 'plugin/space-and-layout.md': 18, 'plugin/type.md': 20,
    'plugin/depth-and-motion.md': 15, 'plugin/states.md': 20,
    'components/air.md': 33, 'components/type.md': 4, 'components/size-controls.md': 44, 'components/size-content.md': 42,
    'components/emphasis-and-accent.md': 21, 'components/status-hues.md': 20,
    'components/controls-and-marks.md': 7,
  });
});

test('units is a markup leaf and the markup index links it', () => {
  assert.ok(TREE['markup/index.md']!.includes('units'));
  assert.equal(markupLeaf('units'), 'markup/units.md');
  assert.ok(regionBodies().get('markup/index.md')!.includes('(./units.md)'));
});

test('a role no leaf rule takes throws', () => {
  assert.throws(() => roleLeaf('mystery-role', { audience: 'component', task: 'surfaces-and-text' }), /mystery-role/);
  assert.equal(roleLeaf('mix-hover', { audience: 'markup', task: 'states' }), 'plugin/states.md');
  assert.throws(() => markupLeaf('component-size'), /markup\/component-size\.md/);
  assert.equal(markupLeaf('layers'), 'markup/layers.md');
  assert.throws(() => roleLeaf('mystery-role', { audience: 'markup', task: 'meaning-and-identity' }), /mystery-role/);
});

test('an index row is the child headline and its Read this sentence', () => {
  const base = fixture();
  const bodies = regionBodies(base);
  assert.equal(bodies.get('index.md')!.split('\n')[0], '- [markup index](./markup/index.md): Read this when you pick a token for markup.');
  assert.ok(bodies.get('markup/index.md')!.includes('- [edges leaf](./edges.md): Read this when you want edges.'));
});

const HEADER = '| role | question | type | user scale | role default | `default` answers |';
const anyRow = (bodies: Map<string, string>, name: string) => {
  const rows = [...bodies].filter(([path]) => /^(plugin|components)\//.test(path)).flatMap(([, body]) => body.split('\n')).filter((line) => line.startsWith(`| \`--${name}\` | `));
  assert.equal(rows.length, 1, `${name} has one row among the plugin and component leaves`);
  return rows[0]!;
};
const plugin = readJson(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json')) as Record<string, any>;
const answerOf = (name: string, light: boolean) => (light ? plugin.light[name] : undefined)?.$value ?? plugin[name].$value;

test('the default column reads the default plugin per polarity', () => {
  const real = regionBodies(repoRoot);
  const lastCell = (row: string) => row.replace(/ \|$/, '').split(' | ').pop();
  const fixed = (roles: Record<string, unknown>, answers: Record<string, unknown>) => {
    const base = fixture();
    put(base, 'contracts/design/roles.json', JSON.stringify(roles));
    put(base, 'plugin-style-store/default/plugin.tokens.json', JSON.stringify(answers));
    return regionBodies(base);
  };
  const table: { name: string; cell: () => string | undefined }[] = [
    { name: 'ink-body', cell: () => lastCell(anyRow(real, 'ink-body')) },
    { name: 'edge-focus', cell: () => lastCell(anyRow(real, 'edge-focus')) },
    { name: 'chained', cell: () => lastCell(anyRow(fixed(
      { 'r-surface': role('markup', 'edges', { default: '{r-control}' }), 'r-control': role('markup', 'edges') },
      { 'r-surface': { $type: 'dimension', $value: '{r-control}' }, 'r-control': { $type: 'dimension', $value: '{r.sm}' }, light: { 'r-control': { $type: 'dimension', $value: '{r.xs}' } } },
    ), 'r-surface')) },
    { name: 'silent', cell: () => lastCell(anyRow(fixed(
      { 'r-surface': role('markup', 'edges', { default: '{r.lg}' }), 'r-control': role('markup', 'edges') },
      { 'r-control': { $type: 'dimension', $value: '{r.sm}' } },
    ), 'r-surface')) },
  ];
  const expected: Record<string, string> = {
    'ink-body': `\`${answerOf('ink-body', false)}\``,
    'edge-focus': `light \`${answerOf('edge-focus', true)}\`; dark \`${answerOf('edge-focus', false)}\``,
    chained: 'light `{r.xs}`; dark `{r.sm}`',
    silent: 'silent, falls to `{r.lg}`',
  };
  assert.notEqual(answerOf('edge-focus', true), answerOf('edge-focus', false), 'edge-focus answers differ by polarity');
  for (const { name, cell } of table) assert.equal(cell(), expected[name], name);
  for (const [path, body] of real) if (/^(plugin|components)\/(?!index)[a-z-]+\.md$/.test(path) && body !== '') assert.ok(body.includes(HEADER), path);
  assert.equal(defaultAnswer('ink-body', plugin, readJson(join(repoRoot, 'contracts/design/roles.json')) as any)?.dark, answerOf('ink-body', false));
});

test('a role row carries name, type, user scale and default, and a markup row its question, utilities and combination', () => {
  const base = fixture();
  const bodies = regionBodies(base);
  assert.ok(bodies.get('components/size-controls.md')!.includes('| `--size-sm-control-h` | What is it? | dimension | fixed | `{sp-8}` |'));
  assert.ok(bodies.get('markup/edges.md')!.includes('| `--r-surface` | What is it? | `rounded-surface`, `rounded-surface-alt` | none |'));
  assert.ok(bodies.get('markup/layers.md')!.includes('| `--z-nav` | Fixed page navigation. It sits low. |'));
  assert.ok(bodies.get('markup/layers.md')!.indexOf('--z-nav') < bodies.get('markup/layers.md')!.indexOf('--z-toast'));
});

test('a file without its marker pair throws', () => {
  const base = fixture();
  put(base, `${TREE_DIR}/markup/edges.md`, '# edges leaf\n\nRead this when edges.\n');
  assert.throws(() => renderTree(base), /markup\/edges\.md/);
});

test('a written tree is a fixed point', () => {
  const base = fixture();
  writeTree(base);
  const first = renderTree(base);
  for (const [path, text] of first) assert.equal(readFileSync(join(base, TREE_DIR, path), 'utf8'), text, path);
  writeTree(base);
  assert.deepEqual([...renderTree(base)], [...first]);
  assert.ok(!readFileSync(join(base, TREE_DIR, 'markup/edges.md'), 'utf8').includes('\nold\n'));
});

test('a page with no rows gets no tree block', () => {
  const base = fixture();
  const path = `${TREE_DIR}/markup/meaning-and-identity.md`;
  assert.ok(readFileSync(join(base, path), 'utf8').includes('\nold\n'));
  writeTree(base);
  const after = readFileSync(join(base, path), 'utf8');
  assert.ok(!after.includes(TREE_OPEN) && !after.includes(TREE_CLOSE) && !after.includes('old'));
  assert.ok(after.endsWith('Tail.\n'), after);
  assert.equal(renderTree(base).get('markup/meaning-and-identity.md'), after);
  put(base, path, '# leaf\n\nRead this when you want it.\n');
  assert.equal(renderTree(base).get('markup/meaning-and-identity.md'), '# leaf\n\nRead this when you want it.\n');
});

test('a child with no Read this sentence throws naming the child', () => {
  const base = fixture();
  put(base, `${TREE_DIR}/markup/edges.md`, `# edges leaf\n\nNothing to say.\n\n${TREE_OPEN}\n\n${TREE_CLOSE}\n`);
  assert.throws(() => regionBodies(base), /markup\/edges\.md has no sentence that starts "Read this"/);
});

const real = regionBodies();
const rowOf = (leaf: string, name: string) => real.get(leaf)!.split('\n').find((line) => line.startsWith(`| \`--${name}\` |`))!;

test('a role region opens with the sentence of its audience', () => {
  for (const [leaf, audience] of [['plugin/edges.md', 'markup'], ['components/size-controls.md', 'component'], ['markup/edges.md', 'markup']] as const)
    assert.ok(real.get(leaf)!.startsWith(`${COMPAT[audience]}\n\n| role | question |`), leaf);
});

test('a markup row carries question, utility and combination', () => {
  assert.ok(rowOf('markup/surfaces-and-text.md', 'ink-muted').includes('| `text-ink-muted` | `text-ink-muted/(--level-ink-muted)` |'));
  assert.ok(rowOf('markup/edges.md', 'edge-surface').includes('`border-edge-surface border-[length:var(--bw-surface)]`'));
  const pad = rowOf('markup/space-and-layout.md', 'pad-row-x');
  assert.ok(pad.includes('`px-row-x`') && pad.includes('`calc(var(--pad-row-x) * var(--dz-row-scale-x))`'));
});

test('a role Arena reads on one side publishes a one-side utility', () => {
  assert.ok(rowOf('markup/space-and-layout.md', 'gutter').includes('`px-gutter`'));
  assert.ok(rowOf('markup/space-and-layout.md', 'pad-surface-head').includes('`pb-surface-head`'));
  assert.ok(rowOf('markup/space-and-layout.md', 'pad-surface-head-top').includes('`pt-surface-head-top`'));
});

test('the width names the colours it is read with', () => {
  assert.ok(rowOf('markup/edges.md', 'bw-surface').includes('read with `--edge-surface`; read with `--edge-surface-floating`'));
});

test('a role with no question throws', () => {
  const base = fixture();
  const roles = readJson(join(base, 'contracts/design/roles.json')) as Record<string, any>;
  delete roles['r-surface'].$extensions[ARENA_EXT].question;
  put(base, 'contracts/design/roles.json', JSON.stringify(roles));
  assert.throws(() => regionBodies(base), /the role r-surface has no question/);
});

test('an unknown theme namespace throws', () => {
  const base = fixture();
  put(base, 'frameworks/tailwind/Theme.css', '@theme {\n  --blur-surface: var(--r-surface);\n}\n');
  assert.throws(() => roleUtilities(base), /--blur-surface/);
});

test('a theme key no namespace places that reads a role throws', () => {
  const base = fixture();
  put(base, 'frameworks/tailwind/Theme.css', '@theme {\n  --zzz-surface: var(--r-surface);\n}\n');
  assert.throws(() => roleUtilities(base), /--zzz-surface/);
});

test('a combination without the utility its form needs throws', () => {
  assert.throws(() => combination('r-x', { with: 'bw-x', as: 'width' }, ['p-x']), /r-x/);
});

test('every rendered utility compiles', () => {
  const classes = new Set<string>();
  for (const [leaf, body] of real) {
    if (!leaf.startsWith('markup/') || leaf === 'markup/layers.md' || leaf.endsWith('index.md')) continue;
    for (const line of body.split('\n').filter((row) => row.startsWith('| `--'))) {
      const [, , utility, combines] = line.split(' | ');
      for (const code of `${utility} ${combines}`.match(/`[^`]+`/g) ?? []) {
        const text = code.slice(1, -1);
        if (text.startsWith('calc(') || text.startsWith('--')) continue;
        for (const cls of text.split(' ')) classes.add(cls);
      }
    }
  }
  const dir = mkdtempSync(join(tmpdir(), 'token-tree-compile-'));
  made.push(dir);
  writeFileSync(join(dir, 'Tree.manifest.json'), JSON.stringify({ component: 'Tree', slots: { root: [...classes].join(' ') } }));
  const { css } = compileLayer({ extraSource: join(dir, '*.manifest.json') });
  assert.deepEqual([...classes].filter((cls) => !new RegExp(`\\.${escapeClass(cls).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s{:,>])`).test(css)), []);
  assert.ok(classes.size > 60);
});

test('edge-focus reaches ring and outline', () => {
  assert.deepEqual(roleUtilities().get('edge-focus'), ['ring-edge-focus', 'outline-edge-focus']);
});

test('a role is read in a class by the colour keys of the theme, which a role may rename', () => {
  const keys = roleColourKeys();
  const ROWS: [string, string, string[] | undefined][] = [
    ['a key equal to the role', 'ink-muted', ['ink-muted']],
    ['a renamed key', 'fill-selected', ['selected']],
    ['one key read by two prefixes', 'edge-focus', ['edge-focus']],
    ['a role in no colour namespace', 'gap-items', undefined],
  ];
  for (const [name, role, want] of ROWS) assert.deepEqual(keys.get(role), want, name);
});

test('a fill role combines its level on its bg utility', () => {
  assert.equal(combination('fill-selected', { with: 'level-accent-soft-primary', as: 'level' }, ['bg-selected']), 'bg-selected/(--level-accent-soft-primary)');
  assert.ok(rowOf('markup/states.md', 'fill-selected').includes('`bg-selected/(--level-accent-soft-primary)`'));
});

test('the states leaf maps every attribute to its selector and roles', () => {
  const body = real.get('markup/states.md')!;
  const rows = body.split('\n').filter((line) => /^\| `[a-z-]+` \| `/.test(line));
  assert.equal(rows.length, 11);
  assert.ok(body.includes('| attribute | selector | roles |'));
  const invalid = rows.find((line) => line.startsWith('| `aria-invalid` |'))!;
  assert.ok(invalid.includes('`--edge-invalid`') && invalid.includes('`--ink-invalid`'));
  assert.ok(rows.find((line) => line.startsWith('| `hover` |'))!.includes('`--fill-hover`, `--mix-hover`'));
  assert.ok(rows.find((line) => line.startsWith('| `active` |'))!.includes('`--mix-pressed`'));
  const control = '`--emphasis-primary-ink`, `--fill-control`, `--fill-control-on`, `--fill-knob`, `--fill-knob-off`, `--ink-knob`, `--ink-knob-off` |';
  assert.ok(rows.includes('| `aria-checked` | `[aria-checked="true"]` | ' + control));
  assert.ok(rows.includes('| `checked` | `:checked` | ' + control));
  assert.ok(rows.find((line) => line.startsWith('| `aria-pressed` |'))!.includes('`[aria-pressed="true"]`'));
});

test('a state no role names has no row', () => {
  const stub: Parameters<typeof stateRows>[0] = { a: { $extensions: { [ARENA_EXT]: { audience: 'markup', state: ['hover'] } } } };
  const rows = stateRows(stub);
  assert.deepEqual(rows, ['| `hover` | `:hover` | `--a` |']);
});

test('a hue role is a status hue and every other meaning role is a control or a mark', () => {
  const meaning = { audience: 'component', task: 'meaning-and-identity' };
  assert.equal(roleLeaf('hue-info-ink', meaning), 'components/status-hues.md');
  for (const name of ['fill-knob', 'fill-tip', 'edge-mark']) assert.equal(roleLeaf(name, meaning), 'components/controls-and-marks.md');
  assert.deepEqual(TREE['components/index.md']!.slice(-2), ['status-hues', 'controls-and-marks']);
});

test('an overlay role combines its level on its bg utility', () => {
  assert.equal(combination('overlay-scrim', { with: 'level-scrim', as: 'level' }, ['bg-overlay-scrim']), 'bg-overlay-scrim/(--level-scrim)');
  assert.ok(rowOf('markup/surfaces-and-text.md', 'overlay-scrim').includes('`bg-overlay-scrim/(--level-scrim)`'));
  assert.ok(rowOf('markup/surfaces-and-text.md', 'overlay-media').includes('`bg-overlay-media/(--level-media)`'));
});

test("the layers sheet carries a step's whole description", () => {
  const layers = readJson(join(repoRoot, 'contracts/design/layering.json')) as { z: Record<string, { $description?: string }> };
  const flat = (text: string) => text.replace(/\s+/g, ' ').trim();
  const nav = real.get('markup/layers.md')!.split('\n').filter((line) => line.startsWith('| `--z-nav` |'));
  assert.equal(nav.length, 1);
  assert.ok(nav[0]!.includes('Fixed page navigation: a bottom bar, a sticky top bar.'));
  const last = flat(layers.z.nav!.$description!).split(/(?<=\.) /).pop()!;
  assert.ok(nav[0]!.trim().endsWith(`${last} |`));
  const dropdown = real.get('markup/layers.md')!.split('\n').find((line) => line.startsWith('| `--z-dropdown` |'))!;
  assert.ok(dropdown.includes('top layer') && dropdown.includes('a dialog and the toast stack included'));
});

const RECLASSIFIED = [
  { name: 'fill-control', task: 'states' }, { name: 'fill-control-on', task: 'states' }, { name: 'fill-knob', task: 'states' },
  { name: 'fill-knob-off', task: 'states' }, { name: 'ink-knob', task: 'states' }, { name: 'ink-knob-off', task: 'states' },
  { name: 'emphasis-primary-fill', task: 'surfaces-and-text' }, { name: 'emphasis-primary-ink', task: 'states' },
  { name: 'emphasis-secondary-fill', task: 'surfaces-and-text' }, { name: 'emphasis-secondary-ink', task: 'surfaces-and-text' },
  { name: 'emphasis-primary-edge', task: 'edges' }, { name: 'emphasis-secondary-edge', task: 'edges' },
];

test('every role your markup draws is a markup role', () => {
  const roles = readJson(join(repoRoot, 'contracts/design/roles.json')) as Record<string, { $extensions: Record<string, { audience: string; task: string }> }>;
  for (const { name, task } of RECLASSIFIED) {
    const meta = roles[name]!.$extensions[ARENA_EXT]!;
    assert.deepEqual({ audience: meta.audience, task: meta.task }, { audience: 'markup', task }, name);
    assert.ok(rowOf(`plugin/${task}.md`, name), `${name} on plugin/${task}.md`);
    assert.ok(rowOf(`markup/${task}.md`, name), `${name} on markup/${task}.md`);
  }
  const table = real.get('markup/states.md')!.split('\n').filter((line) => /^\| `(aria-checked|checked)` \|/.test(line));
  assert.equal(table.length, 2);
  for (const line of table)
    for (const name of ['fill-control-on', 'fill-knob', 'ink-knob', 'emphasis-primary-ink']) assert.ok(line.includes(`\`--${name}\``), `${name} in ${line}`);
  for (const file of walkFiles(join(repoRoot, TREE_DIR)))
    assert.doesNotMatch(readFileSync(file, 'utf8'), /except the checkbox|one exception|but the checkbox/i, file);
});
