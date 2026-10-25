/* The kinds and report() live in report.ts, which reaches no node: module; this file re-exports them
 * and holds what needs the audit rule tags. */

import { RULE_TAGS } from './audit.ts';
import type { Report } from './report.ts';
import type { StrictKind } from './report.ts';

export { report, STRICT_KINDS, UNHOLDABLE_KINDS, REPORT_KINDS } from './report.ts';
export type { Report, ReportKind, StrictKind } from './report.ts';

export type StrictName = StrictKind | `${StrictKind}:${string}`;

export const RULES_BY_KIND: Partial<Record<StrictKind, readonly string[]>> = { audit: RULE_TAGS };

export const KINDS_BY_COMMAND = {
  check: ['components', 'contrast', 'ramp', 'weight', 'font', 'glyph', 'markers', 'heat'],
  audit: ['audit', 'restated'],
  doctor: ['environment'],
} as const satisfies Record<string, readonly StrictKind[]>;

export type StrictCommand = keyof typeof KINDS_BY_COMMAND;

export function holder(kind: string): StrictCommand | null {
  for (const command of Object.keys(KINDS_BY_COMMAND) as StrictCommand[]) {
    if ((KINDS_BY_COMMAND[command] as readonly string[]).includes(kind)) return command;
  }
  return null;
}

export function strictNames(command: StrictCommand): StrictName[] {
  return (KINDS_BY_COMMAND[command] as readonly StrictKind[]).flatMap((kind): StrictName[] =>
    RULES_BY_KIND[kind]?.map((rule): StrictName => `${kind}:${rule}`) ?? [kind]);
}

export function heldAs(one: Report, strict: readonly string[]): string | null {
  if (strict.includes(one.kind)) return one.kind;
  if (one.rule !== undefined && strict.includes(`${one.kind}:${one.rule}`)) return `${one.kind}:${one.rule}`;
  return null;
}

export function reported(reports: Report[], strict: readonly string[]) {
  return reports.filter((one) => heldAs(one, strict) !== null);
}

export function heldMessage(strict: readonly string[], held: Report[]) {
  const names = [...new Set(held.map((one) => heldAs(one, strict) ?? one.kind))];
  return `--strict holds ${strict.join(', ')}, and this run reports ${held.length} of them: ${names.join(', ')}`;
}
