import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  manifestClasses, escapeClass, compileEntry, compileLayer, entryName, entryStylesheet, manifestFiles,
} from './tailwind-compile.ts';
import { CACHE_DIR } from '../arena/artifact-cache.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { relPosix } from '../../utils/posix-path.ts';

test('collects classes from slots and from every variant value', () => {
  const m = {
    component: 'X',
    slots: { root: 'inline-flex gap-2', dot: 'rounded-pill' },
    variants: { tone: { primary: { root: 'text-primary' }, danger: { root: 'text-error border-error' } } },
    defaultVariants: { tone: 'primary' },
  };
  assert.deepEqual(manifestClasses(m), [
    'border-error', 'gap-2', 'inline-flex', 'rounded-pill', 'text-error', 'text-primary',
  ]);
});

test('ignores non-class metadata and tolerates a manifest with no variants', () => {
  assert.deepEqual(manifestClasses({ component: 'X', slots: { root: 'flex' } }), ['flex']);
});

test('escapes a plain class to itself', () => {
  assert.equal(escapeClass('bg-primary'), 'bg-primary');
});

test('escapes the characters Tailwind escapes in a selector', () => {
  assert.equal(escapeClass('hover:shadow-2'), 'hover\\:shadow-2');
  assert.equal(escapeClass('h-[var(--dz-ctl-h)]'), 'h-\\[var\\(--dz-ctl-h\\)\\]');
  assert.equal(escapeClass('text-base-content/70'), 'text-base-content\\/70');
  assert.equal(escapeClass('px-4.5'), 'px-4\\.5');
});

test('hex-escapes a leading digit instead of backslash-escaping it', () => {

  assert.equal(escapeClass('2xl:hidden'), '\\32 xl\\:hidden');
});

test('entryStylesheet disables automatic content detection on the preset import and keeps the explicit manifest source', () => {
  const stylesheet = entryStylesheet('/repo/frameworks/tailwind/Theme.css', '/repo/frameworks/tailwind/components');
  assert.equal(
    stylesheet,
    "@import '/repo/frameworks/tailwind/Theme.css' source(none);\n" +
      "@source '/repo/frameworks/tailwind/components/**/*.manifest.json';\n",
  );
});

test('manifestFiles walks the nested component tree and finds every manifest', () => {
  const dir = join(repoRoot, 'frameworks/tailwind/components');
  const found = manifestFiles(dir);
  assert.equal(found.length, 55);
  for (const p of found)
    assert.match(relPosix(repoRoot, p),
      /^frameworks\/tailwind\/components\/[a-z-]+\/[a-z-]+\/[A-Z][A-Za-z]*\.manifest\.json$/,
      'the walk answers in the host separator, so the shape is read off the repo-relative spelling rather than off whichever one this machine writes');
  assert.deepEqual(found, [...found].sort(), 'the walk returns a stable, sorted order');
});

test('manifestFiles finds nothing at the old flat level, so a stale file cannot be picked up twice', () => {
  const dir = join(repoRoot, 'frameworks/tailwind/components');
  const flat = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.manifest.json'));
  assert.deepEqual(flat, []);
});

test('compileLayer keys its manifests by repo-relative path, not by basename', () => {
  const { manifests } = compileLayer();
  assert.equal(manifests.size, 55);
  for (const key of manifests.keys())
    assert.match(key, /^frameworks\/tailwind\/components\/[a-z-]+\/[a-z-]+\/[A-Z][A-Za-z]*\.manifest\.json$/);
});

test('an entry with no declared inputs is compiled rather than held, which is what the spawn cases need', () => {
  const held = entryName('@import \'a\';');
  assert.notEqual(held, entryName('@import \'b\';'),
    'the entry text decides the name, so two entries over one input set cannot collide');
  assert.equal(existsSync(join(repoRoot, CACHE_DIR, `${held}.json`)), false,
    'compileEntry called without inputs records nothing, or the spawn below is unreachable');
});

test('a failed spawn includes the underlying error (e.g. ENOENT) rather than "exited null"', () => {
  const realExecPath = process.execPath;
  process.execPath = '/nonexistent/arena-test-binary-xyz';
  try {
    assert.throws(
      () => compileEntry('@import \'nothing\';'),
      (err: Error) => {
        assert.match(err.message, /tailwindcss failed to spawn/);
        assert.match(err.message, /ENOENT/);
        return true;
      },
    );
  } finally {
    process.execPath = realExecPath;
  }
});
