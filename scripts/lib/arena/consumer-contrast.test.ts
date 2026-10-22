import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { contrastProblems, pageFor, type ContrastReading } from './consumer-contrast.ts';

const reading = (contrast: ContrastReading['contrast'], root: string, light = root, nested = root): ContrastReading =>
  ({ contrast, root, light, nested });

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

test('a missing page is a problem rather than a pass', () => {
  assert.equal(contrastProblems('react', [reading('no-preference', '1px')]).length, 1);
});

test('the page points the package imports at the fixture and drops the remote ones', () => {
  const { css, html } = pageFor("@import '@dravensoft/arena-react/css/base.css';\n@import url('https://fonts.example/a.css');\n.x{}",
    '@dravensoft/arena-react', 'marketing');
  assert.equal(css, "@import '/node_modules/@dravensoft/arena-react/css/base.css';\n.x{}");
  assert.ok(html.includes('class="arena-marketing"'));
  assert.equal(html.match(/class="arena-card__root"/g)?.length, 3, 'a card at the root, in .arena-light and in the scope');
  assert.ok(html.includes('href="/node_modules/@dravensoft/arena-react/css/components/arena-card.css"'));
});
