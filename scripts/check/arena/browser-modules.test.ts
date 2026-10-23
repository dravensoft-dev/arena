/* The intro/ modules parse, and what a browser is handed is a bundle. build-intro.ts put
 * that bundle between the pages and scripts/, which is what let the two modules they reach
 * become TypeScript. The rule below is the other end of that arrangement, and it is about
 * the SOURCE rather than the bundle: a page's own module file may import .ts freely now,
 * and the thing that must never be TypeScript is what an HTML file names, which is why
 * check:intro reads the pages and this reads what the pages load. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { moduleEntries } from '../../build/arena/build-intro.ts';

const MODULES = ['intro/overview.js', 'intro/theme.js'];

const REACHES_SCRIPTS = /from\s+['"]([^'"]*\/scripts\/[^'"]+)['"]/g;

export function browserReachableScripts(files = MODULES, base = root): string[] {
  const found = new Set<string>();
  for (const file of files) {
    const source = readFileSync(join(base, file), 'utf8');
    for (const m of source.matchAll(REACHES_SCRIPTS)) {
    const spec = m[1] ?? '';
    found.add(spec.slice(spec.indexOf('scripts/')));
  }
  }
  return [...found].sort();
}

const BROWSER_GLOBAL = /\b(document|window|navigator|location|fetch)\b.*(is not defined|undefined)|Can't find variable/i;

for (const file of MODULES) {
  test(`${file} parses`, async () => {
    let error = null;
    try {
      await import(`${pathToFileURL(join(root, file)).href}?t=${Date.now()}`);
    } catch (err) {
      error = err as Error;
    }
    if (!error) return;
    assert.ok(
      error instanceof ReferenceError && BROWSER_GLOBAL.test(error.message),
      `${file} failed to parse or threw unexpectedly: ${error.constructor.name}: ${error.message}`,
    );
  });
}

test('intro/overview.js does nothing on a page that has no #sections, with a DOM registered', () => {
  const code = `
    import { GlobalRegistrator } from '@happy-dom/global-registrator';
    GlobalRegistrator.register();
    if (document.getElementById('sections')) throw new Error('the page has a host');
    process.on('unhandledRejection', (reason) => { console.error(String(reason)); process.exit(3); });
    await import(${JSON.stringify(pathToFileURL(join(root, 'intro/overview.js')).href)});
    await new Promise((resolve) => setImmediate(resolve));
    await GlobalRegistrator.unregister();
  `;
  const ran = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { cwd: root, encoding: 'utf8' });
  assert.equal(ran.status, 0, `a page module whose host is absent must not run, throw or reject, in a fresh process because the first import of a module is the one that runs it: ${ran.stderr}`);
});

test('what an intro page hands a browser is a bundle, never a module reaching into scripts/', () => {
  const entries = moduleEntries(root);
  assert.ok(entries.length > 0, 'no page declares a module entry, so this suite proves nothing');

  for (const { page, out, source } of entries) {
    assert.ok(out.endsWith('.generated.js'),
      `${page} loads ${out}, which is not a bundle: a page that names its source serves whatever `
      + 'that source imports, and scripts/ goes back out of reach of TypeScript with every gate green');
    assert.ok(existsSync(join(root, 'intro', out)), `${page} loads ${out} and it is not there`);
    assert.ok(existsSync(join(root, 'intro', source)), `${out} is built from ${source}, which is not there`);
  }
});

test('a page source may now import TypeScript, which is what the build step bought', () => {
  const reached = browserReachableScripts();
  assert.ok(reached.length > 0,
    'no intro/ module reaches scripts/ any more, so the build step is holding nothing open');
  assert.deepEqual(reached, [
    'scripts/lib/arena/css-decls.ts',
    'scripts/lib/core/token-preview.ts',
  ]);
});
