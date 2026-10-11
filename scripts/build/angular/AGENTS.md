# scripts/build/angular/

| script | emits | why it exists |
| --- | --- | --- |
| `build-angular-demo.ts` | `frameworks/angular/build/demo/js/`, one bundle per `ENTRY_SUFFIXES` entry it finds | It bundles the page entries `build-angular-tests.ts` compiled into `build/test/`, and compiles nothing itself. Before bundling it asks `build-angular-tests.ts:emitStaleness` whether an input differs from what the emit compiled, and exits 1 naming `bun run build` or `bun run build:angular-tests` as the remedy, because a bundle over a stale emit exits 0 and ships the old templates. `ngc`'s ESM still carries bare `@angular/*` specifiers and extensionless relative imports, and `Bun.build` resolves both into something a browser loads. `splitting` keeps the Angular runtime in one shared chunk across every page. |
| `build-angular-tests.ts` | `frameworks/angular/build/test/` | **The layer's one `ngc` program**: every primitive, suite and page entry under `strictTemplates`, so its exit is the layer's type verdict and its tree is what the suites run and what `build-angular-demo.ts` bundles. The Angular suites run against the AOT emit, never against the `.ts` sources, so a template diagnostic in an inline `template:` string fails the *build* and no test in that run executes. It also prunes output whose source has been deleted, because `ngc`'s incremental build does not. It skips the compile entirely when no input differs from the last one, which is what makes it cheap enough to run before every suite; `--force` compiles anyway. |
| `build-angular-package.ts` | `frameworks/angular/dist/` | Assembles `@dravensoft/arena-angular` in Angular Package Format. The layer is staged at `STAGING`, which the script exports, because ng-packagr wants its own `ng-package.json`, `tsconfig.lib.json` and `package.json` at the root it compiles from, and writing those beside the tracked source would leave build files in the layer. **It stages nothing of another layer**: a component composes its own class names from a table emitted beside it, so nothing reaches four directories up, and a run that stages zero files throws rather than assembling an empty package. After ng-packagr runs, the step rewrites `dist/.npmignore` with the nested `package.json` lines in `SECONDARY_ENTRY_POINTS` order, because ng-packagr lists them in the order an async glob finishes, and it throws naming the difference when ng-packagr's lines are not that set (`scripts/build/angular/build-angular-package.ts:normalNpmignore`). |

The first two write into git-ignored `build/`, so neither **adds** the `.generated.` infix: the
directory already says a script wrote everything under it. A name there that carries the infix
anyway inherited it from the source it came from, which is most of them; count either
side with `find frameworks/angular/build/<demo|test> -name '*.generated.*' | wc -l`.
Both are part of `bun run build`, the emit first. `bun run test` and `bun run check` run the emit
too, before the suites that read it, and a run that selects the angular domain without the suites
still runs it, because it is the layer's type verdict.
**What decides whether it compiles is a stamp it writes after a successful emit**, never the
outputs' own times: `ngc` is incremental and leaves a file it did not change untouched, so the
oldest output is as old as the last time that one file moved and would force a compile forever. An
input is every `.ts` and `.json` under the layer, plus `package.json`, `bun.lock` and the script
itself, and the stamp records each one's path, size, mtime and sha256. **Freshness compares
content when the time moved**: an input whose size and mtime match the record is unchanged and is
not read, and one whose time moved is hashed, so a rewrite with the same bytes costs no compile.
The package in `dist/` is no input, because `ngc` never reads it. Other content, an added input or a
deleted one is stale, because a deleted source bumps no surviving file's time. A stamp that is
missing, unreadable or in a shape without hashes compiles and says which. `--force` compiles
unconditionally.
`build-angular-package.ts` is part of
`bun run build:packages` rather than `bun run build`, because a package is for publishing and
nothing in this repository reads one.

Every `X.test.ts` beside a script covers that script.
