# Bun and esbuild

`bun build` and esbuild both build an app with Arena, and neither can keep Arena in a file of its own. An app release downloads Arena again, and a dictionary is what makes that download small. Read this when your project builds with `bun build` or esbuild, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun `bun build` | 1.4.0 | no | does not work: measured on 2026-10-25, Bun 1.4.0, Arena: the tree that becomes 13.0.0 (`40c82585b`) | no: one CSS file for the entry | measured on 2026-10-25, Bun 1.4.0, Arena: the tree that becomes 13.0.0 (`40c82585b`) |
| esbuild | 0.28.2 | no | does not work: measured on 2026-10-25, esbuild 0.28.2, Arena: the tree that becomes 13.0.0 (`40c82585b`) | no: one CSS file for the entry, with splitting too | measured on 2026-10-25, esbuild 0.28.2, Arena: the tree that becomes 13.0.0 (`40c82585b`) |

One React and one Angular project built each, with the config below. Bun is also a package manager and a runtime. Installing Arena with bun is a different row, in [`stack.md`](../stack.md), which also names the runners that reach the `arena` command. This page is `bun build` only.

## Why can Arena not sit in a file of its own?

Both bundlers split code to share it between entries, and neither has an option that pins a module to a chunk. With one entry, Arena stays in the app's bundle. With `bun build`, a first visit downloads 93.46 KB on React and 274.14 KB on Angular, and so does every app release. An Arena patch downloads 93.55 and 274 KB, or 1.35 and 0.05 KB with the previous bundle as the dictionary. With esbuild, a first visit downloads 75.24 KB on React and 199.84 KB on Angular, an Arena patch 75.22 and 199.75 KB, or 0.05 KB with the dictionary. The projects draw different screens, so the figures compare each project's builds and not the two bundlers.

**The way out is the dictionary.** Serve the bundle with `Use-As-Dictionary` and its previous version as the dictionary, as [`stylesheets.md`](../stylesheets.md) shows. Each release then downloads what changed, Arena or your app.

## What config did each project use?

The configs below are the ones measured, on 2026-10-25. `bun build` on React is one command, `bun build ./src/index.html --outdir dist --minify`, which a `bundle` script in `package.json` runs. On Angular, `ngc` compiles first, and `Bun.build` bundles its output with the linker hook:

```js
import linker from '@angular/compiler-cli/linker/babel';
import { transformSync } from '@babel/core';
import { readFileSync } from 'node:fs';

// The Angular packages are partially compiled (`ɵɵngDeclare`): the linker finishes them, as `ng build` does.
const angularLinker = {
  name: 'angular-linker',
  setup(build) {
    build.onLoad({ filter: /[\\/]node_modules[\\/].*\.[cm]?js$/ }, (args) => {
      const code = readFileSync(args.path, 'utf8');
      if (!code.includes('ɵɵngDeclare')) return undefined;
      const out = transformSync(code, { filename: args.path, babelrc: false, configFile: false, compact: false, sourceMaps: false, plugins: [linker] });
      return { contents: out.code, loader: 'js' };
    });
  },
};

const built = await Bun.build({
  entrypoints: ['./entry.js'],
  outdir: 'dist',
  naming: '[name]-[hash].[ext]',
  minify: true,
  plugins: [angularLinker],
  throw: false,
});
for (const message of built.logs) console.log(String(message));
if (!built.success) process.exit(1);
```

esbuild on React, with `splitting: true` and a hashed name for each kind of file:

```js
import { build } from 'esbuild';

await build({
  entryPoints: { main: 'src/Main.tsx' },
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'dist',
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
  assetNames: '[name]-[hash]',
  minify: true,
  target: 'es2022',
  jsx: 'automatic',
  logLevel: 'warning',
});
```

esbuild on Angular adds the linker hook and the `ngDevMode` define:

```js
import linker from '@angular/compiler-cli/linker/babel';
import { transformSync } from '@babel/core';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

// The Angular packages are partially compiled (`ɵɵngDeclare`): the linker finishes them, as `ng build` does.
const angularLinker = {
  name: 'angular-linker',
  setup(build) {
    build.onLoad({ filter: /[\\/]node_modules[\\/].*\.[cm]?js$/ }, (args) => {
      const code = readFileSync(args.path, 'utf8');
      if (!code.includes('ɵɵngDeclare')) return undefined;
      const out = transformSync(code, { filename: args.path, babelrc: false, configFile: false, compact: false, sourceMaps: false, plugins: [linker] });
      return { contents: out.code, loader: 'js' };
    });
  },
};

await build({
  entryPoints: { main: './entry.js' },
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'dist',
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
  assetNames: '[name]-[hash]',
  minify: true,
  target: 'es2022',
  plugins: [angularLinker],
  define: { ngDevMode: 'false' },
  logLevel: 'warning',
});
```

## Where do the sheets land?

Both emit one CSS file for the entry, holding the package sheet, `arena.generated.css` and your own rules, under a new name with every release. Import them in the order [`install.md`](../install.md) gives.

## What differs from the other bundlers?

- **`bun build` does not empty its output directory.** Every earlier hashed bundle stays beside the new one, and a deploy that copies the directory publishes them all. Measured on 2026-10-25, two builds into one directory left two entry files. Clear the directory before each build.
- **An Angular project compiles with `ngc` first.** Arena's Angular package is partially compiled, so a plugin of your own runs Angular's linker, `@angular/compiler-cli/linker/babel` through `@babel/core`, over each file that holds `ɵɵngDeclare`. Both bundlers take it as an `onLoad` hook, and the bundle's entry imports `.ngc/src/main.js` and `src/styles.css`. Both were built on Angular on 2026-10-25 with that hook.
- **An esbuild bundle of the Angular layer defines `ngDevMode`** itself, as `define: { ngDevMode: 'false' }`, which a production build of the Angular CLI sets for you. Without it the main bundle was 1480847 bytes before compression, and with it 959421, measured on 2026-10-25. [The Angular builder page](./angular.md) covers the builder a project normally runs.

## How is the sprite served?

Copy `icons-*.svg` into the outdir after `bun build` or esbuild, with a step of your own. Neither bundler copies a file the entry does not import: the `bun build` output held no sprite, measured on 2026-10-25, and esbuild's was not checked. The projects copy it after the bundler with a script of their own.

Under `Bun.serve`, a route answers `/${ARENA_SPRITE}` with `Bun.file` of the sprite. Not exercised.

Give the provider that same absolute path, with your base path in front of it under a deploy that is not at the root. A bare name resolves against the page, which paints nothing once the page sits below `/`.
