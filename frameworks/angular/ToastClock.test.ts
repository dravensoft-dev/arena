/* The clock is three branches and one of them is invisible in the signature: `persist` is implied
 * by `tone: "danger"`, which ignores a false. This project got that wrong twice, the second time
 * auto-dismissing a danger notice the component had already stamped "Does not auto-dismiss". */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_TOAST_DISMISS } from './components/feedback/arena-toast/ArenaToast';
import { arenaToastDelay, arenaToastPersists } from './ToastClock';

const DISMISS = ARENA_TOAST_DISMISS;

test('a notice only to be read runs on the default interval', () => {
  assert.equal(arenaToastDelay({ message: 'Saved' }, DISMISS), DISMISS.default);
});

test('a notice carrying an action asks the reader to decide, so it gets the longer one', () => {
  assert.equal(arenaToastDelay({ message: 'Deleted', actionLabel: 'Undo' }, DISMISS), DISMISS.actionable);
  assert.equal(arenaToastDelay({ message: 'Deleted', actionLabel: '' }, DISMISS), DISMISS.default);
});

test('a danger notice never runs on a clock, and it ignores a persist of false', () => {
  assert.equal(arenaToastDelay({ tone: 'danger' }, DISMISS), null);
  assert.equal(arenaToastDelay({ tone: 'danger', persist: false }, DISMISS), null);
  assert.equal(arenaToastPersists({ tone: 'danger', persist: false }), true);
});

test('any other tone must say so, and then it is held too', () => {
  assert.equal(arenaToastDelay({ tone: 'warning' }, DISMISS), DISMISS.default);
  assert.equal(arenaToastDelay({ tone: 'warning', persist: true }, DISMISS), null);
});
