# Parcel, and what it does with Arena

Parcel keeps Arena's JS and the package sheet in bundles of their own once two options are set, and keeps React with the app. Read this when your project builds with Parcel, after [the bundler index](./index.md).

## Which version, and how sure is each answer?

Parcel was built on React and on Angular, each by a repository of its own that declares Parcel 2.16.4.

| Bundler | Version | Arena's JS apart | Evidence | The package sheet apart | Evidence |
| --- | --- | --- | --- | --- | --- |
| Parcel | 2.16.4 | yes, with the shared bundle below, and `packageExports: true` | measured on 2026-10-25 by the run before the latest, Parcel 2.16.4, Arena: the tree that becomes 13.0.0 (`40c82585b`) | yes, with a second shared bundle | measured on 2026-10-25 by the run before the latest, Parcel 2.16.4, Arena: the tree that becomes 13.0.0 (`40c82585b`) |

The figures of each half are in [`environments.md`](../environments.md), section "What did each bundler measure?".

## How do I keep Arena's JS and the package sheet in bundles of their own?

Both options sit in `package.json`, and `root` names the entry. On React the entry is `src/index.html`, on Angular the `index.html` at the project root:

```json
"@parcel/bundler-default": {
  "manualSharedBundles": [
    { "name": "arena", "root": "src/index.html", "assets": ["**/node_modules/@dravensoft/arena-react/**"] },
    { "name": "arenapkg", "root": "src/index.html", "types": ["css"], "assets": ["**/src/arena.package.generated.css"] }
  ]
},
"@parcel/resolver-default": { "packageExports": true }
```

The first entry keeps Arena's JS apart and the second keeps the package sheet apart, so Parcel bundles the CSS itself and the page links nothing. On Angular the first glob names `arena-angular`. The Arena CSS file keeps its bytes and its name when the app changes, measured on 2026-10-25 by changing the app's text and its own sheet.

The globs match paths below the project root, so Arena's package must be a real directory there, as an npm install writes it. A link into a store fails the JS glob, verified by hand once on 2026-10-24 with a symlinked copy. A monorepo that hoists the package to a parent directory does not match either, and Bun's isolated linker fails earlier, with "options.packageManager.resolve is not a function".

The command is `parcel build <entry> --dist-dir dist --public-url ./ --no-cache --no-source-maps --no-autoinstall`, where `--public-url ./` serves a deploy in a subdirectory. Parcel writes `.parcel-cache` even with `--no-cache`.

An Angular project compiles with `ngc` first, and a transformer of its own runs Angular's linker, because Angular's packages are partially compiled. The page links `src/styles.css` and `.ngc/src/main.js`:

```json
{
  "extends": "@parcel/config-default",
  "transformers": { "*.{js,mjs}": ["./parcel-transformer-angular-linker.cjs", "..."] }
}
```

The transformer takes `Transformer` from `@parcel/plugin`, and runs `@angular/compiler-cli/linker/babel` through `@babel/core` over each file that holds `ɵɵngDeclare`. Declare both packages yourself. Run `ngc` before Parcel, with the options of the rollup family page: `-p` for the app's tsconfig, `--outDir .ngc` and `--rootDir .`.

## What differs from the other bundlers?

- **Parcel's resolver reads a package's `exports` field only when told to.** Angular's `@angular/common/http` does not resolve without `packageExports: true`: the build stops with "Failed to resolve '@angular/common/http'", measured on 2026-10-25. An import of an Arena subpath, which Arena's package serves through its `exports` field, needs the option too, verified by hand once on 2026-10-24. The first import of the React package resolves through its `module` field without the option, measured on 2026-10-25.
- **React stays with the app.** An app release downloads most of the app's bundle again, and Arena itself downloads nothing again, measured on 2026-10-25. [`environments.md`](../environments.md) gives the figures of each half.
- **No dictionary can serve the Arena bundle.** Parcel names its two shared bundles with one stem, the project's directory name, measured on 2026-10-25. A `Use-As-Dictionary` match covering the next Arena bundle also covers the other one. [`stylesheets.md`](../stylesheets.md) says how a dictionary is served elsewhere.
- **The page Parcel writes is minified.** The base reads `<base href=./>` without quotes, and the scripts and links come before the base.

## How is the sprite served?

Copy `icons-*.svg` into the dist directory after `parcel build`, with a script of your own. Parcel emits only what an entry reaches, so the sprite is not there unless you put it. The measured halves do this, and an Angular half also copies its `public/` directory.

The provider wants an absolute URL: `/${ARENA_SPRITE}` under a root deploy, or the `--public-url` you build with in front of it under another. A relative name follows the route in the address bar, and a nested route then asks for a file that is not there.
