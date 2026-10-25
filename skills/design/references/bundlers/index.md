# Which bundler, and what changes with it

What does my bundler do with Arena, and what do I write in its config? Find your bundler in the table below. The table answers whether Arena's JavaScript and its package sheet can sit in files of their own, and what differs from the other bundlers. The page gives the config and the behaviour you would otherwise discover in your own build. Read this before you write your bundler's config, and then only the page it names.

No bundler is required. A bundler that cannot keep Arena apart still builds the app, and its page says what that costs. Every row carries the evidence it has, on the scale of [`stack.md`](../stack.md), section "The evidence column, and why it is there". Rows dated 2026-10-25 were measured by an adopter repository on the tree that becomes 13.0.0 (`40c82585b`), each with the bundler version in the Measured column. Rows dated 2026-10-23 were measured on the tree at `40a3c539`, and no repository built them again. The figures each bundler measured are in [`environments.md`](../environments.md).

## What every bundler is asked to do

**Arena's own JavaScript goes in a chunk of its own, under a content-hashed name with a stem such as `arena`.** The modules of `@dravensoft/arena-react` or `@dravensoft/arena-angular` change with the Arena version and never with your app. In one bundle, every release of your app makes a returning visitor download Arena again. In a chunk of its own, the file keeps its name until Arena changes, and the next version's file matches the dictionary of the previous one. Keep React in a chunk of its own as well, since it changes on its own schedule.

**The package sheet stays in a file apart from `arena.generated.css`.** `arena.package.generated.css` changes only with Arena and the components you draw. `arena.generated.css` holds your palettes and fonts, and changes with your config. `arena build` writes them as two source files. A bundler that emits one CSS file for an entry joins them again, so a change to either is a new download of both. Import the package sheet first and `arena.generated.css` after it, which is the order to write, as [`install.md`](../install.md) shows.

[`stylesheets.md`](../stylesheets.md) says how long to cache each file and how to serve an update through a dictionary. The dictionary is also the way out for a bundler that cannot keep Arena apart.

## Which page is mine?

| Your bundler | Measured | Arena's JS in a chunk of its own | The package sheet in a file of its own | What differs | Page |
| --- | --- | --- | --- | --- | --- |
| rollup | 4.65.0 | yes, `manualChunks`; held by a gate, and measured on 2026-10-25 | no: a CSS import stops the build, so the page links the sheet; measured on 2026-10-25 | the one bundler Arena's own board bundles with | [rollup family](./rollup.md) |
| Vite 7 | 7.3.7 | yes, `manualChunks`; measured on 2026-10-25 | yes; measured on 2026-10-25 | the chunk test also matches the sheet by name, because the sheet sits outside `node_modules` | [rollup family](./rollup.md) |
| Vite 8 | 8.3.5 | yes, `codeSplitting.groups`; measured on 2026-10-25 | yes; measured on 2026-10-25 | `codeSplitting.groups`, under the key Vite 7 uses for `manualChunks` | [rollup family](./rollup.md) |
| rolldown | 1.2.15 | yes, `codeSplitting.groups`; measured on 2026-10-25 | no: the build stops on a CSS import, so the page links the sheet; measured on 2026-10-25 | the sheets reach the page without the bundler | [rollup family](./rollup.md) |
| webpack | 5.112.2 | yes, `splitChunks.cacheGroups`; measured on 2026-10-25 | yes, with `experiments: { css: true }`; measured on 2026-10-25 | a group per kind of file, and `experiments: { html: false }` beside `html-webpack-plugin` | [webpack family](./webpack.md) |
| rspack | 2.2.9 | yes, the webpack recipe; measured on 2026-10-25 | yes, with a `css/auto` rule on React and a `styles` entry on Angular; measured on 2026-10-25 | one rule more than webpack on React | [webpack family](./webpack.md) |
| Parcel | 2.16.4 | yes, `manualSharedBundles`, with `packageExports: true` for an Arena subpath; measured on 2026-10-25 | yes, a second `manualSharedBundles` entry; measured on 2026-10-25 | React stays with the app, and no dictionary can serve the Arena bundle | [Parcel](./parcel.md) |
| Angular `application` builder | 22.2.4 | does not work: Arena lands in `main`; measured on 2026-10-25 | no: the `styles` option emits one file; measured on 2026-10-25 | the dictionary is the way out | [Angular builder](./angular.md) |
| Bun `bun build` | 1.4.0 | does not work; measured on 2026-10-23 | no: one CSS file for the entry; measured on 2026-10-23 | the output directory is not emptied between builds | [Bun and esbuild](./bun-esbuild.md) |
| esbuild | 0.28 | does not work; measured on 2026-10-23 | no: one CSS file for the entry, with splitting too; measured on 2026-10-23 | an Angular bundle defines `ngDevMode` itself | [Bun and esbuild](./bun-esbuild.md) |
| Next.js, Turbopack | 16.4.3 | no: no chunk holds Arena alone; measured on 2026-10-25 | yes, a CSS file holds it alone, with no config; measured on 2026-10-25 | Next.js picks its chunks itself, and the server boundary is yours | [Next.js](./next.md) |

**A bundler not in this table** is allowed by the manifest and not exercised. Read the page of the bundler whose chunk option it copies: a bundler taking rollup's `output` options is the rollup family, and one taking webpack's `optimization.splitChunks` is the webpack family. Then run two checks, early and small. Build, change one line of your app, build again, and see whether the file holding Arena keeps its name. Change a palette in your config, build again, and see whether the file holding the package sheet keeps its name.

## What each page holds

Each page answers the same questions in the same order. Which versions were measured, and how sure is each answer? How is Arena's JS kept in a chunk of its own, and the package sheet in a file of its own? What does that bundler do differently? How is the sprite served?

**The sprite is served by the toolchain's own rule, and the provider takes an absolute URL.** `/${ARENA_SPRITE}` is that URL under a root deploy, with the base path in front of it under another. A bare file name resolves against the page and paints nothing once the route sits below `/`. [`install.md`](../install.md) gives the recipe for Vite and the Angular builder, in its section "How does the toolchain serve the sprite?". Each page here gives its own, with the evidence it has.
