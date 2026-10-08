/* A recipe resolves to the component's OWN class names, so what this suite can see is that a
 * figure and a line of prose take different value slots, and that a total takes a different row
 * from the rows over it. What the figure treatment IS is asserted once beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaKeyValueStyles } from './ArenaKeyValue.variants';

const SLOTS = ['root', 'row', 'term', 'value', 'total', 'totalTerm', 'totalValue'] as const;

test('every slot the component renders resolves to something', () => {
  const styles = arenaKeyValueStyles();
  for (const slot of SLOTS) {
    assert.ok(styles[slot]().trim().length > 0, `${slot} resolves to nothing, so the element is unstyled`);
  }
});

test('a figure and a line of prose are two answers, at both registers', () => {
  const prose = arenaKeyValueStyles({ numeric: false });
  const figure = arenaKeyValueStyles({ numeric: true });
  assert.notEqual(JSON.stringify(prose.$data.value()), JSON.stringify(figure.$data.value()),
    'a money column that does not take tabular numerals is a column that jitters as it changes');
  assert.notEqual(JSON.stringify(prose.$data.totalValue()), JSON.stringify(figure.$data.totalValue()));
});

test('the total row is not the row over it, because the rule and the register are what say so', () => {
  const styles = arenaKeyValueStyles();
  assert.notEqual(styles.row(), styles.total());
  assert.notEqual(styles.term(), styles.totalTerm());
});
