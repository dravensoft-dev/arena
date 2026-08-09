/* The five readers of a manifest key, asked the question a Windows runner asks. Each of them
 * treats the key as a string carrying '/', and against a native one four answer the input
 * unchanged and the fifth throws: the build wrote every sheet beside its manifest, emitted a
 * barrel of backslash specifiers into CSS, skipped both consumer mirrors, and then died in
 * preludeSpecifier on a repeat of -3 that named neither the file nor the reason. None of that is
 * reachable from Linux through the real build, whose keys are already posix; it is reachable by
 * spelling the key the way win32 would and asking the same functions. The expected values below
 * are the ones the committed tree holds, not arithmetic done on paper. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { CONSUME, PRELUDE, preludeSpecifier, sheetPath } from './build-tailwind.ts';

const WINDOWS_ROOT = 'D:\\a\\arena\\arena';

const WINDOWS_MANIFEST =
  'D:\\a\\arena\\arena\\frameworks\\tailwind\\components\\display\\arena-badge\\ArenaBadge.manifest.json';

const key = () => relPosix(WINDOWS_ROOT, WINDOWS_MANIFEST, win32);

test('a key made on Windows is the same key Linux makes, which is what every reader below assumes', () => {
  assert.equal(key(), 'frameworks/tailwind/components/display/arena-badge/ArenaBadge.manifest.json');
});

test('the sheet lands under consume/ at the same category and directory, and not beside its manifest', () => {
  assert.equal(sheetPath(key()),
    'frameworks/tailwind/consume/components/display/arena-badge/ArenaBadge.styles.generated.css');
});

test('the prelude specifier climbs the directories that are there, and never a negative number of them', () => {
  assert.equal(preludeSpecifier(sheetPath(key())), '../../../Prelude.generated.css',
    'this is the specifier the committed ArenaBadge sheet holds; a native key counts three fewer '
    + 'segments, and repeat of -3 is the RangeError the Windows leg reported');
});

test('a key that is not repo-relative posix says so, rather than throwing a RangeError naming nothing', () => {
  assert.throws(() => preludeSpecifier('frameworks\\tailwind\\consume\\components\\x\\Y.styles.generated.css'),
    /repo-relative posix key/);
});

test('a native key is a silent no-op in sheetPath, which is why the key and not the reader is the fix', () => {
  const native = 'frameworks\\tailwind\\components\\display\\arena-badge\\ArenaBadge.manifest.json';
  assert.equal(sheetPath(native), native.replace(/\.manifest\.json$/, '.styles.generated.css'),
    'the prefix replace matches nothing, so the sheet keeps the manifest\'s own directory and no '
    + 'error is raised: the build simply writes the file somewhere no barrel imports it from');
});

test('the barrel specifier is relative to consume/, since it is written into a stylesheet', () => {
  assert.equal(sheetPath(key()).replace(`${CONSUME}/`, ''),
    'components/display/arena-badge/ArenaBadge.styles.generated.css');
});

test('a class module mirrors into a consuming layer by prefix, which a native key would skip', () => {
  assert.equal(
    key().replace(/\.manifest\.json$/, '.classes.generated.ts').replace('frameworks/tailwind/', 'frameworks/react/'),
    'frameworks/react/components/display/arena-badge/ArenaBadge.classes.generated.ts');
});

test('the prelude the specifier points at is the one under consume/, so the depth is read from it', () => {
  assert.equal(PRELUDE, `${CONSUME}/Prelude.generated.css`,
    'preludeSpecifier counts segments against this constant, so a move of the prelude changes '
    + 'every sheet and the count has to come from here rather than from a literal');
});
