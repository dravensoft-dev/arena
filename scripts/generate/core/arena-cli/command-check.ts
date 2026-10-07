/* arena check: it names what the sheets a build would write, and your sources, get wrong, and writes
 * nothing. A report is held only by --strict, and only when its kind is one check holds. */
import { commandOptions, DEFAULT_OUT } from './args.ts';
import { voice, under } from './io.ts';
import type { Io } from './io.ts';
import { resolveEnvironment } from './host.ts';
import { plan } from './plan.ts';
import { heldMessage, reported } from './reports.ts';
import { markersStep } from './steps.ts';

export function run(argv: string[], io: Io): number {
  const options = commandOptions('check', argv, io);
  if (typeof options === 'number') return options;
  const say = voice(io, 'check');
  const env = resolveEnvironment(io.environment);

  const planned = plan({ ...options, out: under(io.cwd, DEFAULT_OUT), importHeader: true }, env);
  if (planned.fatal.length > 0) {
    for (const line of planned.fatal) say.err(line);
    return planned.code;
  }

  const markers = markersStep({ ...options, audit: false }, env.map);
  const reports = [...planned.reports, ...markers.reports];
  for (const one of reports) say.err(`[${one.kind}] ${one.message}`);
  for (const note of planned.notes) say.out(note);
  say.out(`${reports.length || 'no'} report(s)`);

  const held = reported(reports, options.strict);
  if (held.length === 0) return 0;
  say.err(heldMessage(options.strict, held));
  return 1;
}
