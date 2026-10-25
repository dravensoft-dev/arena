# The environments Arena was tested on

Which bundlers was Arena measured with, and in which versions? What did each one download, and which cannot keep Arena in a chunk of its own? Does the Angular builder work? Read this to see what is known about your toolchain before you rely on it. **This page is a record and not a recommendation**: no bundler is required, and a row here says what happened when somebody ran it.

[`bundlers/index.md`](./bundlers/index.md) names the page holding each bundler's config, and what each one does differently. [`stylesheets.md`](./stylesheets.md) says how long to cache each file, and how to serve that chunk with a dictionary.

## How was each row measured?

An adopter repository measured every row dated 2026-10-25. The repository holds sixteen projects, called halves. Each half is one product on one layer and one bundler, with its own install, its own config for that bundler and its own build. Eight products are drawn on both layers, React and Angular. The halves are these:

| bundler | product, on React and on Angular |
| --- | --- |
| Vite 7.3.7 | clickup |
| Vite 8.3.5 | duolingo |
| rollup 4.65.0 | etsy |
| rolldown 1.2.15 | grafana |
| webpack 5.112.2 | instagram |
| rspack 2.2.9 | notion |
| Parcel 2.16.4 | superhuman |
| Next.js 16.4.3 on React, `@angular/build` 22.2.4 on Angular | calendly |

Each half builds with its bundler's own command and the config its page gives. Arena is the tree that becomes 13.0.0, packed from commit `40c82585b` and measured on 2026-10-25. Bun and esbuild have no half in that run, and their rows keep the figures of 2026-10-23, verified by hand once on the tree at `40a3c539`.

Every figure is in KB of 1024 bytes, compressed with brotli at quality 11 and a 24-bit window. The products differ in what they draw, so a figure compares builds of one half and never two bundlers. "Plain" is the build without the page's config, and "with the config" is the build that follows the page. For rollup and rolldown the config is the JS-only one, so React stays with the app. For Vite, webpack and rspack it is the sheet config, which keeps React apart as well. Parcel keeps React with the app, and the Angular builder has no config, so its two builds are one.

| column | what it measures |
| --- | --- |
| first visit | the JS a visitor downloads, plain and then with the config |
| app release only | the JS a returning visitor downloads again after a release that changes the app and not Arena, plain and then with the config |
| one-component patch | the JS downloaded again after Arena changes one line of one component, with the config |
| with a dictionary | a one-component patch, with the previous file as the dictionary of Compression Dictionary Transport |

Figures for React and for Angular are written React / Angular. A project that was not built on a layer reads "none". Every row is measured again when the adopter repository moves to a release of Arena.

## What did each bundler measure?

| bundler | version | half | keeps Arena apart | first visit | app release only | one-component patch | with a dictionary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rollup | 4.65.0 | etsy | yes, `manualChunks` | 58.15 to 59.37 / 260.89 to 262.31 | 58.17 to 41.58 / 260.92 to 10.13 | 59.39 / 262.36 | 0.2 / 0.08 |
| Vite 7 | 7.3.7 | clickup | yes, `manualChunks` | 74.56 to 74.94 / 144.3 to 146.57 | 74.45 to 5.74 / 144.3 to 10.62 | 36.2 / 146.62 | 0.38 / 0.09 |
| Vite 8 | 8.3.5 | duolingo | yes, `codeSplitting.groups` | 49.97 to 50.75 / 56.08 to 57.55 | 49.97 to 4.25 / 56.1 to 9.47 | 12.26 / 57.51 | 0.1 / 0.08 |
| rolldown | 1.2.15 | grafana | yes, `codeSplitting.groups` | 70.42 to 71.99 / 255.95 to 257.9 | 70.34 to 40 / 255.76 to 10.87 | 71.66 / 257.95 | 0.09 / 0.09 |
| webpack | 5.112.2 | instagram | yes, `splitChunks.cacheGroups` | 57.88 to 59.49 / 257.78 to 267.52 | 57.86 to 5.56 / 257.81 to 157.86 | 21.31 / 267.68 | 0.49 / 0.09 |
| rspack | 2.2.9 | notion | yes, `splitChunks.cacheGroups` | 62.92 to 64.91 / 86.94 to 93.84 | 62.81 to 6.08 / 86.68 to 65.47 | 26.73 / 93.54 | 0.7 / 0.16 |
| Parcel | 2.16.4 | superhuman | yes, `manualSharedBundles`, and `packageExports: true` | 55.66 to 58.38 / 278.26 to 284.98 | 55.64 to 42.43 / 278.47 to 174.2 | 58.39 / 285.04 | not measured: its two shared bundles share a name stem |
| `@angular/build` `application` | 22.2.4 | calendly | no | none / 68.75 | none / 68.73 | none / 68.82 | none / 0.06 |
| Next.js (Turbopack) | 16.4.3 | calendly | no: no chunk holds Arena alone | 167.9 / none | 20.4 / none | 20.38 / none | 20.38 / none |

"x to y" is the build before and after the page's config. Keeping Arena apart costs a little on the first visit, for the extra request and the runtime. Keeping it apart saves most of an app release on the React halves of Vite, webpack and rspack, where React sits apart too. On the React halves of rollup, rolldown and Parcel, React stays with the app, so a release downloads most of that bundle again, and Arena itself downloads nothing again. On Angular, an app release downloads 9.47 to 10.87 on Vite, rollup and rolldown, and 65.47, 157.86 and 174.2 on rspack, webpack and Parcel. The Angular builder emits a single `main` with Arena inside it: a release or a patch downloads `main` whole without a dictionary, and almost nothing with one.

A dictionary needs a previous file of the same name stem. Parcel names its two shared bundles with one stem, and Next.js names its chunks by hash alone, so no figure pairs a changed file with its predecessor there. Next.js reports the patch's figure, and Parcel reports none.

## How much does a first visit download in all?

Each half's first visit with the page's config, in KB brotli q11, measured on 2026-10-25. The sheets column holds every CSS file the output carries. Google Fonts are remote and are counted 0.

| layer | product | bundler | JS | sheets | sprite | fonts | total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| React | clickup | Vite 7.3.7 | 74.94 | 19.57 | 9.01 | 0 | 103.52 |
| Angular | clickup | Vite 7.3.7 | 146.57 | 19.31 | 9.01 | 0 | 174.89 |
| React | duolingo | Vite 8.3.5 | 50.75 | 14.01 | 3.78 | 0 | 68.54 |
| Angular | duolingo | Vite 8.3.5 | 57.55 | 14.41 | 3.78 | 0 | 75.74 |
| React | etsy | rollup 4.65.0 | 59.37 | 31.68 | 2.67 | 0 | 93.72 |
| Angular | etsy | rollup 4.65.0 | 262.31 | 32.84 | 2.67 | 0 | 297.82 |
| React | grafana | rolldown 1.2.15 | 71.99 | 30.39 | 4.56 | 0 | 106.94 |
| Angular | grafana | rolldown 1.2.15 | 257.9 | 31.59 | 4.56 | 0 | 294.05 |
| React | instagram | webpack 5.112.2 | 59.49 | 16.06 | 4.99 | 0 | 80.54 |
| Angular | instagram | webpack 5.112.2 | 267.52 | 16.43 | 4.99 | 0 | 288.94 |
| React | notion | rspack 2.2.9 | 64.91 | 19.14 | 6.53 | 0 | 90.58 |
| Angular | notion | rspack 2.2.9 | 93.84 | 20.09 | 6.53 | 0 | 120.46 |
| React | superhuman | Parcel 2.16.4 | 58.38 | 14.86 | 3.98 | 0 | 77.22 |
| Angular | superhuman | Parcel 2.16.4 | 284.98 | 15.23 | 3.98 | 0 | 304.19 |
| React | calendly | Next.js 16.4.3 | 167.9 | 15.88 | 1.69 | 0 | 185.47 |
| Angular | calendly | `@angular/build` 22.2.4 | 68.75 | 16.08 | 1.69 | 0 | 86.52 |

On the tree at `40a3c539` (verified by hand once, 2026-10-23), a one-line change to a component's CSS downloaded 0.02 of the package sheet again. The previous file was the dictionary. An app release downloaded none of it. The Angular builder emits the sheets as one file, and on the calendly half it weighs 16.08.

## Where does Arena's package sheet land in the output?

The app imports `arena.package.generated.css`, then `arena.generated.css`, then its own sheet. "Alone" means an output CSS file that holds the package sheet and nothing of the app. Measured on 2026-10-25, by changing the app's text and its own sheet and comparing the output files. The Bun and esbuild rows were verified by hand once on 2026-10-23.

| bundler | alone | config that does it | after an app release |
| --- | --- | --- | --- |
| Vite 7.3.7 | yes | the `manualChunks` with the `arena` test that also matches `arena.package.generated.css`, and the `arena-sheet` plugin, in [the rollup family page](./bundlers/rollup.md) | the Arena file keeps its bytes and its name |
| Vite 8.3.5 | yes | the `codeSplitting.groups` of [the rollup family page](./bundlers/rollup.md), whose `arena` test also matches `arena.package.generated.css` | the Arena file keeps its bytes and its name |
| webpack 5.112.2 | yes | `experiments.css: true` and the `arena` and `arenaSheet` cache groups of [the webpack family page](./bundlers/webpack.md) | the Arena file keeps its bytes and its name |
| rspack 2.2.9 | yes | the webpack config, a `css/auto` rule for `.css` on React, and a `styles` entry on Angular | the Arena file keeps its bytes and its name |
| Parcel 2.16.4 | yes | the second `manualSharedBundles` entry of [the Parcel page](./bundlers/parcel.md) | the Arena file keeps its bytes and its name |
| Next.js 16.4.3 | yes, with no config | Turbopack's own chunks | not measured |
| rollup 4.65.0 | not through the bundler | rollup stops on a CSS import, so the page links the sheet as written | not applicable |
| rolldown 1.2.15 | not through the bundler | the build stops: "Bundling CSS is no longer supported (experimental support has been removed)", so the page links the sheet as written | not applicable |
| Bun 1.4.0 | no | one CSS file for the entry | a new name with every release |
| esbuild 0.28 | no | one CSS file for the entry, with splitting too | a new name with every release |
| `@angular/build` `application` 22.2.4 | no | the `styles` option emits one file | a new name with every release |

Without that config webpack emits one CSS file as well, measured on 2026-10-25.

## Which environments do not work, and which were not exercised?

| environment | status | why |
| --- | --- | --- |
| `@angular/build` `application` 22.2.4 | does not work for keeping Arena apart | the builder links Arena into `main` with the app, and the `styles` option emits one CSS file. Measured on 2026-10-25 |
| Bun 1.4.0 `bun build` | does not work | splitting shares code between entries and has no way to pin a module to a chunk, so Arena stays in the app's bundle. One bundle, typical screen, verified by hand once on 2026-10-23, on the tree at `40a3c539`. A first visit weighs 54.11, and so does each release. A patch weighs 54.13, or 0.03 with a dictionary |
| esbuild 0.28 | does not work | esbuild splitting shares code between entries and cannot pin a module to a chunk. Verified by hand once on 2026-10-23, on the tree at `40a3c539` |
| `next build --webpack` | not exercised | the webpack row is the recipe, and how Next.js merges it with its own webpack config was not run |

A bundler that does not work for this purpose still builds the app. What it cannot do is keep Arena's file apart, so each release of the app downloads Arena again.

## What was held fixed?

One Arena tree went through every bundler of 2026-10-25, and each half declares its bundler and plugins at exact versions. Every JS column counts the JavaScript a bundler emits. The sprite, the sheets and the fonts are in no JS column, so none differs by what Arena writes. Each differs by what the bundler does with the JavaScript.
