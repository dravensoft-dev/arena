# scripts/build/angular/

| script | emits | why it exists |
| --- | --- | --- |
| `build-angular-demo.ts` | `frameworks/angular/build/demo/js/`, one bundle per `ENTRY_SUFFIXES` entry it finds | Two steps, because neither tool does the other's job: `ngc` compiles the templates AOT into ESM that still carries bare `@angular/*` specifiers and extensionless relative imports, and `Bun.build` resolves both into something a browser loads. `splitting` keeps the Angular runtime in one shared chunk across every page. |
| `build-angular-tests.ts` | `frameworks/angular/build/test/` | The Angular suites run against the AOT emit, never against the `.ts` sources, so a template diagnostic in an inline `template:` string fails the *build* and no test in that run executes. It also prunes output whose source has been deleted, because `ngc`'s incremental build does not. It skips the compile entirely when no input has moved since the last one, which is what makes it cheap enough to run before every suite; `--force` compiles anyway. |
| `build-angular-package.ts` | `frameworks/angular/dist/` | Assembles `@dravensoft/arena-angular` in Angular Package Format. The layer is staged at `STAGING`, which the script exports, because ng-packagr wants its own `ng-package.json`, `tsconfig.lib.json` and `package.json` at the root it compiles from, and writing those beside the tracked source would leave build files in the layer. **It stages nothing of another layer**: a component composes its own class names from a table emitted beside it, so nothing reaches four directories up any more, and a run that stages zero files throws rather than assembling an empty package. |

The first two write into git-ignored `build/`, so neither **adds** the `.generated.` infix: the
directory already says a script wrote everything under it. A name there that carries the infix
anyway inherited it from the source it was compiled from, which is most of them; count either
side with `find frameworks/angular/build/<demo|test> -name '*.generated.*' | wc -l`.
`build-angular-demo.ts` is part of `bun run build`;
`build-angular-tests.ts` is not, because `bun run test` and `bun run check` run it themselves
immediately before the suites that read it, which is what prevents staleness there. **What decides
whether it compiles is a stamp it writes after a successful emit**, never the outputs' own times:
`ngc` is incremental and leaves a file it did not change untouched, so the oldest output is as old
as the last time that one file moved and would force a compile forever. An input is every `.ts`
and `.json` under the layer, plus `package.json`, `bun.lock` and the script itself, and the stamp
records which ones it compiled as well as when: a deleted source bumps no surviving file's time,
so a comparison of timestamps alone would skip a tree that no longer holds what was compiled.
`build-angular-package.ts` is part of `bun run build:packages` rather than `bun run build`,
since a package is for publishing and nothing in this repository reads one.

Every `X.test.ts` beside a script covers that script.
