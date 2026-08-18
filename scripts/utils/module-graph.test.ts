/* One of these is the reason the patterns are shaped the way they are, and it came out of real
 * built output: `export function ArenaBreadcrumbs({ items, separator = "/" })`, whose first
 * quotation is a default argument and not a specifier. Read loosely, that is an import of the root
 * of the filesystem, arriving in a gate as a module the tree does not carry. The prose case beside
 * it is the same defect one step earlier, since these files carry documentation lifted from the
 * contracts and `export` and `from` are ordinary English there. The rest hold the two notations
 * apart: a `src` is a URL, so a bare name is a path, and a specifier is an ES one, so a bare name
 * is the import map's. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFF_SITE, isPathSpecifier, moduleScripts, importMapTargets, pageModules, importSpecifiers,
} from './module-graph.ts';

test('a module script is found whatever order its attributes are in, and a classic one is not', () => {
  const html = '<script type="module" src="a.js"></script>'
    + '<script src="b.js" type="module"></script>'
    + '<script src="c.js"></script>'
    + '<script type="module">import "./inline.js"</script>';
  assert.deepEqual(moduleScripts(html), ['a.js', 'b.js']);
});

test('a src is a URL, so a bare name is a path and only a scheme leaves the site', () => {
  const html = '<script type="module" src="entry.js"></script>'
    + '<script type="module" src="https://cdn.example/x.js"></script>'
    + '<script type="module" src="//cdn.example/y.js"></script>';
  assert.deepEqual(moduleScripts(html), ['entry.js']);
  for (const off of ['https://x/y', 'http://x', 'data:x', 'mailto:a@b', '//cdn/x', '#top']) {
    assert.ok(OFF_SITE.test(off), `${off} is off the site`);
  }
});

test('an import map hands over its targets and never its keys, which name no file', () => {
  const html = '<script type="importmap">\n{\n  "imports": {\n'
    + '    "react": "../vendor/React.generated.js",\n'
    + '    "react/jsx-runtime": "../vendor/Jsx.generated.js"\n  }\n}\n</script>';
  assert.deepEqual(importMapTargets(html), ['../vendor/React.generated.js', '../vendor/Jsx.generated.js']);
  assert.deepEqual(importMapTargets('<p>no map here</p>'), []);
});

test('a page is its module scripts and its map together, each named once', () => {
  const html = '<script type="importmap">{"imports":{"react":"./r.js"}}</script>'
    + '<script type="module" src="./r.js"></script>'
    + '<script type="module" src="./entry.js"></script>';
  assert.deepEqual(pageModules(html), ['./r.js', './entry.js']);
});

test('a specifier is an ES one, so only a path is followed and a bare name is the map\'s', () => {
  assert.deepEqual(
    importSpecifiers('import React from "react";\nimport { a } from "./a.generated.js";\n'
      + 'import "./side-effect.js";\nexport { b } from "../b.generated.js";\n'
      + 'import c from "@scope/pkg";'),
    ['./side-effect.js', './a.generated.js', '../b.generated.js'],
  );
  for (const bare of ['react', 'react-dom/client', '@scope/pkg']) {
    assert.ok(!isPathSpecifier(bare), `${bare} is the import map's to answer`);
  }
});

test('a minified import with no space in it is still an import', () => {
  assert.deepEqual(
    importSpecifiers('import{x}from"./chunk-a.js";import"./chunk-b.js";export*from"./chunk-c.js";'),
    ['./chunk-b.js', './chunk-a.js', './chunk-c.js'],
  );
});

test('a default argument that happens to be a path is not an import of it', () => {
  const js = 'import React from "react";\n'
    + 'export function ArenaBreadcrumbs({ items, separator = "/", origin }) {\n  return null;\n}\n';
  assert.deepEqual(importSpecifiers(js), [],
    'read loosely, `export ... "/"` imports the root of the filesystem');
});

test('prose using the words export and from ahead of a quotation is not an import of it', () => {
  const js = 'const knobs = [{\n'
    + '  doc: \'Whether the row is one you can export, drawn from "the first choice"\',\n'
    + '}];\n';
  assert.deepEqual(importSpecifiers(js), []);
});

test('a relative dynamic import is followed, and one built from an expression is not', () => {
  assert.deepEqual(importSpecifiers('const m = await import("./lazy.js");'), ['./lazy.js']);
  assert.deepEqual(importSpecifiers('const m = await import(`./${name}.js`);'), []);
});
