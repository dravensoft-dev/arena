import test from 'node:test';
import assert from 'node:assert/strict';
import { maskCode, matchOutsideCode, replaceOutsideCode } from './code-spans.ts';

const LINK = /\]\(([^)\s]+)\)/g;
const PATTERN = String.raw`/node_modules[\\/](a|b)[\\/]/`;

test('masking keeps the length and the newlines and blanks only code', () => {
  const text = `a \`x](y)\` b\n\`\`\`\n[c](d)\n\`\`\`\n[e](f)`;
  const masked = maskCode(text);
  assert.equal(masked.length, text.length);
  assert.equal(masked.split('\n').length, text.split('\n').length);
  assert.ok(!masked.includes('x](y)') && !masked.includes('[c](d)'));
  assert.ok(masked.includes('[e](f)'));
});

test('a pattern in a code span is not a link, and a real link beside it still is', () => {
  const text = `the \`${PATTERN}\` test and [real](./page.md)`;
  assert.deepEqual(matchOutsideCode(text, LINK).map((one) => one[1]), ['./page.md']);
});

test('a link inside a fenced block is not a link either', () => {
  const text = '```md\n[c](d.md)\n```\n[e](f.md)';
  assert.deepEqual(matchOutsideCode(text, LINK).map((one) => one[1]), ['f.md']);
});

test('a rewrite leaves code as written and touches the link beside it', () => {
  const text = `\`${PATTERN}\` [real](a.md)`;
  assert.equal(replaceOutsideCode(text, LINK, (_, target = '') => `](b/${target})`), `\`${PATTERN}\` [real](b/a.md)`);
});
