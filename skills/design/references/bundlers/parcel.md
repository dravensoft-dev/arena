# Parcel, and what it does with Arena

Parcel keeps Arena's JS in a bundle of its own once two options are set, and stops on the package sheet. Read this when your project builds with Parcel, after [the bundler index](./index.md).

## Which version, and how sure is each answer?

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| Parcel | 2.16.4 | yes, only with `packageExports: true` | verified by hand once | no: the build stops | measured on 2026-10-23 |

The figures are in [`environments.md`](../environments.md), section "What did each bundler measure?".

## How do I keep Arena's JS in a bundle of its own?

Both options sit in `package.json`:

```json
"@parcel/bundler-default": {
  "manualSharedBundles": [
    { "name": "arena", "root": "<your entry>", "assets": ["**/node_modules/@dravensoft/arena-react/**"] }
  ]
},
"@parcel/resolver-default": { "packageExports": true }
```

## How do I keep the package sheet in a file of its own?

The package sheet cannot be kept apart, measured on 2026-10-23: the build stops on the sheet's first `@import` of a package specifier, which Parcel resolves from the `src` directory. Link the sheets `arena build` writes from your page instead, the package sheet first and `arena.generated.css` after it. That path is not exercised.

## What differs from the other bundlers?

- **The first import fails without `packageExports: true`**, because Arena's package is reached through its `exports` field and Parcel's resolver reads that field only when told to.
- **React stays with the app.** An app release downloads most of the app's bundle again, 39.18 KB on the typical screen, while Arena itself downloads nothing again. Every other bundler that keeps Arena apart downloads under 1 KB.
- **No dictionary can serve the Arena bundle.** Parcel names its two shared bundles with one stem, so a `Use-As-Dictionary` match covering the next Arena bundle also covers the other one. [`stylesheets.md`](../stylesheets.md) says how a dictionary is served elsewhere.
