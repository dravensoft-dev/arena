/* arena clean, declared and not yet built: it parses its flags like the finished command will, then
 * says so and exits 2, so the dispatch table is whole before any command is. */
import { commandOptions } from './args.ts';
import { voice } from './io.ts';
import type { Io } from './io.ts';

export function run(argv: string[], io: Io): number {
  const options = commandOptions('clean', argv, io);
  if (typeof options === 'number') return options;
  voice(io, 'clean').err('not built yet');
  return 2;
}
