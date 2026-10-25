# The environments Arena was tested on

Which bundlers was Arena measured with, and in which versions? What did each one download, and which cannot keep Arena in a chunk of its own? Does the Angular builder work? Read this to see what is known about your toolchain before you rely on it. **This page is a record and not a recommendation**: no bundler is required, and a row here says what happened when somebody ran it.

[`bundlers/index.md`](./bundlers/index.md) names the page holding each bundler's config, and what each one does differently. [`stylesheets.md`](./stylesheets.md) says how long to cache each file, and how to serve that chunk with a dictionary.

## How was each row measured?

An adopter repository measured every row dated 2026-10-25. The repository holds sixteen projects, called halves. Each half is one product on one layer and one bundler, with its own install, its own config for that bundler and its own build. Eight products are built on both layers, React and Angular. A run draws eight of ten entries at random onto the eight products, one entry each. The ten are the nine bundlers and one pair, Next.js on React with the `@angular/build` `application` builder on Angular. The two entries the run before left out are always among the eight, so two runs together cover all ten. The latest run drew seed 4153660040, and the halves are these:

| bundler | product, on React and on Angular |
| --- | --- |
| rollup 4.65.0 | calendly |
| esbuild 0.28.2 | clickup |
| Bun 1.4.0 | duolingo |
| Vite 7.3.7 | etsy |
| Next.js 16.4.3 on React, `@angular/build` 22.2.4 on Angular | grafana |
| webpack 5.112.2 | instagram |
| Vite 8.3.5 | notion |
| rspack 2.2.9 | superhuman |

That draw left out rolldown 1.2.15 and Parcel 2.16.4. The run before measured them on the same day and the same Arena tree, rolldown on the grafana half and Parcel on the superhuman half, on both layers. Those two rows keep those figures.

Each half builds with its bundler's own command and the config its page gives. Arena is the tree that becomes 13.0.0, packed from commit `40c82585b` and measured on 2026-10-25. Every other row is the latest run's.

Every figure is in KB of 1024 bytes, compressed with brotli at quality 11 and a 24-bit window. The products differ in what they draw, so a figure compares builds of one half and never two bundlers. "Plain" is the build without the page's config, and "with the config" is the build that follows the page. For rollup and rolldown the config is the JS-only one, so React stays with the app. For Vite, webpack and rspack it is the sheet config, which keeps React apart as well. Parcel keeps React with the app, and the Angular builder has no config, so its two builds are one.

| column | what it measures |
| --- | --- |
| first visit | the JS a visitor downloads, plain and then with the config |
| app release only | the JS a returning visitor downloads again after a release that changes the app and not Arena, plain and then with the config |
| one-component patch | the JS downloaded again after Arena changes one line of one component, with the config |
| with a dictionary | a one-component patch, with the previous file as the dictionary of Compression Dictionary Transport |

Figures for React and for Angular are written React / Angular. A project that was not built on a layer reads "none". Every run measures eight of the ten entries again, and the two it leaves out keep the figures of the run that measured them.

## What did each bundler measure?

| bundler | version | half | keeps Arena apart | first visit | app release only | one-component patch | with a dictionary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rollup | 4.65.0 | calendly | yes, `manualChunks` | 57.85 to 59 / 257.45 to 258.69 | 57.94 to 39.79 / 257.47 to 6.45 | 58.96 / 258.56 | 0.36 / 0.08 |
| Vite 7 | 7.3.7 | etsy | yes, `manualChunks` | 59.62 to 60.01 / 116.89 to 119.08 | 59.53 to 5.14 / 116.89 to 9.51 | 21.23 / 119.04 | 0.09 / 0.09 |
| Vite 8 | 8.3.5 | notion | yes, `codeSplitting.groups` | 63.46 to 64.54 / 89.12 to 90.91 | 63.44 to 5.81 / 89.13 to 11.64 | 26.05 / 90.92 | 0.09 / 0.09 |
| rolldown | 1.2.15 | grafana (previous run) | yes, `codeSplitting.groups` | 70.42 to 71.99 / 255.95 to 257.9 | 70.34 to 40 / 255.76 to 10.87 | 71.66 / 257.95 | 0.09 / 0.09 |
| webpack | 5.112.2 | instagram | yes, `splitChunks.cacheGroups` | 57.88 to 59.49 / 257.78 to 267.52 | 57.86 to 5.56 / 257.81 to 157.86 | 21.31 / 267.68 | 0.49 / 0.09 |
| rspack | 2.2.9 | superhuman | yes, `splitChunks.cacheGroups` | 54.93 to 56.62 / 74.24 to 80.44 | 54.86 to 4.01 / 73.87 to 60.56 | 18.46 / 80.12 | 0.5 / 0.23 |
| Parcel | 2.16.4 | superhuman (previous run) | yes, `manualSharedBundles`, and `packageExports: true` | 55.66 to 58.38 / 278.26 to 284.98 | 55.64 to 42.43 / 278.47 to 174.2 | 58.39 / 285.04 | not measured: no name stem pairs a file with its predecessor |
| `@angular/build` `application` | 22.2.4 | grafana | no | none / 98.5 | none / 98.39 | none / 98.47 | none / 0.05 |
| Next.js (Turbopack) | 16.4.3 | grafana | no: no chunk holds Arena alone | 180.06 / none | 32.52 / none | 32.51 / none | not measured: no name stem pairs a file with its predecessor |
| Bun `bun build` | 1.4.0 | duolingo | no | 93.46 / 274.14 | 93.53 / 274.11 | 93.55 / 274 | 1.35 / 0.05 |
| esbuild | 0.28.2 | clickup | no | 75.24 / 199.84 | 75.26 / 199.8 | 75.22 / 199.75 | 0.05 / 0.05 |

"x to y" is the build before and after the page's config. Keeping Arena apart costs a little on the first visit, for the extra request and the runtime. Keeping it apart saves most of an app release on the React halves of Vite, webpack and rspack, where React sits apart too. On the React halves of rollup, rolldown and Parcel, React stays with the app, so a release downloads most of that bundle again, and Arena itself downloads nothing again. On Angular, an app release downloads 6.45 to 11.64 on rollup, Vite and rolldown, and 60.56, 157.86 and 174.2 on rspack, webpack and Parcel. The Angular builder emits a single `main` with Arena inside it, and Bun and esbuild emit one bundle. A release or a patch downloads that file whole without a dictionary, and almost nothing with one. The file weighs 98.39 to 98.47 on the builder and 75.22 to 274.11 on Bun and esbuild.

A dictionary needs a previous file of the same name stem. Parcel names its two shared bundles with one stem, and Next.js names its chunks by hash alone. In neither does a name stem pair a file with its predecessor, so neither row has a dictionary figure. Bun's figure on React is 1.35, not a few hundredths. No cause was measured.

## How much does a first visit download in all?

Each half's first visit with the page's config, in KB brotli q11, measured on 2026-10-25. The run column says which run built the half: the latest, or the one before, whose figures the two entries the latest left out keep. The sheets column holds every CSS file the output carries. Google Fonts are remote and are counted 0.

| layer | product | bundler | run | JS | sheets | sprite | fonts | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| React | calendly | rollup 4.65.0 | this run | 59 | 30.34 | 1.69 | 0 | 91.03 |
| Angular | calendly | rollup 4.65.0 | this run | 258.69 | 31.54 | 1.69 | 0 | 291.92 |
| React | clickup | esbuild 0.28.2 | this run | 75.24 | 18 | 9.01 | 0 | 102.25 |
| Angular | clickup | esbuild 0.28.2 | this run | 199.84 | 18.39 | 9.01 | 0 | 227.24 |
| React | duolingo | Bun 1.4.0 | this run | 93.46 | 13.34 | 3.78 | 0 | 110.58 |
| Angular | duolingo | Bun 1.4.0 | this run | 274.14 | 13.69 | 3.78 | 0 | 291.61 |
| React | etsy | Vite 7.3.7 | this run | 60.01 | 16.99 | 2.67 | 0 | 79.67 |
| Angular | etsy | Vite 7.3.7 | this run | 119.08 | 16.93 | 2.67 | 0 | 138.68 |
| React | grafana | Next.js 16.4.3 | this run | 180.06 | 15.97 | 4.56 | 0 | 200.59 |
| Angular | grafana | `@angular/build` 22.2.4 | this run | 98.5 | 16.31 | 4.56 | 0 | 119.37 |
| React | instagram | webpack 5.112.2 | this run | 59.49 | 16.06 | 4.99 | 0 | 80.54 |
| Angular | instagram | webpack 5.112.2 | this run | 267.52 | 16.43 | 4.99 | 0 | 288.94 |
| React | notion | Vite 8.3.5 | this run | 64.54 | 17.16 | 6.53 | 0 | 88.23 |
| Angular | notion | Vite 8.3.5 | this run | 90.91 | 17.65 | 6.53 | 0 | 115.09 |
| React | superhuman | rspack 2.2.9 | this run | 56.62 | 17.16 | 3.98 | 0 | 77.76 |
| Angular | superhuman | rspack 2.2.9 | this run | 80.44 | 18.06 | 3.98 | 0 | 102.48 |
| React | grafana | rolldown 1.2.15 | the run before | 71.99 | 30.39 | 4.56 | 0 | 106.94 |
| Angular | grafana | rolldown 1.2.15 | the run before | 257.9 | 31.59 | 4.56 | 0 | 294.05 |
| React | superhuman | Parcel 2.16.4 | the run before | 58.38 | 14.86 | 3.98 | 0 | 77.22 |
| Angular | superhuman | Parcel 2.16.4 | the run before | 284.98 | 15.23 | 3.98 | 0 | 304.19 |

On the tree at `40a3c539` (verified by hand once, 2026-10-23), a one-line change to a component's CSS downloaded 0.02 of the package sheet again. The previous file was the dictionary. An app release downloaded none of it. The Angular builder emits the sheets as one file, and on the grafana half it weighs 16.31.

## Where does Arena's package sheet land in the output?

The app imports `arena.package.generated.css`, then `arena.generated.css`, then its own sheet. "Alone" means an output CSS file that holds the package sheet and nothing of the app. Measured on 2026-10-25, by changing the app's text and its own sheet and comparing the output files. The rolldown and Parcel rows are the run before's.

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
| Bun 1.4.0 | no | one CSS file for the entry, measured on 2026-10-25 | a new name with every release |
| esbuild 0.28.2 | no | one CSS file for the entry, with splitting too, measured on 2026-10-25 | a new name with every release |
| `@angular/build` `application` 22.2.4 | no | the `styles` option emits one file | a new name with every release |

Without that config webpack emits one CSS file as well, measured on 2026-10-25.

## Which environments do not work, and which were not exercised?

| environment | status | why |
| --- | --- | --- |
| `@angular/build` `application` 22.2.4 | does not work for keeping Arena apart | the builder links Arena into `main` with the app, and the `styles` option emits one CSS file. Measured on 2026-10-25 |
| Bun 1.4.0 `bun build` | does not work | splitting shares code between entries and has no way to pin a module to a chunk, so Arena stays in the app's bundle. One bundle holds Arena's modules and the app's code, measured on 2026-10-25. A first visit weighs 93.46 on React and 274.14 on Angular, and so does each release. A patch weighs 93.55 and 274, or 1.35 and 0.05 with a dictionary |
| esbuild 0.28.2 | does not work | esbuild splitting shares code between entries and cannot pin a module to a chunk. One bundle holds Arena's modules and the app's code, measured on 2026-10-25. A first visit weighs 75.24 on React and 199.84 on Angular, and so does each release. A patch weighs 75.22 and 199.75, or 0.05 with a dictionary |
| `next build --webpack` | not exercised | the webpack row is the recipe, and how Next.js merges it with its own webpack config was not run |

A bundler that does not work for this purpose still builds the app. What it cannot do is keep Arena's file apart, so each release of the app downloads Arena again.

## What was held fixed?

One Arena tree went through every bundler of the latest run and of the run before, and each half declares its bundler and plugins at exact versions. Every JS column counts the JavaScript a bundler emits. The sprite, the sheets and the fonts are in no JS column, so none differs by what Arena writes. Each differs by what the bundler does with the JavaScript.
