# scripts/ci/arena/

The questions a runner asks that no one layer can answer alone.

| module | why it exists |
| --- | --- |
| `changed-layers.ts` | Which framework layers a diff reaches. `SHARED` names what routes to all three, `LAYER_INPUTS` what routes to one, and every entry carries a reason so a stale one is legible. **A Tailwind edit routes to Angular as well**, because each `.variants.ts` imports a generated manifest and `ngc` fails without it; that is the entry a hand-written YAML filter gets wrong. `unroutedLayers()` compares the map against `LAYERS`, so a layer added with no route fails the run rather than silently never building. Reads the diff on stdin and prints `layer=true|false` lines for `GITHUB_OUTPUT`, and the `domains=` line `verify.yml` selects by: `domainsOf` keeps every domain that is no layer and each layer the diff reaches. |
| `summarize-tests.ts` | Runs the suite and reports it per domain. The invocation is **taken from `check-all.ts` and extended, never rebuilt**: `stepsWithJunit()` appends `--reporter=junit` and `--reporter-outfile` to the steps of `testStep()`, which only the no-argument run uses, and `suiteWithJunit(name)` does the same to `suiteSteps(name)` for `--suite=<name>`; the suite asserts both by comparing against those functions themselves, so `check-all.ts` stays the single authority. The exit rules are the point: a domain that owns suites and reported no case, a tree that contributed no case, a case belonging to no domain, and an empty report are all failures, because a reporter that dropped them would otherwise print a confident table of zeros. `--suite=<name>` runs one suite and writes its report under `.cache/junit/`, and `--join --domains=<a,b>` reads the reports the suite jobs of `verify.yml` uploaded and applies the exit rules above to what the selected domains own. `SUITE_DOMAINS` says which domain selects each suite, and a selected suite with no report and a report nothing selected fail the join too. Writes to `GITHUB_STEP_SUMMARY` when it is set and to stdout when it is not. `suiteDomains()` decides which domains are expected to report, and it reads `isSuite()` from `lib/arena/domains.ts` rather than matching a suffix of its own: a domain whose suites this walk stops recognising stops being expected, and every case it owns can then go missing without raising the very problem the exit rules exist for. |
| `run-suite.ts` | What `bun run test` and its narrower siblings spawn, **taken from `check-all.ts` rather than restated in package.json**. The argv of `check-all` reaches `spawnSync` with no shell in between, so the ignore glob and the positional filter are bare there, and a manifest quoting them in single quotes would disagree on Windows, because **cmd.exe leaves a single quote inside the argument rather than stripping it**. A manifest that consumes the authority leaves the question no second spelling to answer, and no quote character is in `package.json`. Same shape as `summarize-tests.ts`, and for the same reason. Each step runs in a temp root of its own (`suite-tmp.ts` in [`../../lib/arena/`](../../lib/arena/AGENTS.md)), and a step that leaves anything in it fails. |
| `package-inputs.ts` | What each published package is assembled from, so a publish workflow can ask whether anything a package carries has moved past the version the registry holds. Derived from what the assemblers read; its suite holds it to that by checking every `CSS_CHAIN` entry, the CLI and the behaviour contracts are covered and every path named still exists, so a rename fails here rather than quietly narrowing the guard. A spec names a **directory**, and a directory holds the suites, the prompts and the prose no package carries, so `--carried` filters a diff through the assembler's own `excluded()` -- asked of the part of a path **inside** the spec that reached it, because a spec naming a file is read rather than walked and `build` is one of the names that walk skips, which would otherwise drop each assembler from its own input list. It imports that rule from `lib/arena/package-exclusions.ts` and never the assembler: the guard job installs nothing, and reaching `CSS_CHAIN` through `package-assembly.ts` would load typescript, tailwind and the token generator, and the guard would have no paths at all. |
| `supported-os.ts` | Which operating systems Arena is developed on, and whether each one's leg blocks. `SUPPORTED_OS` carries the reason per entry, because a matrix row is otherwise indistinguishable from a habit, and `blocking: false` is a platform whose branches are written and whose runner has not confirmed them. `check:portability` holds the matrix in `develop.yml` equal to this list and holds each leg's flag to what is claimed here, so a leg cannot quietly stop counting. |
| `run-portability.ts` | Which gates are worth running on a second operating system, each with the reason it is here. Most of the sweep judges text no platform can change, so what is left is the set whose ANSWER can differ: a spawn, a link, a path, a line ending, a Bun API, a real browser. `PORTABILITY_GATES` is read against `GATES` in `check/arena/check-all.ts`, and each leg prints its reason, so a run says what it proved rather than that it passed. |
| `verify-workflow.ts` | What `verify.yml` runs, read off the workflow itself: which job runs `check-all`, which job runs each suite and which domain its `if` names, which job joins the reports, and which domains each caller selects. `check-all.test.ts` holds those against `GATES`, `SUITES`, `SUITE_DOMAINS` and `domainsOf`, so no list of CI jobs is kept beside the workflow to drift from it. A job layout it cannot follow, such as an `if` it does not recognise, is a problem and never a job it skipped. |
| `release-notes.ts` | The commit log between two tags, as the body of a GitHub Release. `--generate-notes` lists pull requests and every release here arrives as one merge, so it would print a single merge subject and nothing else. What carries the release is the commit subjects, grouped by the area each one names and printed as written, with an em dash rewritten because a release page is read by more people than any document in the tree. |

Every `X.test.ts` beside a module covers that module, and each runs under plain node.

## Running a job's commands on a clean clone

A job of `verify.yml` runs on a tree built the way its `build` job builds it. A working tree keeps
a `dist/` and a `.cache/` from earlier builds, so a gate that stopped building its own input passes
there and fails on a runner. A clone built like the job answers what the job answers:

```bash
git clone --local --no-hardlinks <repo> <dir>
cd <dir>
bun install --frozen-lockfile
bun run build:release
git diff --exit-code
```

The clone holds committed state only, so commit the change to verify first. Put `<dir>` on a disk
with room for a build, which `/tmp` may not be. A copy made without `.git` fails every gate that asks git what the tree tracks, and `--no-hardlinks` keeps the clone's build
from writing through into the original. `git diff --exit-code` is the idempotency check of the job:
a tracked file the build rewrote is a generator out of step.

From that clone the commands of each job are:

| job | command |
| --- | --- |
| `gates` | `bun scripts/check/arena/check-all.ts --no-tests --domain=<list>` |
| `audit` | `bun scripts/check/arena/check-graph.ts --audit`, then `git diff --exit-code` |
| a suite job | `bun run ci:summarize --suite=<name>`, which writes `.cache/junit/<name>.xml` |
| `summarize` | `bun run ci:summarize --join --domains=<list>`, which reads the reports the suite jobs wrote |

`<list>` is the comma-separated domains a caller selects. `SUITE_DOMAINS` in `summarize-tests.ts`
says which suite job serves which domain: `scripts` always, `react` and `react-dom` for the `react`
domain, `angular` for the `angular` domain. The `core` and `tailwind` domains have no suite job, so
selecting either adds no report to the join. The `angular` suite job runs the emit before its suite,
and the join fails when a selected suite has no report in `.cache/junit/`.

The junit reports go to `.cache/junit/`, which is git-ignored and which every walker skips
already, since they all skip an entry whose name begins with a dot.
