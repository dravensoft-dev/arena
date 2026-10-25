# Next.js and Turbopack

One React repository built a static export with Next.js 16.4.3, and this page says what it recorded. `next build --webpack` was not exercised. Read this when your project builds with Next.js, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

| Bundler | Arena's JS apart | The package sheet apart | Evidence |
| --- | --- | --- | --- |
| Turbopack, inside Next.js 16.4.3 | no: no chunk holds Arena's modules alone | yes: a CSS file holds the package sheet alone | measured on 2026-10-25, Next.js 16.4.3, Arena: the tree that becomes 13.0.0 (`40c82585b`) |
| `next build --webpack` | not exercised | not exercised | allowed by the manifest, not exercised |

Both Turbopack answers are outcomes the run recorded, with no option behind them. The figures are in [`environments.md`](../environments.md), section "What did each bundler measure?".

## What is known?

- **Turbopack exists only inside Next.js, and Next.js picks its chunks itself.** No option measured here pins Arena to a chunk under it, and the measured build held no chunk with Arena's modules alone.
- **The package sheet landed in a file of its own** under `_next/static/chunks/`, without any config. Whether it keeps its name when the app changes was not exercised.
- **`next build --webpack` runs webpack**, whose recipe is on [the webpack family page](./webpack.md). Next.js brings a webpack config of its own, and how it merges with that recipe was not exercised.
- **Arena ships no `use client` directive**, so the boundary between server and client components is yours to draw, in one line. [`cold-start.md`](../cold-start.md), node 9, says where it goes and what server rendering with hydration carries.
- **The route a navigation reads** comes from `next/navigation`. [`shell.md`](../shell.md) and [`exports.md`](../exports.md) name the hooks for the App Router.
- **Turbopack refuses a link that points out of its root**, with "Filesystem root used for resolution". A monorepo that links `node_modules` from a parent directory meets it.

## What did the measured project write?

A static export for a subdirectory takes four options, and `distDir: 'dist'` lands the export in `dist/` with no `.next` beside it:

```js
const config = {
  output: 'export',
  distDir: 'dist',
  assetPrefix: './',
  images: { unoptimized: true },
};
export default config;
```

With the relative prefix, no `"/_next/` appears in the page. The page's head sits in `app/layout.tsx`: the base, the title, the theme script and the `<html>` attributes. `app/page.tsx` is the one client boundary, which mounts the app on `#root` after the page is there:

```tsx
'use client';
import { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    void import('../src/Main');
  }, []);
  return <div id="root" />;
}
```

The project carries `typescript`, the types of React, React DOM and Node, and a strict `tsconfig.json` with the `next` plugin. `next build` type-checks the app, and Arena's types pass with `strict: true`. Next.js type-checks every `.ts` file the `include` reaches, so a Bun dev server stays out of it. Next.js 16 warns that React 18 support is deprecated, and the project runs React 18.3.1.

## What do I run first?

The two checks [the bundler index](./index.md) names for a bundler with no row of its own. Build, change one line of your app, build again, and see whether the file holding Arena keeps its name. Change a palette in your config, build again, and see whether the file holding the package sheet keeps its name. A file that changes name on both is Arena inside the app's bundle, and [`stylesheets.md`](../stylesheets.md) says how a dictionary still makes each release small.

## How is the sprite served?

Next.js serves `public/` at `/` under each file's own name, so a sprite copied there is served at the root. Not exercised: the measured project copies `icons-*.svg` into the export with a script of its own after `next build`, and the export holds no sprite without it.

Hand the provider `/${ARENA_SPRITE}`, with `basePath` in front of it when the app sets one. A bare name is read against the route, and an App Router page below `/` then fetches a path that holds no file.
