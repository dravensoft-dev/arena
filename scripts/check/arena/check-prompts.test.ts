import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  promptProblems, regionOf, rulesRegionOf, zeroScanProblems,
} from './check-prompts.ts';
import {
  openLine, CLOSE_LINE, RULES_OPEN, RULES_CLOSE_LINE, ROUTER_FROM_PROMPT,
} from '../../generate/arena/generate-prompt-api.ts';

test('every committed prompt carries the region its contract emits', () => {
  const { problems } = promptProblems();
  assert.deepEqual(problems, []);
});

test('the gate read a real corpus rather than an empty one', () => {
  const { held, anchored, scanned } = promptProblems();
  assert.ok(scanned > 100, `reached only ${scanned} prompt(s)`);
  assert.equal(held, scanned, 'a prompt was skipped, so a clean pass says less than it looks');
  assert.equal(anchored, scanned, 'a prompt points nowhere, and it is the reader\'s last stop');
});

test('a file with neither region is reported for both, since each answers its own question', () => {
  const { problems } = promptProblems(undefined, [
    { component: 'ArenaBadge', layer: 'react', path: 'frameworks/react/components/display/arena-badge/ArenaBadge.tsx' },
  ]);
  assert.equal(problems.length, 2);
  assert.ok(problems.some((one) => /carries no @api region/.test(one)));
  assert.ok(problems.some((one) => /carries no @rules region/.test(one)));
});

test('every prompt names the router, which is the whole point of the note', () => {
  const { problems } = promptProblems();
  assert.deepEqual(problems, []);
  const source = readFileSync(
    join(repoRoot, 'frameworks/react/components/forms/arena-button/ArenaButton.prompt.md'),
    'utf8',
  );
  assert.ok((rulesRegionOf(source) ?? '').includes(ROUTER_FROM_PROMPT));
});

test('rulesRegionOf reads its own region and not the @api one beside it', () => {
  const source = `${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}\n\n${RULES_OPEN}\nnote\n${RULES_CLOSE_LINE}\n`;
  assert.equal(rulesRegionOf(source), `${RULES_OPEN}\nnote\n${RULES_CLOSE_LINE}`);
  assert.equal(regionOf(source), `${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}`);
  assert.equal(rulesRegionOf(`${RULES_OPEN}\nnote\n`), null);
});

test('regionOf reads the whole region, markers included', () => {
  const source = `x\n\n${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}\n\ny\n`;
  assert.equal(regionOf(source), `${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}`);
});

test('an unclosed region reads as no region, so the gate reports it rather than trusting it', () => {
  assert.equal(regionOf(`${openLine('ArenaBadge')}\nrows\n`), null);
  assert.equal(regionOf('no region here\n'), null);
});

test('an empty scan is a problem, never a clean run', () => {
  assert.equal(zeroScanProblems(0).length, 1);
  assert.deepEqual(zeroScanProblems(110), []);
});
