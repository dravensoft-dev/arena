/* What kind of question a report answers, which is what --strict is a switch over. A project
 * rarely wants one answer to every kind: a brand is a decision its owner already made and
 * measured, an icon nobody draws is a typo, and where the command happens to be running is
 * neither of those. One switch over every kind makes the strictest of them the price of any of
 * them, so the kind travels with the message from the step that produced it. */

export const STRICT_KINDS = ['components', 'contrast', 'ramp', 'glyph', 'markers', 'audit',
  'environment'] as const;

export type StrictKind = (typeof STRICT_KINDS)[number];

export type Report = { kind: StrictKind; message: string };

export function report(kind: StrictKind, message: string): Report {
  return { kind, message };
}

export function reported(reports: Report[], strict: readonly StrictKind[]) {
  return reports.filter((one) => strict.includes(one.kind));
}
