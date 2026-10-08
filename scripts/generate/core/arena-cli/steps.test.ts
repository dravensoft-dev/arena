import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { undrawnStep, auditStep, reportLines, paintedBy } from './steps.ts';
import { report } from './reports.ts';
import { auto, MAP, options, project, readable } from './cli-fixtures.ts';

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
