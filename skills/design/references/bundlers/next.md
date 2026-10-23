# Next.js and Turbopack

Nothing on this page was exercised: it says what is known before you run it, and what to run first. Read this when your project builds with Next.js, after [the bundler index](./index.md).

## Which versions, and how sure is each answer?

| Bundler | Arena's JS apart | The package sheet apart | Evidence |
| --- | --- | --- | --- |
| Turbopack, inside Next.js | not exercised | not exercised | allowed by the manifest, not exercised |
| `next build --webpack` | not exercised | not exercised | allowed by the manifest, not exercised |

## What is known before you run it?

- **Turbopack exists only inside Next.js, and Next.js picks its chunks itself.** No option measured here pins Arena to a chunk under it.
- **`next build --webpack` runs webpack**, whose recipe is on [the webpack family page](./webpack.md). Next.js brings a webpack config of its own, and how it merges with that recipe was not exercised.
- **Arena ships no `use client` directive**, so the boundary between server and client components is yours to draw, in one line. [`cold-start.md`](../cold-start.md), node 9, says where it goes and what server rendering with hydration carries.
- **The route a navigation reads** comes from `next/navigation`. [`shell.md`](../shell.md) and [`exports.md`](../exports.md) name the hooks for the App Router.

## How is the sprite served?

Copy `icons-*.svg` into `public/`, which Next.js serves at `/` under the file's own name. Not exercised.

Hand the provider `/${ARENA_SPRITE}`, with `basePath` in front of it when the app sets one. A bare name is read against the route, and an App Router page below `/` then fetches a path that holds no file.

## What do I run first?

The two checks [the bundler index](./index.md) names for a bundler with no row. Build, change one line of your app, build again, and see whether the file holding Arena keeps its name. Change a palette in your config, build again, and see whether the file holding the package sheet keeps its name. A file that changes name on both is Arena inside the app's bundle, and [`stylesheets.md`](../stylesheets.md) says how a dictionary still makes each release small.
