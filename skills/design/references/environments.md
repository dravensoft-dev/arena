# The environments Arena was tested on

Which bundlers was Arena measured with, and in which versions? What did each one download, and which cannot keep Arena in a chunk of its own? Does the Angular builder work? Read this to see what is known about your toolchain before you rely on it. **This page is a record and not a recommendation**: no bundler is required, and a row here says what happened when somebody ran it.

[`stack.md`](./stack.md) gives the recipe that keeps Arena in a chunk of its own for each bundler. [`stylesheets.md`](./stylesheets.md) says how long to cache each file, and how to serve that chunk with a dictionary.

## How was each row measured?

Every figure is in KB of 1024 bytes, compressed with brotli at quality 11 and a 24-bit window. The screens are two React apps. The typical one draws AppBar, SideNav, Button, Input, Card, Table, Dialog, ToastHost, StatCard, LineChart, Select and Tabs. The full one imports every component by name. Arena's package is copied into `node_modules/@dravensoft/arena-react` of each project, as in an app. "Arena apart" means the bundler's own way of keeping a module in a chunk of its own, named in [`stack.md`](./stack.md).

| column | what it measures |
| --- | --- |
| first visit | the JS a visitor downloads, with Arena in the app's bundle, then with Arena apart |
| app release only | the JS a returning visitor downloads again after a release that changes the app and not Arena |
| one-component patch | the JS downloaded again after Arena changes one line of one component |
| with a dictionary | a one-component patch, with the previous file as the dictionary of Compression Dictionary Transport |

Typical and full figures are written typical / full. Arena is at the tree that becomes 13.0.0, measured at commit `40a3c539` on 2026-10-23. Every row is measured again when a weight budget of Arena's own board moves.

## What did each bundler measure?

| bundler | version | keeps Arena apart | first visit | app release only | one-component patch | with a dictionary |
| --- | --- | --- | --- | --- | --- | --- |
| rollup | 4.62 | yes, `manualChunks` | 53.93 to 54.21 / 103.38 to 103.81 | 53.93 to 0.44 / 103.38 to 0.66 | 14.86 / 64.49 | 0.05 / 0.05 |
| Vite | 7.3.7 | yes, `manualChunks` | within 0.5 of rollup | within 0.5 of rollup | within 0.5 of rollup | within 0.5 of rollup |
| Vite (rolldown) | 8.1.6 | yes, `codeSplitting.groups` | 52.37 to 53.16 / 98.81 to 100.33 | 52.37 to 0.48 / 98.81 to 0.73 | 14.68 / 61.85 | 0.05 / 0.05 |
| rolldown | 1.2.12 | yes, `codeSplitting.groups` | 52.49 to 53.28 / 98.91 to 100.50 | 52.49 to 0.50 / 98.91 to 0.75 | 14.71 / 61.82 | 0.05 / 0.06 |
| webpack | 5.111.1 | yes, `splitChunks.cacheGroups` | 52.09 to 53.17 / 98.40 to 102.50 | 52.09 to 0.92 / 98.40 to 1.39 | 14.19 / 64.38 | 0.02 / 0.04 |
| rspack | 2.2.8 | yes, `splitChunks.cacheGroups` | 51.95 to 53.11 / 98.10 to 102.38 | 51.95 to 0.99 / 98.10 to 1.41 | 14.07 / 64.32 | 0.02 / 0.04 |
| Parcel | 2.16.4 | yes, `manualSharedBundles`, and only with `packageExports: true` | 52.65 to 55.37 / 99.02 to 108.98 | 52.65 to 39.18 / 99.02 to 40.17 | 55.49 / 108.91 | not measured: its two shared bundles share a name stem |
| `@angular/build` `application` | 22.2.1 | no | 65.06 / 143.27 | 65.05 / 143.15 | 64.99 / 143.26 | 0.03 / 0.03 |

"x to y" is the first visit or the release before and after Arena is apart. Keeping Arena apart costs a little on the first visit, for the extra request and the runtime. Keeping it apart saves almost all of an app release on every bundler that does it. Parcel keeps React with the app, so an app release there still downloads most of that bundle; Arena itself downloads nothing again. The Angular row is a single `main`, with Arena inside it: a release or a patch downloads `main` whole without a dictionary, and almost nothing with one.

## How much does a first visit download in all?

A typical screen with `components: "auto"` and the cut fonts, in KB brotli q11, measured at commit `40a3c539` on 2026-10-23:

| layer | JS | sheets | sprite | fonts | total |
| --- | --- | --- | --- | --- | --- |
| React, Arena apart (rollup) | 54.11 | 13.03 | 1.54 | 51.79 | 120.47 |
| Angular, one `main` | 65.06 | 13.72 | 1.54 | 51.79 | 132.11 |

The sheets column is `arena.package.generated.css` with `arena.generated.css`. A one-line change to a component's CSS downloads 0.02 of the package sheet again when the previous file is the dictionary, and an app release downloads none of it. The Angular builder emits the two sheets as one file of 13.72.

## Where does Arena's package sheet land in the output?

The typical React app imports `arena.package.generated.css`, then `arena.generated.css`, then its own sheet, from its entry. "Alone" means an output CSS file that holds the package sheet and nothing of the app. Measured on 2026-10-23, by changing the app's text and its own sheet and comparing the output files.

| bundler | alone | config that does it | after an app release |
| --- | --- | --- | --- |
| Vite 7.3.7 | yes | the `manualChunks` with the `arena` test that also matches `arena.package.generated.css`, in [`stack.md`](./stack.md) | the Arena file keeps its bytes and its name |
| Vite 8.1.6 | yes | the `codeSplitting.groups` of [`stack.md`](./stack.md), whose `arena` test also matches `arena.package.generated.css` | the Arena file keeps its bytes and its name |
| webpack 5.111.1 | yes | `experiments.css: true` and the `arena` cache group of [`stack.md`](./stack.md), with `type: /^(javascript\|css)/` | the Arena file keeps its bytes and its name |
| rspack 2.2.8 | yes | the webpack config, and a `css/auto` rule for `.css` | the Arena file keeps its bytes and its name |
| rollup 4.62 | not exercised | rollup alone imports no CSS and the probe installs no CSS plugin | not measured |
| rolldown 1.2.12 | no | the build stops: bundling CSS is not supported | not applicable |
| Parcel 2.16.4 | no | the build stops on the sheet's first `@import` of a package specifier, which Parcel resolves from the `src` directory | not applicable |
| Bun 1.4.0 | no | one CSS file for the entry | a new name with every release |
| esbuild 0.28 | no | one CSS file for the entry, with splitting too | a new name with every release |
| `@angular/build` `application` | no | the `styles` option emits one file | a new name with every release |

Without that config the same four bundlers emit one file as well.

## Which environments do not work, and which were not exercised?

| environment | status | why |
| --- | --- | --- |
| Bun 1.4.0 `bun build` | does not work | splitting shares code between entries and has no way to pin a module to a chunk, so Arena stays in the app's bundle. One bundle, typical screen, measured on the final tree. A first visit weighs 54.11, and so does each release. A patch weighs 54.13, or 0.03 with a dictionary |
| esbuild 0.28 | does not work | esbuild splitting shares code between entries and cannot pin a module to a chunk |
| Turbopack | not exercised | Turbopack exists only inside Next.js, which picks its chunks itself. `next build --webpack` is the webpack row |

A bundler that does not work for this purpose still builds the app. What it cannot do is keep Arena's file apart, so each release of the app downloads Arena again.

## What was held fixed?

Two apps and one Arena tree went through every bundler, on Node 26.7.0. Every row counts the JavaScript a bundler emits. The sprite, the cut fonts and the sheets are in no row, so no row differs by what Arena writes; each differs by what the bundler does with the JavaScript.
