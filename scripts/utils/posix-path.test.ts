/* `toPosix` makes one claim, and it is about intent rather than about this platform: the
 * conversion is a no-op wherever the separator is already a forward slash, which is why
 * nineteen sites could spell it three ways and never disagree. `isInside` is the opposite
 * case and is why the path module is a parameter: its answer DOES differ by platform, and
 * a suite that could only assert this one would leave the half nobody has a machine for
 * covered by nothing. The win32 cases below run here, on Linux, and that is the point. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join, posix, sep, win32 } from 'node:path';
import { isInside, toPosix } from './posix-path.ts';

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
