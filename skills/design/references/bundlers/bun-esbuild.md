# Bun and esbuild

`bun build` and esbuild both build an app with Arena, and neither can keep Arena in a file of its own. An app release downloads Arena again, and a dictionary is what makes that download small. Read this when your project builds with `bun build` or esbuild, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| Bun `bun build` | 1.4.0 | no | does not work: verified by hand once on 2026-10-23, on the tree at `40a3c539` | no: one CSS file for the entry | verified by hand once on 2026-10-23, on the tree at `40a3c539` |
| esbuild | 0.28 | no | does not work: verified by hand once on 2026-10-23, on the tree at `40a3c539` | no: one CSS file for the entry, with splitting too | verified by hand once on 2026-10-23, on the tree at `40a3c539` |

No repository built either bundler on 2026-10-25, so both rows predate the tree that rotation measured, and its changes to the files Arena writes were not measured against them. Bun is also a package manager and a runtime. Installing Arena with bun is a different row, in [`stack.md`](../stack.md), which also names the runners that reach the `arena` command. This page is `bun build` only.

## Why can Arena not sit in a file of its own?

Both bundlers split code to share it between entries, and neither has an option that pins a module to a chunk. With one entry, Arena stays in the app's bundle. On the typical screen with `bun build`, a first visit downloads 54.11 KB, and so does every app release. An Arena patch downloads 54.13 KB, or 0.03 KB with the previous bundle as the dictionary.

**The way out is the dictionary.** Serve the bundle with `Use-As-Dictionary` and its previous version as the dictionary, as [`stylesheets.md`](../stylesheets.md) shows. Each release then downloads what changed, Arena or your app.

## Where do the sheets land?

Both emit one CSS file for the entry, holding the package sheet, `arena.generated.css` and your own rules, under a new name with every release. Import them in the order [`install.md`](../install.md) gives.

## What differs from the other bundlers?

- **`bun build` does not empty its output directory.** Every earlier hashed bundle stays beside the new one, and a deploy that copies the directory publishes them all. Clear the directory before each build.
- **An Angular project compiles with `ngc` first.** Arena's Angular package is partially compiled, so a plugin of your own runs Angular's linker, `@angular/compiler-cli/linker/babel` through `@babel/core`, over each file that holds `ɵɵngDeclare`. Both bundlers take it as an `onLoad` hook, and the bundle's entry imports `.ngc/src/main.js` and `src/styles.css`. Not built on 2026-10-25.
- **An esbuild bundle of the Angular layer defines `ngDevMode`** itself, as `define: { ngDevMode: 'false' }`, which a production build of the Angular CLI sets for you; verified by hand once. [The Angular builder page](./angular.md) covers the builder a project normally runs.

## How is the sprite served?

Copy `icons-*.svg` into the outdir after `bun build` or esbuild, with a step of your own. Neither bundler copies a file the entry does not import. Not exercised.

Under `Bun.serve`, a route answers `/${ARENA_SPRITE}` with `Bun.file` of the sprite. Not exercised.

Give the provider that same absolute path, with your base path in front of it under a deploy that is not at the root. A bare name resolves against the page, which paints nothing once the page sits below `/`.
