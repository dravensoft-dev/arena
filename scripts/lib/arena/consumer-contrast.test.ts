import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { contrastProblems, pageFor, widenedRoles, type ContrastReading } from './consumer-contrast.ts';

const reading = (contrast: ContrastReading['contrast'], root: string, light = root, nested = root,
  roles: Record<string, string> = {}): ContrastReading => ({ contrast, root, light, nested, roles });

test('widening at every element reports nothing', () => {
  assert.deepEqual(contrastProblems('react', [reading('no-preference', '1px'), reading('more', '2px')]), []);
});

test('a root that does not widen is named with both widths', () => {
  const problems = contrastProblems('react', [reading('no-preference', '1px'), reading('more', '1px', '2px', '2px')]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /react.*root.*1px.*1px/);
});

test('the light palette element and the nested plugin are checked too', () => {
  const plain = reading('no-preference', '1px');
  const light = contrastProblems('angular', [plain, reading('more', '2px', '1px', '2px')]);
  assert.equal(light.length, 1);
  assert.match(light[0] ?? '', /angular.*light/);
  const nested = contrastProblems('angular', [plain, reading('more', '2px', '2px', '1px')]);
  assert.equal(nested.length, 1);
  assert.match(nested[0] ?? '', /angular.*nested/);
});

test('a card sheet that did not load is named as that and not as a contrast defect', () => {
  const problems = contrastProblems('react', [reading('no-preference', '0px'), reading('more', '0px')]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /react.*the card sheet did not load/);
  assert.doesNotMatch(problems[0] ?? '', /widens no boundary/);
});

test('every bw role the contrast sheet widens must be larger under more, and a problem names the role', () => {
  const plain = reading('no-preference', '1px', '1px', '1px', { 'bw-surface': '1px', 'bw-strong': '2px' });
  assert.deepEqual(contrastProblems('react', [plain, reading('more', '2px', '2px', '2px', { 'bw-surface': '2px', 'bw-strong': '3px' })]), []);
  const problems = contrastProblems('react', [plain, reading('more', '2px', '2px', '2px', { 'bw-surface': '2px', 'bw-strong': '2px' })]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /react.*--bw-strong.*2px.*2px/);
});

test('the roles are read from the :root block inside the prefers-contrast: more media query', () => {
  const css = ':root{--bw-a:1px;}\n@media (prefers-contrast: more) {\n:root{\n--bw-surface: var(--bw-strong);\n--bw-strong: 3px;\n--other: 1;\n}\n}';
  assert.deepEqual(widenedRoles(css), ['bw-surface', 'bw-strong']);
});

test('a missing page is a problem rather than a pass', () => {
  assert.equal(contrastProblems('react', [reading('no-preference', '1px')]).length, 1);
});

test('the page links the flat sheet as it is and drops the remote imports', () => {
  const { css, html } = pageFor("/* @dravensoft/arena-react/css/base.css */\n@import url('https://fonts.example/a.css');\n.x{}",
    '@dravensoft/arena-react', 'marketing');
  assert.equal(css, "/* @dravensoft/arena-react/css/base.css */\n.x{}");
  assert.ok(html.includes('class="arena-marketing"'));
  assert.equal(html.match(/class="arena-card__root"/g)?.length, 3, 'a card at the root, in .arena-light and in the scope');
  assert.ok(html.includes('href="/node_modules/@dravensoft/arena-react/css/components/arena-card.css"'));
});
