/* A wait's bound, declared where the wait is, carrying the reason it is that size. A number
 * without one is indistinguishable from a number somebody guessed on the machine they hit it
 * on, and it gets copied rather than argued with. The reason is a value and not a comment
 * because a value can be printed by the expiry that spends it. A deadline is generous by
 * intent: its job is to end a hang, and one tuned until it only just passes is a test of the
 * runner wearing the costume of a test of the subject. */

export type Deadline = { name: string; ms: number; why: string };

export function deadline(name: string, ms: number, why: string): Deadline {
  if (name.trim() === '') {
    throw new Error(`a deadline of ${ms}ms carries no name, and the name is what an expiry reports`);
  }
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new Error(`deadline ${name} is ${ms}ms, and a wait that cannot expire detects no hang`);
  }
  if (why.trim() === '') {
    throw new Error(`deadline ${name} carries no reason, and a number carrying none gets copied `
      + 'rather than argued with');
  }
  return { name, ms, why };
}

export function isDeadline(value: unknown): value is Deadline {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Deadline>;
  return typeof candidate.name === 'string'
    && typeof candidate.ms === 'number'
    && typeof candidate.why === 'string';
}

export const BUDGET_SLACK = 2;

export function budgetFor(...spent: Deadline[]): number {
  if (spent.length === 0) {
    throw new Error('a budget derived from no deadline is a hand-written number wearing a call, '
      + 'and the set it is derived from is the only thing that can be checked');
  }
  return spent.reduce((total, one) => total + one.ms, 0) * BUDGET_SLACK;
}
