/* A file replaced whole or not at all. The text goes to <path>.<pid>.tmp beside the target and a
 * rename puts it in place, so a reader running beside the writer meets the old bytes or the new
 * ones and never a prefix, and two writers of one path leave whichever renamed last, whole. A
 * rename that fails removes its temporary file before the error travels on to the caller. */

import { renameSync, rmSync, writeFileSync } from 'node:fs';

export function writeAtomic(path: string, text: string) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  try {
    renameSync(temporary, path);
  } catch (err) {
    rmSync(temporary, { force: true });
    throw err;
  }
}
