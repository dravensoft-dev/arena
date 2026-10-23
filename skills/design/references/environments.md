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

Typical and full figures are written typical / full. Arena is at the tree that becomes 13.0.0, measured at commit `c543cd66` on 2026-10-22. Every row is measured again when a weight budget of Arena's own board moves.

## What did each bundler measure?

| bundler | version | keeps Arena apart | first visit | app release only | one-component patch | with a dictionary |
| --- | --- | --- | --- | --- | --- | --- |
| rollup | 4.62 | yes, `manualChunks` | 54.36 to 54.74 / 103.12 to 103.58 | 54.36 to 0.44 / 103.12 to 0.66 | 15.45 / 64.14 | 0.06 / 0.05 |
| Vite | 7.3.7 | yes, `manualChunks` | within 0.5 of rollup | within 0.5 of rollup | within 0.5 of rollup | within 0.5 of rollup |
| Vite (rolldown) | 8.1.6 | yes, `codeSplitting.groups` | 52.94 to 53.72 / 98.63 to 100.21 | 52.94 to 0.48 / 98.63 to 0.72 | 15.29 / 61.68 | 0.05 / 0.06 |
| rolldown | 1.2.12 | yes, `codeSplitting.groups` | 53.10 to 53.82 / 98.61 to 100.23 | 53.10 to 0.50 / 98.61 to 0.73 | 15.28 / 61.59 | 0.06 / 0.05 |
| webpack | 5.111.1 | yes, `splitChunks.cacheGroups` | 52.67 to 53.71 / 98.25 to 102.21 | 52.67 to 0.92 / 98.25 to 1.39 | 14.72 / 64.12 | 0.03 / 0.04 |
| rspack | 2.2.8 | yes, `splitChunks.cacheGroups` | 52.45 to 53.70 / 97.88 to 102.19 | 52.45 to 0.99 / 97.88 to 1.44 | 14.61 / 63.95 | 0.02 / 0.04 |
| Parcel | 2.16.4 | yes, `manualSharedBundles`, and only with `packageExports: true` | 53.29 to 55.94 / 98.82 to 108.75 | 53.29 to 39.18 / 98.82 to 40.12 | 55.97 / 108.69 | not measured: its two shared bundles share a name stem |
| `@angular/build` `application` | 22.2.1 | no | 64.66 / 142.79 | 64.60 / 142.95 | 64.66 / 142.92 | 0.03 / 0.03 |

"x to y" is the first visit or the release before and after Arena is apart. Keeping Arena apart costs a little on the first visit, for the extra request and the runtime. Keeping it apart saves almost all of an app release on every bundler that does it. Parcel keeps React with the app, so an app release there still downloads most of that bundle; Arena itself downloads nothing again. The Angular row is a single `main`, with Arena inside it: a release or a patch downloads `main` whole without a dictionary, and almost nothing with one.

## Which environments do not work, and which were not exercised?

| environment | status | why |
| --- | --- | --- |
| Bun 1.4.0 `bun build` | does not work | splitting shares code between entries and has no way to pin a module to a chunk, so Arena stays in the app's bundle. One bundle, typical screen: 53.1 for a first visit and again for each release, 54.6 for a patch, 0.04 with a dictionary |
| esbuild 0.28 | does not work | esbuild splitting shares code between entries and cannot pin a module to a chunk |
| Turbopack | not exercised | Turbopack exists only inside Next.js, which picks its chunks itself. `next build --webpack` is the webpack row |

A bundler that does not work for this purpose still builds the app. What it cannot do is keep Arena's file apart, so each release of the app downloads Arena again.

## What was held fixed?

Two apps and one Arena tree went through every bundler, on Node 26.7.0. Every row counts the JavaScript a bundler emits. The sprite, the cut fonts and the sheets are in no row, so no row differs by what Arena writes; each differs by what the bundler does with the JavaScript.
