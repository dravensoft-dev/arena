/* Ordering that reaches a file, in one spelling. Seven sites sorted with `localeCompare`, which
 * answers by the runtime's locale: 'a' sorts before 'B' under en-US and after it by code unit, so
 * a generator emitted one order here and another order on a machine whose locale differs, and the
 * `git diff --exit-code` every workflow runs would read the second machine's build as a generator
 * out of step rather than as the environment it is. `walkFiles` already sorted by code unit and
 * said why in prose; this is that claim made once, so the rule is consumed and not restated.
 * The line is what the order is FOR: a list shown to a person may be locale-aware, and none here
 * is, because every one of these is written to a file that something else then compares. */

export const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const byKey = <T>(key: (item: T) => string) => (a: T, b: T) => byCodeUnit(key(a), key(b));
