/* Records what a script actually opens, so a declaration is audited against a run rather than
 * against a reading of the source.
 * NOTHING HERE IMPORTS node:fs THROUGH ESM, and the rule is load-bearing rather than tidy: the
 * first ESM import of a builtin fixes the bindings every later importer gets, so a preload that
 * touches node:fs before patching wraps an object nobody will call. Measured: an ESM import ahead
 * of the patch intercepts 0 of 3 calls, and without it 3 of 3. The CommonJS object is reached
 * through createRequire, is the same object, and has writable properties.
 * It cannot see inside a process the script spawns, which is what `untraceable` says out loud. */

import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { relPosix } from '../utils/posix-path.ts';

const required = createRequire(import.meta.url);

export const TRACE_DIR = join('.cache', 'graph', 'trace');

export const TRACE_VAR = 'ARENA_TRACE_FILE';

export const READ_ENTRY_POINTS = [
  'readFileSync', 'readdirSync', 'existsSync', 'statSync', 'lstatSync', 'realpathSync', 'openSync',
  'readFile', 'readdir', 'stat', 'lstat', 'access', 'open',
];

export const traceFile = (root: string, name: string) =>
  join(root, TRACE_DIR, `${name.replace(/[:/\\]/g, '-')}.txt`);

export function relativeToRoot(root: string, target: unknown) {
  if (typeof target !== 'string' || target === '') return null;
  const full = isAbsolute(target) ? target : resolve(process.cwd(), target);
  const rel = relPosix(root, full);
  if (rel === '' || rel.startsWith('..')) return null;
  return rel;
}

export function install(fs: Record<string, unknown>, root: string, record: (rel: string) => void) {
  let wrapped = 0;
  for (const name of READ_ENTRY_POINTS) {
    const original = fs[name];
    if (typeof original !== 'function') continue;
    fs[name] = function traced(this: unknown, ...args: unknown[]) {
      const rel = relativeToRoot(root, args[0]);
      if (rel !== null) record(rel);
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    };
    wrapped += 1;
  }
  return wrapped;
}

export function collector(path: string) {
  const seen = new Set<string>();
  const flush = () => {
    const fs = required('node:fs');
    fs.mkdirSync(dirname(path), { recursive: true });
    fs.writeFileSync(path, [...seen].sort().join('\n') + (seen.size > 0 ? '\n' : ''));
  };
  return { record: (rel: string) => seen.add(rel), flush, seen };
}
