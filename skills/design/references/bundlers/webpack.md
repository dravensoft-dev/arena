# The webpack family: webpack and rspack

rspack takes webpack's config, so one recipe serves both, and rspack adds one rule for CSS. Read this when your project builds with webpack or rspack, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

Both rows were built on React and on Angular, each by a repository of its own that declares the bundler at the version named.

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| webpack | 5.112.2 | yes | measured on 2026-10-25, webpack 5.112.2, Arena: the tree that becomes 13.0.0 (`40c82585b`) | yes, with `experiments: { css: true }` | measured on 2026-10-25, webpack 5.112.2, Arena: the tree that becomes 13.0.0 (`40c82585b`) |
| rspack | 2.2.9 | yes | measured on 2026-10-25, rspack 2.2.9, Arena: the tree that becomes 13.0.0 (`40c82585b`) | yes, with a `css/auto` rule | measured on 2026-10-25, rspack 2.2.9, Arena: the tree that becomes 13.0.0 (`40c82585b`) |

The figures of each half are in [`environments.md`](../environments.md), section "What did each bundler measure?". `next build --webpack` runs webpack inside Next.js, which [the Next.js page](./next.md) covers.

## How do I keep Arena's JS in a chunk of its own?

```js
output: { filename: '[name]-[contenthash:8].js', chunkFilename: '[name]-[contenthash:8].js' },
optimization: { splitChunks: { chunks: 'all', cacheGroups: {
  arena: { test: /node_modules[\\/]@dravensoft[\\/]arena-/, name: 'arena', enforce: true, type: /^javascript/ },
} } },
```

rspack takes the same config unchanged.

## How do I keep the package sheet in a file of its own?

**webpack**, with React apart as well, takes two groups. `arena` holds the JS and `arenaSheet` holds the sheet:

```js
experiments: { css: true },
output: { cssFilename: '[name]-[contenthash:8].css', cssChunkFilename: '[name]-[contenthash:8].css' },
optimization: { splitChunks: { chunks: 'all', cacheGroups: {
  default: false,
  defaultVendors: false,
  react: { test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, name: 'react', enforce: true, priority: 20 },
  arena: { test: /node_modules[\\/]@dravensoft[\\/]arena-/, name: 'arena', enforce: true, priority: 10, type: /^javascript/ },
  arenaSheet: { test: /node_modules[\\/]@dravensoft[\\/]arena-|arena\.package\.generated\.css/, name: 'arena-sheet', enforce: true, priority: 10, type: /^css/ },
} } },
```

The two `output` objects above merge into one in the config, because a single object cannot carry both the JS and the CSS file names:

```js
output: { publicPath: './', filename: '[name]-[contenthash:8].js', chunkFilename: '[name]-[contenthash:8].js',
  cssFilename: '[name]-[contenthash:8].css', cssChunkFilename: '[name]-[contenthash:8].css' },
```

**rspack** takes the webpack config with one rule added:

```js
module: { rules: [{ test: /\.css$/, type: 'css/auto' }] },
```

With either config, the Arena CSS file keeps its bytes and its name when the app changes. Measured on 2026-10-25, on React and on Angular, by changing the app's text and its own sheet. Without the sheet config, webpack emits one CSS file for the entry, measured on 2026-10-25.

## How do I build with them?

**A React project on webpack** compiles TypeScript with `esbuild-loader` and writes its page with `html-webpack-plugin`:

```js
mode: 'production',
target: 'web',
devtool: false,
entry: { main: ['./src/Main.tsx'] },
resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs', '.json'] },
module: { rules: [
  { test: /\.tsx?$/, loader: 'esbuild-loader', options: { loader: 'tsx', jsx: 'automatic', target: 'es2022' } },
] },
plugins: [
  new HtmlWebpackPlugin({ template: './index.html', scriptLoading: 'defer', inject: 'head', minify: false }),
],
experiments: { css: true, html: false },
```

`experiments: { html: false }` is needed beside the plugin. Without it, webpack 5.112.2 reads the `.html` template itself and writes a minified page. A page of that kind carries `<html lang=en>` and a base without quotes.

**A React project on rspack** takes `builtin:swc-loader` with `type: 'javascript/auto'` and `rspack.HtmlRspackPlugin` with the same options, and the `css/auto` rule above.

**An Angular project on webpack** takes `@ngtools/webpack` for the compiler and a Babel loader that runs Angular's linker over `node_modules`, because Angular's packages are partially compiled:

```js
entry: { main: ['./src/styles.css', './src/main.ts'] },
resolve: {
  extensions: ['.ts', '.mjs', '.js', '.json'],
  mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
  conditionNames: ['es2020', 'es2015', '...'],
  extensionAlias: { '.js': ['.ts', '.js'] },
},
module: { rules: [
  { test: /\.[cm]?ts$/, loader: '@ngtools/webpack' },
  { test: /\.[cm]?js$/, include: /node_modules/, resolve: { fullySpecified: false }, loader: '<your linker loader>' },
] },
plugins: [new AngularWebpackPlugin({ tsconfig: resolve('tsconfig.json'), jitMode: false })],
```

The loader behind `<your linker loader>` runs `@angular/compiler-cli/linker/babel` through `@babel/core` over each file that holds `ɵɵngDeclare`. Declare `@babel/core` yourself.

**An Angular project on rspack** goes through `createConfig` of `@nx/angular-rspack`, which takes the options of the Angular builder, and the recipe goes in `rspackConfigOverrides`. The package sheet is its own `styles` entry:

```js
styles: [{ input: 'src/arena.package.generated.css', bundleName: 'arena-sheet' }, 'src/styles.css'],
```

The JS-only config of an Angular project carries no `css/auto` rule and no `experiments.css`, because the rule alone empties nx's own CSS pipeline, verified by hand once on 2026-10-24. Your Angular entry file imports the icon list `arena build` writes as `.js`, and the Angular layer writes it as a `.ts` module. Both webpack and rspack need `resolve.extensionAlias: { '.js': ['.ts', '.js'] }` on Angular. The build fails with "Can't resolve './arena.icons.generated.js'" without it, measured on 2026-10-25, webpack 5.112.2 and Rspack 2.2.9, Arena: the tree that becomes 13.0.0 (`40c82585b`).

## What differs between them?

- **The CSS half needs webpack's own CSS support.** The measured config turns on `experiments: { css: true }`. A setup that extracts CSS through a loader and a plugin of its own instead was not exercised.
- **The cache groups name their `type`.** `type: /^javascript/` on `arena` and `type: /^css/` on `arenaSheet` give each group one kind of file. Webpack 5.112.2 kept the package sheet in a file of its own with `type` removed from both groups, measured on 2026-10-25. Through `@nx/angular-rspack`, an untyped `arena` group also takes the sheet's imports, and nx's plugin then deletes the chunk's JS. That case was verified by hand once on 2026-10-24.
- **The default groups are off** in the sheet config, so the `react`, `arena` and `arenaSheet` groups decide alone where each module goes.
- **The sheet is matched by its name, not by `node_modules`.** `arena build` writes `arena.package.generated.css` into its `-o` directory, inside your project, so the `arenaSheet` test carries a second pattern for it.
- **rspack needs the `css/auto` rule on React.** Without it the build stops on the package sheet's `@layer properties;`, measured on 2026-10-25. On Angular through nx, the `styles` entry places the sheet without the rule, measured on 2026-10-25.
- **nx writes files beside the output.** `@nx/angular-rspack` adds a prerendered-routes file and a licenses file next to the build, and a deploy of the directory removes them or sets the options.

## How is the sprite served?

**webpack** copies the file with `copy-webpack-plugin`, which takes `{ from: 'src/icons-*.svg', to: '[name][ext]' }` in its `patterns`. The sprite then sits at the root of the output under the name `arena build` gave it. The output root held `icons-*.svg` after the build, on React and on Angular (`webpack.sprite-at-root`), measured on 2026-10-25. An Angular project adds `{ from: 'public' }` for its own statics.

**rspack** uses `rspack.CopyRspackPlugin` with the same pattern. The output root held `icons-*.svg` after the build, on React and on Angular (`rspack.sprite-at-root`), measured on 2026-10-25. On Angular, the `assets` option carries `{ glob: 'icons-*.svg', input: 'src' }`.

Hand the provider `/${ARENA_SPRITE}` under a root deploy, and put `output.publicPath` in front of it under another. Browsers read a bare name against the current route, which fails on every page deeper than the root and leaves the icons blank.
