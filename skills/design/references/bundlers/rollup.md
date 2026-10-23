# The rollup family: rollup, Vite 7, Vite 8 and rolldown

Four bundlers name a chunk through the same `output` options. Vite 7 bundles with rollup and Vite 8 with rolldown, so a Vite project writes the rollup or rolldown option under `build.rollupOptions.output`. What a project on each one writes, and what each does differently, is below. Read this when your project builds with rollup, Vite or rolldown, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| rollup | 4.62 | yes | held by a gate: Arena's own board bundles this way on every run | not exercised | rollup imports no CSS, and no CSS plugin was installed |
| Vite 7 | 7.3.7 | yes | verified by hand once | yes | measured on 2026-10-23 |
| Vite 8 | 8.1.6 | yes | verified by hand once | yes | measured on 2026-10-23 |
| rolldown | 1.2.12 | yes | verified by hand once | no | measured on 2026-10-23 |

The figures of each row are in [`environments.md`](../environments.md), section "What did each bundler measure?". Vite 7 measured within 0.5 KB of rollup on every column.

## How do I keep Arena's JS in a chunk of its own?

**rollup** takes a function, with content-hashed file names:

```js
output: {
  manualChunks: (id) => (id.includes('/node_modules/@dravensoft/arena-') ? 'arena' : undefined),
  entryFileNames: '[name]-[hash].js',
  chunkFileNames: '[name]-[hash].js',
}
```

**Vite 7** takes the same function as `build.rollupOptions.output.manualChunks`.

**Vite 8** takes groups, under the same key:

```js
build: { rollupOptions: { output: { codeSplitting: { groups: [
  { name: 'arena', test: /node_modules[\\/]@dravensoft[\\/]arena-/, priority: 10 },
] } } } }
```

**rolldown** takes the same groups as `output.codeSplitting.groups`.

## How do I keep the package sheet in a file of its own?

**Vite 7**, with React apart as well:

```js
build: { rollupOptions: { output: {
  manualChunks: (id) => (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id) ? 'react'
    : /arena-react|arena\.package\.generated\.css/.test(id) ? 'arena' : undefined),
} } }
```

**Vite 8**:

```js
build: { rollupOptions: { output: { codeSplitting: { groups: [
  { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
  { name: 'arena', test: /arena-react|arena\.package\.generated\.css/, priority: 10 },
] } } } }
```

With either config, the Arena CSS file keeps its bytes and its name when the app changes, measured on 2026-10-23 by changing the app's text and its own sheet.

**rollup** imports no CSS by itself. Whichever CSS plugin you install decides whether the sheet can sit in a file of its own, and none was exercised.

**rolldown** stops the build with "bundling CSS is not supported". Link the sheets `arena build` writes from your page instead, the package sheet first and `arena.generated.css` after it. That path is not exercised.

## What differs between them?

- **The sheet is matched by its name, not by `node_modules`.** `arena build` writes `arena.package.generated.css` into its `-o` directory, inside your project. A test that matches only `node_modules/@dravensoft/arena-` keeps Arena's JS apart and leaves the sheet with your app's CSS, which is why both Vite configs above carry a second pattern.
- **Vite 8 and rolldown take groups, Vite 7 and rollup take a function.** Vite 8 reads its groups under `build.rollupOptions.output`, the key Vite 7 uses for `manualChunks`, so a project moving between them changes the option and not its place. `advancedChunks` is deprecated in Vite 8; `codeSplitting.groups` is what was measured.
- **Vite 8 separates the sheet and rolldown alone refuses it**, although Vite 8 bundles with rolldown. A project that needs the package sheet in a file of its own and wants rolldown's output takes Vite 8.
- **A resolver plugin of your own skips the package's `sideEffects` field.** The React package declares `"sideEffects": ["*.css"]` and the Angular package `false`, and a bundler that resolves `@dravensoft/arena-*` through `node_modules` reads that field. A `resolveId` hook returning a path for them bypasses it, and rollup then keeps every component you did not import. Pass `treeshake.moduleSideEffects` back for those modules. Arena's own board bundles this way, with `moduleSideEffects` returning `false` for Arena's JS; verified by hand once.
- **The sprite under Vite** is served from `public/` or imported as a URL, and a small one is inlined unless `build.assetsInlineLimit` says otherwise. [`install.md`](../install.md), section "How does the toolchain serve the sprite?", gives the line.

## How is the sprite served?

**Vite** takes the glob `?url` import and the `assetsInlineLimit` setting that [`install.md`](../install.md) gives, in its section "How does the toolchain serve the sprite?". That recipe is the one line of this page with a measured path behind it.

**Plain rollup and rolldown** copy `icons-*.svg` from the `-o` directory into the output directory after the bundle, with a copy step of your own. Neither bundler moves a file it does not import. Not exercised.

The provider takes an absolute URL: `/${ARENA_SPRITE}` under a root deploy, with the base path in front under another. Vite's `base` is that prefix. A bare file name resolves against the address of the page, so a route below `/` fetches a path that does not exist and paints no icon.
