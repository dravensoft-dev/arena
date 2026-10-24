import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { autoComponents, undrawnStep, auditStep, reportLines, paintedBy, namedComponents, drawsForYou } from './steps.ts';
import { report } from './reports.ts';
import type { ComponentMap } from './components.ts';
import { auto, MAP, options, project, readable, removeFixtures } from './cli-fixtures.ts';
import type { VocabularyIndex } from './audit.ts';
import type { TokenCatalogue } from './theme-css.ts';
import { vocabularyIndex } from '../../../lib/arena/vocabulary-index.ts';
import { componentMap } from '../../../lib/arena/component-map.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';

after(removeFixtures);

test('a report line names the palette it came from, and keeps the kind it is', () => {
  assert.deepEqual(
    reportLines([{ palette: 'ember', messages: [report('contrast', 'text, x: 2.00:1')] }]),
    [report('contrast', 'ember: text, x: 2.00:1')],
  );
});

test('the undrawn step names the shipped components a project draws nowhere', () => {
  const root = project(auto, { 'app.html': '<arena-button />' });
  const step = undrawnStep(options(root), '@dravensoft/arena-react', MAP);
  assert.deepEqual(step.fatal, []);
  assert.match(step.notes[0] ?? '', /1 of 3 shipped component\(s\) drawn/);
  assert.match(step.notes[1] ?? '', /2 drawn nowhere: arena-bar-chart, arena-table/);
  rmSync(root, { recursive: true });
});

test('a project drawing everything is told so, rather than being handed an empty list', () => {
  const root = project(auto, { 'app.html': '<arena-button /><arena-table /><arena-bar-chart />' });
  const step = undrawnStep(options(root), '@dravensoft/arena-react', MAP);
  assert.match(step.notes[1] ?? '', /every component this package ships is drawn somewhere/);
  rmSync(root, { recursive: true });
});

test('a component Arena draws on your behalf is still undrawn, because you never wrote it', () => {
  const root = project(auto, { 'app.html': '<arena-table />' });
  const step = undrawnStep(options(root), '@dravensoft/arena-react', MAP);
  assert.match(step.notes[1] ?? '', /arena-button/);
  rmSync(root, { recursive: true });
});

test('the undrawn step without the map beside the command says why rather than reporting nothing', () => {
  const root = project(auto, { 'app.html': '<arena-button />' });
  const step = undrawnStep(options(root), '@dravensoft/arena-react', null);
  assert.equal(step.notes.length, 0);
  assert.match(step.fatal[0] ?? '', /^the component map this package carries is not beside this command, so what you draw cannot be compared/);
  assert.doesNotMatch(step.fatal[0] ?? '', /--undrawn|arena usage/);
  rmSync(root, { recursive: true });
});

test('a style plugin the config declares is walked wherever it lives, so the bare command measures it', () => {
  const root = project({ ...readable, stylePlugins: ['./design/andina'] });
  mkdirSync(join(root, 'design', 'andina'), { recursive: true });
  writeFileSync(join(root, 'design', 'andina', 'plugin.css'),
    '[data-arena-part="table.th"] { font-size: var(--fs-sm); }\n'
    + '[data-arena-part="chart-card.title"] { font-size: var(--fs-sm); }\n');
  const audit = auditStep(options(root));
  assert.deepEqual(audit.painted, ['chart-card.title', 'table.th'],
    'the plugin directory is resolved from the config, so nothing has to name it a second time as a source');
  rmSync(root, { recursive: true, force: true });
});

test('the audit reads a class against the vocabulary the package carries, and without one reports every class', () => {
  const root = project(readable);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'a.tsx'), '<ArenaButton className="arena-fill">Go</ArenaButton>\n');
  const opts = options(root);
  const vocabulary = { page: 'p', classes: { 'arena-fill': { family: 'fill', reach: 'box' as const } }, answers: { ArenaButton: ['fill'] }, options: { ArenaButton: ['arena-fill'] } };
  const ownClass = (found: { reports: { message: string }[] }) => found.reports.filter((one) => one.message.includes('(own-class)'));
  assert.deepEqual(ownClass(auditStep(opts, null, null, vocabulary)), []);
  assert.equal(ownClass(auditStep(opts, null, null, null)).length, 1);
  rmSync(root, { recursive: true, force: true });
});

test('the note on what a style plugin paints is its own sentence, so the audit step stays free of it', () => {
  assert.match(paintedBy([]), /^your style plugin\(s\) paint no part\(s\)\. /);
  assert.match(paintedBy(['table.th', 'card']), /^your style plugin\(s\) paint 2 part\(s\): table\.th, card\. /);
});

test('an audit report carries the rule that produced it, and its message ends in it', () => {
  const root = project(readable);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'a.tsx'), '<div style={{ color: "#b52a20" }} />\n');
  const raw = auditStep(options(root)).reports.filter((one) => one.rule === 'raw-value');
  assert.ok(raw.length >= 1);
  assert.equal(raw[0]?.kind, 'audit');
  assert.ok(raw[0]?.message.endsWith('(raw-value)'), raw[0]?.message);
  rmSync(root, { recursive: true, force: true });
});

test('a named list keeps its names as written and appends what they pull, sorted', () => {
  assert.deepEqual(namedComponents(['table'], MAP),
    { components: ['table', 'pagination', 'select'], note: '1 component sheet(s) named, and 2 Arena draws for you: pagination, select' });
  assert.deepEqual(namedComponents(['table', 'table', 7], MAP).components, ['table', 'table', 7, 'pagination', 'select'],
    'a repeat and a non-string stay for stylesheetProblems to refuse');
  assert.deepEqual(namedComponents(['select', 'table', 'pagination'], MAP),
    { components: ['select', 'table', 'pagination'], note: null });
  assert.equal(drawsForYou(['pagination', 'select']), '2 Arena draws for you: pagination, select');
});

test('a typo that is a source\'s only Arena tag is still reported when no component resolves', () => {
  const map: ComponentMap = { match: 'symbol', draws: { ArenaButton: 'button' }, needs: {}, sheetless: ['ArenaIconsProvider'] };
  const root = project(auto, { 'App.tsx': "import { ArenaButon, ArenaIconsProvider } from '@dravensoft/arena-react';\n"
    + 'export const App = () => (<ArenaIconsProvider href="/x.svg"><ArenaButon /></ArenaIconsProvider>);\n' });
  const found = autoComponents(auto as any, { paths: [join(root, 'src')], config: join(root, 'arena.config.json') },
    map, '@dravensoft/arena-react', false);
  assert.ok(!('fatal' in found), 'a source drawing no component is a note, not a fatal');
  assert.deepEqual(found.components, []);
  assert.deepEqual(found.reports, ['ArenaButon is not a component this package ships, so no sheet was added for it']);
  assert.match(found.note ?? '', /no Arena component drawn/);
  rmSync(root, { recursive: true });
});

const CATALOGUE: TokenCatalogue = {
  tokens: { 'spacing-gap': '4px' },
  roles: { 'ink-muted': { type: 'color' } },
  aliases: { 'text-soft': 'ink-muted' },
  channels: ['--spacing-row', '--arena-hue-ink'],
};
const VOCABULARY: VocabularyIndex = {
  page: 'p', classes: {}, answers: {}, options: {},
  parts: { ArenaMenu: { menu: [], 'menu.item': ['data-arena-destructive'] }, ArenaButton: { button: [] } },
};

function skinned(rules: string, extra: Record<string, string> = {}) {
  const config = { ...readable, palettes: [{ ...readable.palettes[0]!,
    colors: { ...readable.palettes[0]!.colors, brand: '#123456' } }], stylePlugins: ['plugin'] };
  const root = project(config, { 'App.tsx': '<p />', ...extra });
  mkdirSync(join(root, 'plugin'), { recursive: true });
  writeFileSync(join(root, 'plugin', 'skin.css'), rules);
  return root;
}

const named = (found: { reports: { rule?: string }[] }, rule: string) => found.reports.filter((one) => one.rule === rule);

test('a plugin rule reading a property nothing declares is unknown-property, with the nearest name when one is close', () => {
  const root = skinned('[data-arena-part="button"] {\n  color: var(--arena-nothing, transparent);\n  gap: var(--spacing-rwo);\n}\n');
  const found = named(auditStep(options(root), null, CATALOGUE, VOCABULARY), 'unknown-property');
  assert.equal(found.length, 2);
  assert.match(found[0]!.message, /skin\.css:2: reads var\(--arena-nothing\), which no role, token, alias, channel, palette colour or property your sources declare is called, so the rule takes its fallback, or nothing, in silence \(unknown-property\)$/);
  assert.match(found[1]!.message, /skin\.css:3: .*\. The nearest listed name is --spacing-row \(unknown-property\)$/);
  rmSync(root, { recursive: true, force: true });
});

test('a property the catalogue, the palette or the project declares is known, and a nested fallback is read too', () => {
  const root = skinned([
    '[data-arena-part="button"] {',
    '  color: var(--color-brand);',
    '  gap: var(--spacing-row) var(--spacing-gap);',
    '  background: var(--ink-muted);',
    '  border-color: var(--text-soft);',
    '  outline-color: var(--arena-hue-ink);',
    '  margin: var(--own) var(--own2);',
    '  padding: var(--a, var(--b));',
    '  box-shadow: var(--tw-ring-color) var(--registered);',
    '}',
  ].join('\n'), {
    'tokens.css': ':root { --own: 1px; --a: 2px; }\n@property --registered {\n  syntax: "*";\n  inherits: false;\n}\n',
    'Style.tsx': "export const style = { '--own2': 1 };\n",
  });
  const found = named(auditStep(options(root), null, CATALOGUE, VOCABULARY), 'unknown-property');
  assert.equal(found.length, 1, found.map((one) => one.message).join('\n'));
  assert.match(found[0]!.message, /skin\.css:8: reads var\(--b\)/);
  rmSync(root, { recursive: true, force: true });
});

test('a plugin rule naming no declared part is unknown-part, with the part and hook it meant', () => {
  const root = skinned('[data-arena-part="menu.item-destructive"] { color: red; }\n');
  const found = named(auditStep(options(root), null, CATALOGUE, VOCABULARY), 'unknown-part');
  assert.equal(found.length, 1);
  assert.match(found[0]!.message, /skin\.css:1: names the part menu\.item-destructive, which no component declares, so the rule reaches nothing\. The nearest part is menu\.item, and data-arena-destructive is the hook that marks that state on it \(unknown-part\)$/);
  assert.equal(named(auditStep(options(skinned('[data-arena-part="menu.item"] { color: red; }\n')), null, CATALOGUE, VOCABULARY), 'unknown-part').length, 0);
  rmSync(root, { recursive: true, force: true });
});

test('a var() whose name a template literal finishes is not read as a name', () => {
  const root = skinned('');
  writeFileSync(join(root, 'plugin', 'rules.ts'), 'export const rule = (step: string) => `var(--arena-size-${step})`;\n');
  assert.deepEqual(named(auditStep(options(root), null, CATALOGUE, VOCABULARY), 'unknown-property'), []);
  rmSync(root, { recursive: true, force: true });
});

test('outside a plugin directory neither rule reads', () => {
  const root = skinned('', {
    'app.css': '[data-arena-part="menu.nope"] { color: var(--arena-nothing, transparent); }\n',
  });
  const found = auditStep(options(root), null, CATALOGUE, VOCABULARY);
  assert.equal(named(found, 'unknown-part').length, 0);
  assert.equal(named(found, 'unknown-property').length, 0);
  rmSync(root, { recursive: true, force: true });
});

test('a catalogue without channels or a vocabulary without parts reads nothing', () => {
  const root = skinned('[data-arena-part="menu.nope"] { color: var(--arena-nothing, transparent); }\n');
  const { channels: _, ...bare } = CATALOGUE;
  const { parts: __, ...flat } = VOCABULARY;
  for (const [catalogue, vocabulary] of [[null, VOCABULARY], [bare, VOCABULARY], [CATALOGUE, null], [CATALOGUE, flat]] as const) {
    const found = auditStep(options(root), null, catalogue, vocabulary);
    if (!catalogue?.channels) assert.equal(named(found, 'unknown-property').length, 0);
    if (!vocabulary?.parts) assert.equal(named(found, 'unknown-part').length, 0);
  }
  assert.equal(named(auditStep(options(root), null, CATALOGUE, VOCABULARY), 'unknown-property').length, 1);
  rmSync(root, { recursive: true, force: true });
});

test('arena-audit allow on the line silences both rules, and a stale one is still stale', () => {
  const root = skinned([
    '[data-arena-part="menu.nope"] { color: var(--arena-nothing); } /* arena-audit allow */',
    '[data-arena-part="button"] { color: var(--color-brand); } /* arena-audit allow */',
  ].join('\n'));
  const found = auditStep(options(root), null, CATALOGUE, VOCABULARY);
  assert.equal(named(found, 'unknown-part').length, 0);
  assert.equal(named(found, 'unknown-property').length, 0);
  const stale = named(found, 'stale-allowance');
  assert.equal(stale.length, 1);
  assert.match(stale[0]!.message, /skin\.css:2: stale/);
  rmSync(root, { recursive: true, force: true });
});

test('a part counts as painted only when the sheet of its component is drawn, and the rest are named', () => {
  const vocabulary = VOCABULARY;
  assert.match(paintedBy(['button', 'menu.item'], vocabulary, ['arena-button']),
    /^your style plugin\(s\) paint 1 part\(s\): button\. 1 rule\(s\) reach nothing this project draws: menu\.item\. /);
  assert.match(paintedBy(['button', 'menu.item'], vocabulary, ['arena-button', 'arena-menu']), /^your style plugin\(s\) paint 2 part\(s\): button, menu\.item\. A role/);
  assert.match(paintedBy(['menu.item'], null, ['arena-button']), /^your style plugin\(s\) paint 1 part\(s\): menu\.item\. A role/);
});

test('every component that declares a part has its sheet among the sheets each shipped map draws', () => {
  const vocabulary = vocabularyIndex();
  for (const layer of ['angular', 'react'] as const) {
    const sheets = [...new Set(Object.values(componentMap(layer, repoRoot).draws).filter((one): one is string => Boolean(one)))];
    for (const [component, declared] of Object.entries(vocabulary.parts ?? {})) {
      const part = Object.keys(declared)[0] ?? '';
      assert.match(paintedBy([part], vocabulary, sheets), /paint 1 part\(s\)/, `${component} has no sheet among the ${sheets.length} the map draws`);
    }
  }
  assert.match(paintedBy(['menu.item'], vocabulary, ['arena-button']), /paint no part\(s\)\. 1 rule\(s\) reach nothing/);
});
