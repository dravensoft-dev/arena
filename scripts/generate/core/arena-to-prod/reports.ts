/* What kind of question a report answers, which is what --strict is a switch over. A run reports
 * on six different things, and a project rarely wants the same answer to all six: a brand is a
 * decision its owner already made and measured, while an icon nobody draws is a typo. One switch
 * over the six makes the strictest of them the price of any of them, so the kind travels with the
 * message from the step that produced it. */

export const STRICT_KINDS = ['components', 'contrast', 'ramp', 'glyph', 'markers', 'audit'] as const;

export type StrictKind = (typeof STRICT_KINDS)[number];

export type Report = { kind: StrictKind; message: string };

export function report(kind: StrictKind, message: string): Report {
  return { kind, message };
}

export function reported(reports: Report[], strict: readonly StrictKind[]) {
  return reports.filter((one) => strict.includes(one.kind));
}
