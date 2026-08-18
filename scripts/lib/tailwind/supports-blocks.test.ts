import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blindFallbacks, dropBlindFallbacks, inkOf, mergeSupports, parseBlocks, repeatedSupports,
} from './supports-blocks.ts';

const SUPPORTS = '@supports (color: color-mix(in lab, red, red))';

const pressed = `@layer utilities {
  .arena-icon-button__root--pressed-true {
    border-color: var(--color-primary);
    ${SUPPORTS} {
      border-color: color-mix(in oklab, var(--color-primary) 38%, transparent);
    }
    background-color: var(--color-primary);
    ${SUPPORTS} {
      background-color: color-mix(in oklab, var(--color-primary) 14%, transparent);
    }
    color: var(--color-primary);
    &:hover {
      @media (hover: hover) {
        background-color: var(--color-primary);
        ${SUPPORTS} {
          background-color: color-mix(in oklab, var(--color-primary) 22%, transparent);
        }
      }
    }
  }
}
`;

const sunken = `@layer utilities {
  .arena-error-state__code {
    background-color: var(--fill-surface-sunken);
    ${SUPPORTS} {
      background-color: color-mix(in oklab, var(--fill-surface-sunken) 30%, transparent);
    }
    color: var(--ink-muted);
    ${SUPPORTS} {
      color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);
    }
  }
}
`;

test('a rule is read with its nesting, and the ink of a nested block is the one it inherits', () => {
  const root = parseBlocks(pressed);
  const rule = root.children[0]?.children[0];
  assert.equal(rule?.selector, '.arena-icon-button__root--pressed-true');
  const hover = rule?.children.find((child) => child.selector === '&:hover')?.children[0];
  assert.equal(hover?.selector, '@media (hover: hover)');
  assert.equal(inkOf(hover!), 'color-primary');
});

test('a fallback painting the ink under the ink is found, at rest and on hover', () => {
  const found = blindFallbacks(pressed);
  assert.equal(found.length, 2);
  assert.deepEqual(found.map((one) => one.token), ['color-primary', 'color-primary']);
  assert.ok(found[1]?.selector.endsWith('@media (hover: hover)'));
});

test('a wash of a colour the ink is NOT keeps its fallback, which is the whole distinction', () => {
  assert.deepEqual(blindFallbacks(sunken), []);
  assert.equal(dropBlindFallbacks(sunken), sunken);
});

test('dropping the blind half leaves the mix and takes the solid, so the glyph stays legible', () => {
  const out = dropBlindFallbacks(pressed);
  assert.equal(blindFallbacks(out).length, 0);
  assert.ok(!out.includes('background-color: var(--color-primary);'));
  assert.ok(out.includes('color: var(--color-primary);'));
  assert.equal((out.match(/color-mix\(in oklab, var\(--color-primary\) 14%/g) ?? []).length, 1);
  assert.equal((out.match(/color-mix\(in oklab, var\(--color-primary\) 22%/g) ?? []).length, 1);
});

test('two blocks stating one condition are reported, and one is not', () => {
  assert.equal(repeatedSupports(pressed).length, 1);
  assert.equal(repeatedSupports(mergeSupports(dropBlindFallbacks(pressed))).length, 0);
});

test('merging keeps every declaration and states the condition once per rule', () => {
  const out = mergeSupports(dropBlindFallbacks(pressed));
  assert.ok(out.includes('background-color: color-mix(in oklab, var(--color-primary) 14%, transparent);'));
  assert.ok(out.includes('border-color: color-mix(in oklab, var(--color-primary) 38%, transparent);'));
  assert.ok(out.includes('background-color: color-mix(in oklab, var(--color-primary) 22%, transparent);'));
});

test('merging goes into the LAST block, so a plain declaration between the two still loses to it', () => {
  const merged = mergeSupports(sunken);
  const at = merged.indexOf('color: var(--ink-muted);');
  const mix = merged.indexOf('color-mix(in oklab, var(--ink-muted)');
  assert.ok(at >= 0 && mix > at, 'the level has to come after the plain declaration it holds back');
  assert.ok(merged.includes('background-color: color-mix(in oklab, var(--fill-surface-sunken) 30%, transparent);'));
  assert.equal(repeatedSupports(merged).length, 0);
});

test('a merge a plain declaration of the same property would win is refused rather than made', () => {
  const risky = `@layer utilities {
  .a {
    ${SUPPORTS} {
      color: color-mix(in oklab, var(--ink-body) 50%, transparent);
    }
    color: var(--ink-body);
    ${SUPPORTS} {
      border-color: color-mix(in oklab, var(--edge-surface) 50%, transparent);
    }
  }
}
`;
  assert.equal(mergeSupports(risky), risky);
  assert.equal(repeatedSupports(risky).length, 1);
});
