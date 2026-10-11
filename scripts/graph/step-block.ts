/* What a runner prints for one step, when that step ends: the reason it ran, a `> <name>` header,
 * the whole output the step wrote and the note its outcome carries. Steps that run side by side
 * print one block each, so their output never interleaves, and the header is what a reader and
 * the timing script look for. */

import type { Outcome } from './scheduler.ts';

export function stepBlock(
  runner: string,
  step: { name: string; reason?: string | null | undefined },
  output: string,
  outcome: Outcome,
) {
  const why = step.reason ? `\n${runner}: ${step.name} runs, because ${step.reason}\n` : '';
  const body = output === '' || output.endsWith('\n') ? output : `${output}\n`;
  const note = outcome.note ? `  ${outcome.note}\n` : '';
  return `${why}\n> ${step.name}\n\n${body}${note}`;
}
