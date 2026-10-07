/* arena audit: it reads your sources and style plugins against the rules of the language and
 * writes nothing. A finding is a report of kind audit or restated, held only by --strict. */
import { commandOptions } from './args.ts';
import { voice } from './io.ts';
import type { Io } from './io.ts';
import { resolveEnvironment } from './host.ts';
import { heldMessage, reported } from './reports.ts';
import { packageCatalogue } from './sheets.ts';
import { missingSource, readPluginDirs } from './sources.ts';
import { auditStep } from './steps.ts';

export function run(argv: string[], io: Io): number {
  const options = commandOptions('audit', argv, io);
  if (typeof options === 'number') return options;
  const say = voice(io, 'audit');

  const missing = missingSource(options.paths);
  if (missing) {
    say.err(`${missing} is not there`);
    return 2;
  }
  const config = readPluginDirs(options.config, options.configGiven);
  if ('error' in config) {
    say.err(config.error);
    return 2;
  }

  const env = resolveEnvironment(io.environment);
  const found = auditStep(options, env.arena,
    env.arena ? packageCatalogue(env.arena) : null, env.vocabulary);

  for (const one of found.reports) say.err(`[${one.kind}] ${one.message}`);
  say.out(`audited ${found.scanned} file(s), ${found.reports.length || 'no'} finding(s). `
    + 'Nothing reads the rendered view or the application as a whole, so those hold because you hold them');

  const held = reported(found.reports, options.strict);
  if (held.length === 0) return 0;
  say.err(heldMessage(options.strict, held));
  return 1;
}
