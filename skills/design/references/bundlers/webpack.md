# The webpack family: webpack and rspack

rspack takes webpack's config, so one recipe serves both, and rspack adds one rule for CSS. Read this when your project builds with webpack or rspack, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| webpack | 5.111.1 | yes | verified by hand once | yes, with `experiments: { css: true }` | measured on 2026-10-23 |
| rspack | 2.2.8 | yes | verified by hand once | yes, with a `css/auto` rule | measured on 2026-10-23 |

The figures of each row are in [`environments.md`](../environments.md), section "What did each bundler measure?". `next build --webpack` runs webpack inside Next.js, which [the Next.js page](./next.md) covers.

## How do I keep Arena's JS in a chunk of its own?

```js
output: { filename: '[name]-[contenthash:8].js', chunkFilename: '[name]-[contenthash:8].js' },
optimization: { splitChunks: { chunks: 'all', cacheGroups: {
  arena: { test: /node_modules[\\/]@dravensoft[\\/]arena-/, name: 'arena', enforce: true },
} } },
```

rspack takes the same config unchanged.

## How do I keep the package sheet in a file of its own?

**webpack**, with React apart as well:

```js
experiments: { css: true },
output: { cssFilename: '[name]-[contenthash:8].css', cssChunkFilename: '[name]-[contenthash:8].css' },
optimization: { splitChunks: { chunks: 'all', cacheGroups: {
  default: false,
  defaultVendors: false,
  react: { test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, name: 'react', enforce: true, priority: 20 },
  arena: { test: /arena-react|arena\.package\.generated\.css/, name: 'arena', enforce: true, priority: 10,
    type: /^(javascript|css)/ },
} } },
```

**rspack** takes the webpack config with one rule added:

```js
module: { rules: [{ test: /\.css$/, type: 'css/auto' }] },
```

With either config, the Arena CSS file keeps its bytes and its name when the app changes, measured on 2026-10-23 by changing the app's text and its own sheet. Without it, both emit one CSS file for the entry.

## What differs between them?

- **The CSS half needs webpack's own CSS support.** The measured config turns on `experiments: { css: true }`. A setup that extracts CSS through a loader and a plugin of its own instead was not exercised.
- **The cache group names its `type`.** `type: /^(javascript|css)/` is what lets one `arena` group take both the JS and the sheet; the measured config carries it.
- **The default groups are off** in the sheet config, so the `react` and `arena` groups decide alone where each module goes.
- **The sheet is matched by its name, not by `node_modules`.** `arena build` writes `arena.package.generated.css` into its `-o` directory, inside your project, so the `arena` test carries a second pattern for it.
- **rspack needs the `css/auto` rule** for a `.css` file, which webpack's experiment supplies by itself.
