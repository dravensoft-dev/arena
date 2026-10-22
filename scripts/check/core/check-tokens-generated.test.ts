import test from 'node:test';
import assert from 'node:assert/strict';
import { fileDrift } from './check-tokens-generated.ts';

const GENERATED = ':root { --a: 1px; --b: 2px; }\n.arena-light { --a: 3px; }\n';

test('a file that matches what the generator emits drifts in nothing', () => {
  assert.deepEqual(fileDrift('spacing.generated.css', GENERATED, GENERATED), []);
});

test('a file that is not there names the command that writes it', () => {
  assert.deepEqual(fileDrift('spacing.generated.css', GENERATED, null),
    ['contracts/design-generated/spacing.generated.css: missing — run bun run generate:tokens']);
});

test('drift is reported in both directions, because a stale file loses and gains', () => {
  const committed = ':root { --a: 9px; }\n.arena-dark { --z: 0; }\n';
  assert.deepEqual(fileDrift('spacing.generated.css', GENERATED, committed), [
    'contracts/design-generated/spacing.generated.css :root: --a is "9px", generated "1px"',
    'contracts/design-generated/spacing.generated.css :root: missing --b',
    'contracts/design-generated/spacing.generated.css: missing selector .arena-light',
    'contracts/design-generated/spacing.generated.css: committed selector .arena-dark is no longer generated',
  ]);
});

test('a custom property nobody generates any more is drift, not a leftover to keep', () => {
  const committed = ':root { --a: 1px; --b: 2px; --gone: 4px; }\n.arena-light { --a: 3px; }\n';
  assert.deepEqual(fileDrift('spacing.generated.css', GENERATED, committed),
    ['contracts/design-generated/spacing.generated.css :root: --gone is committed but no longer generated'],
    'the gate reads the committed file as a claim about the source, so a property the source '
    + 'stopped emitting is a claim nothing backs');
});

test('a hand edit of a value inside the high-contrast block is drift, apart from the same name outside it', () => {
  const generated = '.arena-p{--bw:2px}\n@media (prefers-contrast: more) {\n.arena-p{--bw:var(--bw-strong)}\n}\n';
  const edited = '.arena-p{--bw:9px}\n@media (prefers-contrast: more) {\n.arena-p{--bw:var(--bw-strong)}\n}\n';
  assert.deepEqual(fileDrift('p.generated.css', generated, edited),
    ['contracts/design-generated/p.generated.css .arena-p: --bw is "9px", generated "2px"']);
});
