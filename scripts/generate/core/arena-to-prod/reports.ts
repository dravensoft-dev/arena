/* What kind of question a report answers, which is what --strict is a switch over. A project
 * rarely wants one answer to every kind: a brand is a decision its owner already made and
 * measured, an icon nobody draws is a typo, and where the command happens to be running is
 * neither of those. One switch over every kind makes the strictest of them the price of any of
 * them, so the kind travels with the message from the step that produced it. REPORT_KINDS is
 * every kind and STRICT_KINDS is the ones --strict may hold: a kind outside it is one no
 * configuration can clear, so making it fatal would only buy a project a build it cannot fix. */

export const STRICT_KINDS = ['components', 'contrast', 'ramp', 'weight', 'glyph', 'markers',
  'audit', 'environment', 'restated', 'skill'] as const;

export const UNHOLDABLE_KINDS = ['wash'] as const;

export const REPORT_KINDS = [...STRICT_KINDS, ...UNHOLDABLE_KINDS] as const;

export type StrictKind = (typeof STRICT_KINDS)[number];

export type ReportKind = (typeof REPORT_KINDS)[number];

export type Report = { kind: ReportKind; message: string };

export function report(kind: ReportKind, message: string): Report {
  return { kind, message };
}

export function reported(reports: Report[], strict: readonly StrictKind[]) {
  return reports.filter((one) => strict.includes(one.kind as StrictKind));
}
