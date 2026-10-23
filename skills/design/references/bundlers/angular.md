# The Angular application builder

`@angular/build`'s `application` builder is the builder a new Angular CLI project runs. The builder cannot keep Arena apart, and an update of Arena still downloads little when it is served through a dictionary. Read this when your Angular project builds with the CLI, after [the bundler index](./index.md).

## Which version, and how sure is each answer?

| Builder | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| `@angular/build` `application` | 22.2.1 | no | does not work | no | measured on 2026-10-23 |

The figures are in [`environments.md`](../environments.md): a typical screen's `main` weighs 65.06 KB, and a release or an Arena patch downloads it whole without a dictionary and 0.03 KB with one.

## Why does Arena land in `main`?

The builder has no `manualChunks` or equivalent option, and the layer is partially compiled, so the builder links Arena's components into `main` with your app. A per-component entry point costs nothing here, because the builder tree-shakes the package's module well; what it cannot do is give Arena a file of its own.

**The way out is the dictionary.** Serve `main` with `Use-As-Dictionary` and its previous version as the dictionary, as [`stylesheets.md`](../stylesheets.md) shows in its section on keeping Arena's JS apart. An update of Arena then downloads what changed in `main`, which includes your app's code, and the first visit does not grow.

## Where do the sheets land?

The `styles` option emits one CSS file. The package sheet and `arena.generated.css` join in it, 13.72 KB on the typical screen, under a new name with every release. Import them from `src/styles.css` in the order [`install.md`](../install.md) gives, section "How do I import the stylesheets in Angular?". The CDK overlay sheet comes with the package sheet.

## What differs from the other bundlers?

- **The sprite is copied only when `assets` names it.** [`install.md`](../install.md), section "How does the toolchain serve the sprite?", gives the entry for `angular.json`.
- **The Angular package declares `"sideEffects": false`**, so a component you do not import is not in `main`.
- **Bundling the Angular layer outside the CLI** sets what the CLI sets for you. An esbuild bundle of it was built with `define: { ngDevMode: 'false' }`, which strips Angular's dev-mode branches as a production build of the CLI does; verified by hand once. [Bun and esbuild](./bun-esbuild.md) say what else esbuild does with Arena.
