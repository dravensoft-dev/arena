/* arena usage: the components this package ships that your sources draw nowhere, and the parts your
 * style plugins paint. It reads and prints, holds no report, and fails only where it cannot run. */
import { DEFAULT_CONFIG, commandOptions } from './args.ts';
import { under, voice } from './io.ts';
import type { Io } from './io.ts';
import { resolveEnvironment } from './host.ts';
import { missingSource, readPluginDirs } from './sources.ts';
import { auditStep, paintedBy, undrawnStep } from './steps.ts';

export function run(argv: string[], io: Io): number {
  const options = commandOptions('usage', argv, io);
  if (typeof options === 'number') return options;
  const say = voice(io, 'usage');
  const missing = missingSource(options.paths);
  if (missing) {
    say.err(`${missing} is not there`);
    return 2;
  }
  const config = readPluginDirs(options.config, options.config !== under(io.cwd, DEFAULT_CONFIG));
  if ('error' in config) {
    say.err(config.error);
    return 2;
  }
  const env = resolveEnvironment(io.environment);
  const read = { paths: options.paths, config: options.config };
  const undrawn = undrawnStep(read, env.packageName, env.map);
  if (undrawn.fatal.length > 0) {
    for (const line of undrawn.fatal) say.err(line);
    return 2;
  }
  for (const line of undrawn.notes) say.out(line);
  say.out(paintedBy(auditStep(read).painted));
  return 0;
}
