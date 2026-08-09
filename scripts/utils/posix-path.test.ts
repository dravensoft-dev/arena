/* `toPosix` makes one claim, and it is about intent rather than about this platform: the
 * conversion is a no-op wherever the separator is already a forward slash, which is why
 * nineteen sites could spell it three ways and never disagree. That no-op is also why it
 * takes the path module now: asserted without one it can only be asked the question whose
 * answer is already the input, so a caller depending on the conversion was depending on
 * something this suite had never once seen happen. `isInside` is the case where the answer
 * DOES differ by platform, and a suite that could only assert the Linux one would leave the
 * half nobody has a machine for covered by nothing. `relPosix` is both at once: a `relative`
 * answer is native, and every caller here wants it posix. The win32 cases below run on
 * Linux, and that is the point. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join, posix, sep, win32 } from 'node:path';
import { isInside, relPosix, toPosix } from './posix-path.ts';

test('a path already spelled with forward slashes comes back unchanged', () => {
  assert.equal(toPosix('css/components/arena-badge.css'), 'css/components/arena-badge.css');
  assert.equal(toPosix(''), '');
});

test('a path built by join comes back with forward slashes whatever built it', () => {
  assert.equal(toPosix(join('css', 'components', 'arena-badge.css')), 'css/components/arena-badge.css');
});

test('every separator is replaced and not merely the first', () => {
  assert.equal(toPosix(['a', 'b', 'c'].join(sep)), 'a/b/c');
});

test('under win32 a native path becomes a posix one, which no Linux runner would show', () => {
  assert.equal(toPosix('frameworks\\tailwind\\components\\display\\ArenaBadge.manifest.json', win32),
    'frameworks/tailwind/components/display/ArenaBadge.manifest.json');
  assert.equal(toPosix('C:\\repo\\frameworks\\tailwind\\Theme.css', win32),
    'C:/repo/frameworks/tailwind/Theme.css');
  assert.equal(toPosix('already/posix', win32), 'already/posix',
    'win32 reads a forward slash too, so a path already spelled that way converts rather than doubling');
});

test('a relative answer is native, and relPosix is the spelling every caller of it wanted', () => {
  assert.equal(
    relPosix('C:\\repo', 'C:\\repo\\frameworks\\tailwind\\components\\display\\arena-badge\\ArenaBadge.manifest.json', win32),
    'frameworks/tailwind/components/display/arena-badge/ArenaBadge.manifest.json',
    'this key is split on "/" to count a depth, prefix-replaced and sorted by three readers, and '
    + 'the native answer makes every one of them a silent no-op rather than a failure');
  assert.equal(relPosix('/repo', '/repo/frameworks/tailwind/Theme.css', posix),
    'frameworks/tailwind/Theme.css', 'the platform that emits the tracked files must see no change');
  assert.equal(relPosix('C:\\repo', 'C:\\repo', win32), '', 'a path relative to itself is empty, not "."');
});

test('a path is inside itself, and a nested one is inside its base', () => {
  assert.equal(isInside('/repo', '/repo', posix), true);
  assert.equal(isInside('/repo', '/repo/a/b/c.html', posix), true);
  assert.equal(isInside('/repo/', '/repo/a.html', posix), true,
    'a base spelled with a trailing slash is the same base, and a server given one that way '
    + 'must not refuse everything under it');
});

test('a sibling whose name merely starts with the base is not inside it', () => {
  assert.equal(isInside('/repo', '/repo-evil/x.html', posix), false,
    'this is what a string prefix gets wrong, and it gets it wrong OPEN: serve.ts compared '
    + 'startsWith(root) with no separator boundary and let every sibling through');
});

test('a path that climbs out is outside, and a name merely beginning with dots is not', () => {
  assert.equal(isInside('/repo', '/etc/passwd', posix), false);
  assert.equal(isInside('/repo', '/repo/../etc', posix), false);
  assert.equal(isInside('/repo', '/repo/..hidden/x', posix), true,
    'a directory named ..hidden climbs nowhere, so the test is the separator after the dots '
    + 'and never the dots alone');
});

test('the same questions answer the same way under win32, which no Linux runner would show', () => {
  assert.equal(isInside('C:\\repo', 'C:\\repo\\a\\b.html', win32), true,
    'the spelling this replaced compared startsWith(base + "/"), which is false for every '
    + 'nested path once resolve() hands back backslashes, so all four browser gates 403ed');
  assert.equal(isInside('C:\\repo', 'C:\\repo', win32), true);
  assert.equal(isInside('C:\\repo', 'C:\\repo-evil\\x.html', win32), false);
  assert.equal(isInside('C:\\repo', 'C:\\Windows\\System32', win32), false);
});

test('another volume is outside, whatever its name looks like', () => {
  assert.equal(isInside('C:\\repo', 'D:\\repo\\a.html', win32), false,
    'relative() across volumes answers an absolute path, which is the one case a rooted '
    + 'comparison cannot express as a number of ".." segments');
});

test('win32 compares a volume and a directory case-insensitively, as its filesystem does', () => {
  assert.equal(isInside('C:\\Repo', 'c:\\repo\\a.html', win32), true,
    'NTFS is case-insensitive, so a base and a path differing only in case name one directory, '
    + 'and answering otherwise would refuse a real file');
});
