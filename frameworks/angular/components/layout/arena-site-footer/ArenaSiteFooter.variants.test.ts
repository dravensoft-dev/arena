/* A recipe resolves to the component's OWN class names, so what this suite can see is that every
 * slot resolves and that neither the track list nor the page width is the recipe's. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSiteFooterStyles } from './ArenaSiteFooter.variants';

const SLOTS = ['root', 'band', 'columns', 'note'] as const;

test('every slot the component renders resolves to something', () => {
  const styles = arenaSiteFooterStyles();
  for (const slot of SLOTS) {
    assert.ok(styles[slot]().trim().length > 0, `${slot} resolves to nothing, so the element is unstyled`);
  }
});

test('the track list and the page width are the component\'s, never the recipe\'s', () => {
  const styles = arenaSiteFooterStyles();
  const columns = styles.columns().split(/\s+/).filter(Boolean);
  assert.ok(!columns.some((cls) => cls.startsWith('grid-cols-')),
    'a fixed column count is exactly the breakpoint this component exists to avoid');
  const band = styles.band().split(/\s+/).filter(Boolean);
  assert.ok(!band.some((cls) => cls.startsWith('max-w-')),
    'a component manifest cannot read --container-max: the role shares its name with a Tailwind namespace');
});
