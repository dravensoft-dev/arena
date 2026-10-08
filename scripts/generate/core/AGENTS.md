# scripts/generate/core/

| script | emits | why it exists |
| --- | --- | --- |
| `fetch-fonts.ts` | `contracts/design-generated/fonts.generated.css` and `assets/fonts/*.woff2` | Downloads the Latin subsets of the three families `contracts/design/typography.json` names, and declares them with `@font-face`, so a page loads fonts from its own origin and makes no CDN request. **The binaries carry no `.generated.` infix and no header**: they are binary, so a header is impossible, and reproducing them needs the network. They are the one generated output in the repository identified by its generator rather than by its name. `check:generated` records that exception by literal value with its reason. |
| `arena-cli/` | `arena.generated.css`, `icons.generated.css` and `plugin.generated.css`, in the directory the consumer points `--out` at | The `arena` command the npm packages ship. Its entry is `arena.ts`, with one `command-<name>.ts` per subcommand beside flat sibling modules. It is written in TypeScript here and ships as `.mjs`, because Node refuses to strip types under a `node_modules` path at every version, so `copyCli` erases the types with `transpileModule` (exact, because `erasableSyntaxOnly` is on), rewrites each `./x.ts` specifier to `./x.mjs`, and the manifest's `bin` names `bin/arena.mjs`. The `engines.node` floor is the oldest Node line still under support, since the emitted command needs no stripping and a higher floor refuses a Node the consumer's framework accepts. Its one sibling that is not TypeScript is `validate-palette.mjs`, vendored verbatim and shipped as itself. **The theme step** turns an `arena.config.json` into the palette blocks, the `@font-face` rules and the import chain that file leads with, the one stylesheet a package cannot carry because Arena publishes the language and never the skin. `"components": "auto"` is resolved against the package's `components.json` before the config is validated, and a scan that finds nothing is fatal. The theme runs first and its failure stops the run. **The icons step** writes the Phosphor subset from the consumer's sources and the package's own `icons.json`, keeping each weight's `@font-face` in `woff2` alone. **A package tells a consumer what it draws, and a consumer never re-derives that half by searching the package for text**, since a search cannot tell a render from a sentence about one; `lib/arena/icon-manifest.ts` computes the list from the renders, with comments erased by the compiler. **The source walk skips the sheets the command writes**, so the output is a function of the sources alone and an incremental build agrees with a fresh one. `check:packages` asserts the theme over Arena's own skin equals what Style Dictionary emits, and fails an icon list that stopped matching the renders. |

`core` because the first touches `contracts/` and `assets/`, which the design layer owns, and no
framework layer, and because the second speaks the vocabulary of a package a consumer installed
rather than of any layer here.

## Why a shipped command is a directory

**The entry dispatches and owns nothing else.**
`scripts/generate/core/arena-cli/arena.ts:main(argv, io)` reads the first word and hands the rest to
that subcommand's `run(argv, io)`.
`scripts/generate/core/arena-cli/args.ts:parseArgs(command, argv)` reads every command's flags from
the one `SPECS` table, and `reports.ts` declares the kinds `--strict` holds per command. Every other
module is a step or a helper the commands share.

It is one shippable unit rather than loose files. The assembly copies the directory whole into
each package, so a sibling added to it travels with no edit anywhere else, and it depends on
nothing but `node:fs` and its own contents, because inside a package `scripts/` does not exist.

**`bin/` is flat**, so every CLI tree is one namespace: two of them may not share a filename, and
a command may never import across from another's directory, because the path it would use here
is not the path that exists there. `copyCli` in `lib/arena/package-assembly.ts` refuses both,
which is what lets a second command be added without silently overwriting a file of this one's.

That is also why `validate-palette.mjs` sits in it: a **verbatim** second copy of the one in
`lib/core/`, which is what its own header instructs. `palette-keys.test.ts` holds the two
byte-equal, and holds `PALETTE_KEYS` in `palette-keys.ts` equal to the keys of
`contracts/design/palette.dark.json`, so a colour added to the skin fails there before it can
reach a consumer's configuration.

**One binary, with subcommands, and one renderer behind them.**
`scripts/generate/core/arena-cli/plan.ts:plan(options, env)` is the only code that decides what a
sheet contains: `arena build` writes what it returns, through
`scripts/generate/core/arena-cli/command-build.ts:writeOutputs(outputs, orphans, out, log)` and only
where the bytes differ; `arena check` reads its reports and writes nothing; `arena doctor` compares
its outputs with the tree through `scripts/generate/core/arena-cli/plan.ts:sheetStates(outputs)`. A
sheet a build would write and a sheet doctor calls current are therefore the same bytes by
construction, never by two renderers agreeing. `CLI_BINS` is the list both manifests take their
`bin` from, and it holds `arena` alone.

## What counts as new to `--strict`

`arena init` writes `--strict=` with every rule and kind that exists when it runs (`reports.ts:strictNames(command)`), so a project holds exactly what existed that day and a minor never turns its CI red. That only holds while anything that reports what was not reported before arrives under a name no project has written:

- a new audit rule is a new tag in `audit.ts:RULE_TAGS`, emitted through `at()` so `audit.test.ts` holds the two equal;
- an existing rule that widens ships the widened part as a rule of its own: a component added to what `router-link` reads is a new tag beside it, not a new entry in `LINKABLE_TAGS`;
- a stricter producer inside a kind without rules ships as a kind of its own in `KINDS_BY_COMMAND`.

A bare `--strict` and `--strict=<kind>` hold everything, so a project that wrote them chose to.

## Running them

`fetch-fonts.ts` is **not part of `bun run build`**, since it reaches the network and its
output changes only when a family or weight is added. `--css-only` re-emits the stylesheet from
the binaries already on disk. `check:fonts` asserts every declared family has a face.

`arena-cli/arena.ts` is not part of it either, and for the opposite reason: nothing in this
repository is its input. It runs in a consumer's project, against the files that project wrote.

Every `X.test.ts` beside a script covers that script.
