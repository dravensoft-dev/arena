# The Angular application builder

`@angular/build`'s `application` builder is the builder a new Angular CLI project runs. The builder cannot keep Arena apart, and an update of Arena still downloads little when it is served through a dictionary. Read this when your Angular project builds with the CLI, after [the bundler index](./index.md).

## Which version, and how sure is each answer?

| Builder | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| `@angular/build` `application` | 22.2.4 | no | does not work: measured on 2026-10-25, `@angular/build` 22.2.4, Arena: the tree that becomes 13.0.0 (`40c82585b`) | no | measured on 2026-10-25, `@angular/build` 22.2.4, Arena: the tree that becomes 13.0.0 (`40c82585b`) |

One Angular repository built it, with the builder's options as the Angular CLI writes them. The figures are in [`environments.md`](../environments.md): on that half `main` weighs 98.5 KB, and a release or an Arena patch downloads it whole without a dictionary and 0.05 KB with one.

## Why does Arena land in `main`?

The builder has no `manualChunks` or equivalent option, and the layer is partially compiled, so the builder links Arena's components into `main` with your app. The build holds one `main-*.js` with Arena's modules in it and no file with Arena's modules alone, measured on 2026-10-25. A per-component entry point costs nothing here, because the builder tree-shakes the package's module well; what it cannot do is give Arena a file of its own.

**The way out is the dictionary.** Serve `main` with `Use-As-Dictionary` and its previous version as the dictionary, as [`stylesheets.md`](../stylesheets.md) shows in its section on keeping Arena's JS apart. An update of Arena then downloads what changed in `main`, which includes your app's code, and the first visit does not grow.

## Where do the sheets land?

The `styles` option emits one CSS file, measured on 2026-10-25. The package sheet and `arena.generated.css` join in it, 16.31 KB on the measured half's screen, under a new name with every release. Import them from `src/styles.css` in the order [`install.md`](../install.md) gives, section "How do I import the stylesheets in Angular?". The CDK overlay sheet comes with the package sheet.

## What differs from the other bundlers?

- **The Angular package declares `"sideEffects": false`**, so a component you do not import is not in `main`. The installed package's `package.json` says so, measured on 2026-10-25.
- **Bundling the Angular layer outside the CLI** sets what the CLI sets for you. An esbuild bundle of it was built with `define: { ngDevMode: 'false' }`, which strips Angular's dev-mode branches as a production build of the CLI does; verified by hand once. [Bun and esbuild](./bun-esbuild.md) say what else esbuild does with Arena.
- **The output directory** takes `outputPath: { base: 'dist', browser: '' }`, and `ng build --base-href ./` serves a deploy in a subdirectory. A production build writes a licenses file and a prerendered-routes file beside the browser output, and a deploy of the directory removes them or sets `extractLicenses`.

## How is the sprite served?

The `assets` entry that [`install.md`](../install.md) gives, in its section "How does the toolchain serve the sprite?", copies the file to the root of the output. The builder copies only what `assets` names.

The provider takes `/${ARENA_SPRITE}` under a root deploy, and the builder's `baseHref` in front of it under another. A name without the slash is read against the current route, and the Angular router's nested routes then request the sprite from a folder that does not hold it.
