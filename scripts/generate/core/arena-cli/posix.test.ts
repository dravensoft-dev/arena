import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { relativeFrom, toPosix } from './posix.ts';

test('a path already leaving the directory keeps its shape, and a sibling gains one', () => {
  assert.equal(relativeFrom(join('a', 'b'), join('a', 'b', 'c.woff2')), './c.woff2');
  assert.equal(relativeFrom(join('a', 'b'), join('a', 'd.woff2')), '../d.woff2');
});

test('a path the walk answers is cited in one separator, whichever one the host walked with', () => {
  assert.equal(toPosix('src\\reach.css', '\\'), 'src/reach.css');
  assert.equal(toPosix('design\\console\\plugin.css', '\\'), 'design/console/plugin.css');
  assert.equal(toPosix('src/reach.css', '/'), 'src/reach.css');
});
