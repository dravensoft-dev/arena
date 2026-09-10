# scripts/generate/core/

| script | emits | why it exists |
| --- | --- | --- |
| `fetch-fonts.ts` | `contracts/design-generated/fonts.generated.css` and `assets/fonts/*.woff2` | Downloads the Latin subsets of the three families `contracts/design/typography.json` names, and declares them with `@font-face`, so a page loads fonts from its own origin and makes no CDN request. **The binaries carry no `.generated.` infix and no header**: they are binary, so a header is impossible, and reproducing them needs the network. They are the one generated output in the repository identified by its generator rather than by its name. `check:generated` records that exception by literal value with its reason. |
| `arena-to-prod/` | `arena.generated.css` and `icons.generated.css`, in the directory the consumer points `--out` at | The one command the npm packages ship, **emitted as `bin/arena-to-prod.mjs`**. It is written in TypeScript here and may not ship that way, because Node refuses to strip types under a `node_modules` path at every version, so `copyCli` erases the types with `transpileModule` (exact, because `erasableSyntaxOnly` is on) and rewrites each `./x.ts` specifier to `./x.mjs`. The `engines.node` floor is the oldest Node line still under support, since the emitted command needs no stripping and a higher floor refuses a Node the consumer's framework accepts. Its one sibling that is not TypeScript is `validate-palette.mjs`, vendored verbatim and shipped as itself. **The theme step** turns an `arena.config.json` into the palette blocks, the `@font-face` rules and the import chain that file leads with, the one stylesheet a package cannot carry because Arena publishes the language and never the skin. `"components": "auto"` is resolved against the package's `components.json` before the config is validated, and a scan that finds nothing is fatal. The theme runs first and its failure stops the run. **The icons step** writes the Phosphor subset from the consumer's sources and the package's own `icons.json`, keeping each weight's `@font-face` in `woff2` alone. **A package tells a consumer what it draws, and a consumer never re-derives that half by searching the package for text**, since a search cannot tell a render from a sentence about one; `lib/arena/icon-manifest.ts` computes the list from the renders, with comments erased by the compiler. **The source walk skips the two sheets the command writes**, so the output is a function of the sources alone and an incremental build agrees with a fresh one. `check:packages` asserts the theme over Arena's own skin equals what Style Dictionary emits, and fails an icon list that stopped matching the renders. |

`core` because the first touches `contracts/` and `assets/`, which the design layer owns, and no
framework layer, and because the second speaks the vocabulary of a package a consumer installed
rather than of any layer here.

## Why a shipped command is a directory

It is one shippable unit rather than loose files. The assembly copies the directory whole into
each package, so a sibling added to it travels with no edit anywhere else, and it depends on
nothing but `node:fs` and its own contents, because inside a package `scripts/` does not exist.

**`bin/` is flat**, so every CLI tree is one namespace: two of them may not share a filename, and
a command may never import across from another's directory, because the path it would use here
is not the path that exists there. `copyCli` in `lib/arena/package-assembly.ts` refuses both,
which is what lets a second command be added without silently overwriting a file of this one's.

That is also why `validate-palette.mjs` sits in it: a **verbatim** second copy of the one in
`lib/core/`, which is what its own header instructs. `palette-keys.test.ts` holds the two
byte-equal, and holds the 27 palette keys equal to `contracts/design/palette.dark.json`, so a
colour added to the skin fails there before it can reach a consumer's configuration.

**One command rather than two.** Every project ran the theme and the icons in the same order in
the same prebuild script, so two commands were two of everything a consumer had to read: two
sections, two flag tables, two wiring snippets. `CLI_BINS` is the list both manifests take their
`bin` from, and it now holds one entry.

## Running them

`fetch-fonts.ts` is **not part of `bun run build`**, since it reaches the network and its
output changes only when a family or weight is added. `--css-only` re-emits the stylesheet from
the binaries already on disk. `check:fonts` asserts every declared family has a face.

`arena-to-prod.ts` is not part of it either, and for the opposite reason: nothing in this
repository is its input. It runs in a consumer's project, against the files that project wrote.

Every `X.test.ts` beside a script covers that script.
