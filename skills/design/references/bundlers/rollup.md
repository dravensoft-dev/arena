# The rollup family: rollup, Vite 7, Vite 8 and rolldown

Four bundlers name a chunk through the same `output` options. Vite 7 bundles with rollup and Vite 8 with rolldown, so a Vite project writes the rollup or rolldown option under `build.rollupOptions.output`. What a project on each one writes, and what each does differently, is below. Read this when your project builds with rollup, Vite or rolldown, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

Every row below was built on React and on Angular, each by a repository of its own that declares the bundler at the version named.

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| rollup | 4.65.0 | yes | held by a gate, with rollup 4.62.2: Arena's own board bundles this way on every run. Also measured on 2026-10-25, rollup 4.65.0, Arena: the tree that becomes 13.0.0 (`40c82585b`) | no: a CSS import stops the build, so the page links the sheet | measured on 2026-10-25, rollup 4.65.0, Arena: the tree that becomes 13.0.0 (`40c82585b`) |
| Vite 7 | 7.3.7 | yes | measured on 2026-10-25, Vite 7.3.7, Arena: the tree that becomes 13.0.0 (`40c82585b`) | yes | measured on 2026-10-25, Vite 7.3.7, Arena: the tree that becomes 13.0.0 (`40c82585b`) |
| Vite 8 | 8.3.5 | yes | measured on 2026-10-25, Vite 8.3.5, Arena: the tree that becomes 13.0.0 (`40c82585b`) | yes | measured on 2026-10-25, Vite 8.3.5, Arena: the tree that becomes 13.0.0 (`40c82585b`) |
| rolldown | 1.2.15 | yes | measured on 2026-10-25, rolldown 1.2.15, Arena: the tree that becomes 13.0.0 (`40c82585b`) | no: a CSS import stops the build, so the page links the sheet | measured on 2026-10-25, rolldown 1.2.15, Arena: the tree that becomes 13.0.0 (`40c82585b`) |

The figures of each half are in [`environments.md`](../environments.md), section "What did each bundler measure?". Each half draws a screen of its own, so a figure compares one half's builds and not two bundlers.

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

**rolldown** takes the same groups as `output.codeSplitting.groups`, with `platform: 'browser'` and `output.minify: true`:

```js
export default {
  input: { main: 'src/Main.tsx' },
  platform: 'browser',
  transform: { define: { 'process.env.NODE_ENV': '"production"' } },
  output: { dir: 'dist', format: 'es', minify: true, codeSplitting: { groups: [
    { name: 'arena', test: /node_modules[\\/]@dravensoft[\\/]arena-/, priority: 10 },
  ] } },
};
```

With these configs React stays with the app. An app release then downloads React again, and [`environments.md`](../environments.md) gives how much.

## How do I keep the package sheet in a file of its own?

**Vite 7 and Vite 8** keep React apart as well, and match Arena's JS and the sheet with one test that names neither layer. Vite 7:

```js
export default {
  root: 'src',
  base: './',
  publicDir: false,
  plugins: [
    {
      name: 'arena-sheet',
      enforce: 'pre',
      transform: (code, id) => (/[\\/]src[\\/]styles\.css$/.test(id)
        ? code.replace(/@import\s+'\.\/arena\.package\.generated\.css';\s*/, '') : null),
      transformIndexHtml: { order: 'pre', handler: (html) => (/styles\.css/.test(html)
        ? [{ tag: 'link', attrs: { rel: 'stylesheet', href: '/src/arena.package.generated.css' }, injectTo: 'head-prepend' }]
        : []) },
    },
  ],
  build: {
    rollupOptions: { output: {
      manualChunks: (id) => (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id) ? 'react'
        : /node_modules[\\/]@dravensoft[\\/]arena-|arena\.package\.generated\.css/.test(id) ? 'arena' : undefined),
    } },
    outDir: '../dist',
    emptyOutDir: true,
  },
};
```

Vite 8 keeps `root`, `base`, `publicDir` and the `arena-sheet` plugin, and replaces the `manualChunks` function with groups:

```js
codeSplitting: { groups: [
  { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
  { name: 'arena', test: /node_modules[\\/]@dravensoft[\\/]arena-|arena\.package\.generated\.css/, priority: 10 },
] },
```

With either config, the Arena CSS file keeps its bytes and its name when the app changes. Measured on 2026-10-25, on React and on Angular, by changing the app's text and its own sheet.

The `arena-sheet` plugin serves a page that links `styles.css` itself, as an Angular project's `index.html` does. The plugin takes the package sheet's import out of that file and links the sheet from the page's head, so Vite emits it on its own. The `href` it writes is root-relative: `/src/arena.package.generated.css` names the file under the project root, where `index.html` sits. A React project whose entry imports the sheets needs only the chunk test.

**rollup and rolldown** import no CSS, and stop the build on a CSS import. Map every `.css` import to an empty module, and link the four sheets `arena build` writes from your page, in the order [`install.md`](../install.md) gives. The module id must end in `.js`, because rolldown refuses a `.css` id before `load` runs:

```js
function emptyCss() {
  return {
    name: 'empty-css',
    async resolveId(source, importer, options) {
      if (!source.split('?')[0].endsWith('.css') || source.startsWith('\0')) return null;
      const found = await this.resolve(source, importer, { ...options, skipSelf: true });
      return found ? `\0empty-css:${found.id}.js` : null;
    },
    load(id) {
      return id.startsWith('\0empty-css:') ? { code: 'export default "";', map: null } : null;
    },
  };
}
```

The package sheet holds no `@import` of a package specifier, so the page links it as written, measured on 2026-10-25. Copy the four sheets next to the page with a step of your own, as the sprite section says. What a CSS plugin of your own would do with the sheet was not exercised.

**rolldown** stops with "Bundling CSS is no longer supported (experimental support has been removed)", the message of rolldown 1.2.15, measured on 2026-10-25.

## How do I build an Angular project with them?

**Vite** takes the Analog plugin. `@analogjs/vite-plugin-angular` compiles the project, with `tsconfig: './tsconfig.json'` and `build.target: 'es2022'`:

```js
plugins: [angular({ tsconfig: './tsconfig.json' }), /* the arena-sheet plugin */],
build: { target: 'es2022', outDir: 'dist', emptyOutDir: true },
```

The project's `index.html` sits at the project root with a `<base href="./">`, a link to `/src/styles.css` and a module script for `/src/main.ts`. Analog 2.9 needs `@angular/build` and Angular's packages at one minor. A Vite 8 build prints a `PLUGIN_TIMINGS` notice for Analog's `buildStart`, which is harmless.

**rollup and rolldown** have no Angular plugin of this kind. Compile with `ngc`, then bundle its output with the Angular linker in a `transform` hook, because Angular's packages are partially compiled:

```sh
ngc -p tsconfig.app.json --outDir .ngc --rootDir . --sourceMap false
```

```js
// entry.js: the compiled app, then the app's own sheet
import './.ngc/src/main.js';
import './src/styles.css';
```

```js
import linker from '@angular/compiler-cli/linker/babel';
import { transformSync } from '@babel/core';

const angularLinker = {
  name: 'angular-linker',
  transform(code, id) {
    if (!/[\\/]node_modules[\\/].*\.[cm]?js$/.test(id.split('?')[0]) || !code.includes('ɵɵngDeclare')) return null;
    const out = transformSync(code, { filename: id, babelrc: false, configFile: false, compact: false, sourceMaps: false, plugins: [linker] });
    return { code: out.code, map: null };
  },
};
```

Declare `@babel/core` yourself. Rollup also needs `@rollup/plugin-node-resolve`, `@rollup/plugin-commonjs` and `@rollup/plugin-replace`, with `esbuild` turning a React project's TypeScript into JavaScript. Both bundlers write no `index.html`, so the config emits one whose module script points at the entry chunk, from `generateBundle` with `emitFile`. All of this was measured on 2026-10-25.

## What differs between them?

- **The sheet is matched by its name, not by `node_modules`.** `arena build` writes `arena.package.generated.css` into its `-o` directory, inside your project. A test that matches only `node_modules/@dravensoft/arena-` keeps Arena's JS apart and leaves the sheet with your app's CSS, which is why both Vite configs above carry a second pattern. Measured on 2026-10-25 on Vite 7.3.7 and Vite 8.3.5, a test that matched `node_modules` only left no CSS file holding the sheet alone.
- **Vite 8 and rolldown take groups, Vite 7 and rollup take a function.** Vite 8 reads its groups under `build.rollupOptions.output`, the key Vite 7 uses for `manualChunks`, so a project moving between them changes the option and not its place. `advancedChunks` is deprecated in Vite 8; `codeSplitting.groups` is what was measured.
- **Vite 8 separates the sheet and rolldown alone refuses it**, although Vite 8 bundles with rolldown. A project that needs the package sheet in a file of its own and wants rolldown's output takes Vite 8.
- **A resolver plugin of your own skips the package's `sideEffects` field.** The React package declares `"sideEffects": ["*.css"]` and the Angular package `false`, and a bundler that resolves `@dravensoft/arena-*` through `node_modules` reads that field. A `resolveId` hook returning a path for them bypasses it, and rollup then keeps every component you did not import. Pass `treeshake.moduleSideEffects` back for those modules. Arena's own board bundles this way, with `moduleSideEffects` returning `false` for Arena's JS; held by a gate.

## How is the sprite served?

**Vite** takes the glob `?url` import and the `assetsInlineLimit` setting that [`install.md`](../install.md) gives, in its section "How does the toolchain serve the sprite?". With `publicDir: false`, a copy step of your own after the build works as well. The step copies `icons-*.svg` from the `-o` directory into the output, and nothing in the entry imports the file.

**Plain rollup and rolldown** copy `icons-*.svg` from the `-o` directory into the output directory after the bundle, with a copy step of your own. Neither bundler moves a file it does not import, measured on 2026-10-25: the output held no sprite before the copy.

The provider takes an absolute URL: `/${ARENA_SPRITE}` under a root deploy, with the base path in front under another. Vite's `base` is that prefix, and `base: './'` is the one for a deploy in a subdirectory. A bare file name resolves against the address of the page, so a route below `/` fetches a path that does not exist and paints no icon.
