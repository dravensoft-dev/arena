/* arena clean: it deletes the sheets arena build writes, by name, inside --out. It never deletes
 * another file or the directory, so it is safe to run in a source tree. */
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { commandOptions } from './args.ts';
import { voice } from './io.ts';
import type { Io } from './io.ts';
import { OUTPUT_SHEETS } from './sources.ts';

export function run(argv: string[], io: Io): number {
  const options = commandOptions('clean', argv, io);
  if (typeof options === 'number') return options;
  const say = voice(io, 'clean');
  let removed = 0;
  let failed = 0;
  for (const name of OUTPUT_SHEETS) {
    const at = join(options.out, name);
    if (!existsSync(at)) continue;
    try {
      rmSync(at);
    } catch (error) {
      say.err(`cannot delete ${at}: ${(error as Error).message}`);
      failed++;
      continue;
    }
    say.out(`removed ${at}`);
    removed++;
  }
  if (failed > 0) return 2;
  if (removed === 0) say.out(`nothing to remove in ${options.out}`);
  return 0;
}
