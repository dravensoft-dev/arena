/* A recipe resolves to the component's OWN class names, so what this suite can see is that a
 * figure and a line of prose take different value slots, and that a total takes a different row
 * from the rows over it. What the figure treatment IS is asserted once beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaKeyValueStyles } from './ArenaKeyValue.variants';

const SLOTS = ['root', 'row', 'term', 'value', 'valueNumeric', 'total', 'totalTerm', 'totalValue', 'totalValueNumeric'] as const;

test('every slot the component renders resolves to something', () => {
  const styles = arenaKeyValueStyles();
  for (const slot of SLOTS) {
    assert.ok(styles[slot]().trim().length > 0, `${slot} resolves to nothing, so the element is unstyled`);
  }
});

test('a figure and a line of prose are two answers, at both registers', () => {
  const styles = arenaKeyValueStyles();
  assert.notEqual(styles.value(), styles.valueNumeric(),
    'a money column that does not take tabular numerals is a column that jitters as it changes');
  assert.notEqual(styles.totalValue(), styles.totalValueNumeric());
});

test('the total row is not the row over it, because the rule and the register are what say so', () => {
  const styles = arenaKeyValueStyles();
  assert.notEqual(styles.row(), styles.total());
  assert.notEqual(styles.term(), styles.totalTerm());
});
