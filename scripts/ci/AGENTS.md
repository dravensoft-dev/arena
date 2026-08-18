# scripts/ci/

What a workflow calls that is neither a build, a generate nor a gate.

A script here answers a question only a runner asks: which jobs need to run for this diff,
what did the suite report, is there anything to publish. None of it produces a file the
repository keeps, and none of it decides whether the tree is correct. That is `check/`'s
job, and a script here calls a gate rather than replacing one.

The reason the phase exists at all is that its answers are load-bearing and a wrong one is
silent. A routing rule that skips a layer reports green over a tree it never opened; a
summary that classifies a suite into nothing prints a confident zero. So every rule lives
in a module with a suite beside it, and the workflow reads the module, never a copy of the
rule written in YAML.

| domain | what a script there answers |
| --- | --- |
| [`arena/`](./arena/AGENTS.md) | every one of them: which layers a diff reaches, what the suite reported, what a package is assembled from, which platforms are supported and which gates are worth re-running on one, and what a release says |

Every script here is `arena`, because each reads two or more layers or the repository root. The
other four domains exist and are empty, the way they are under every phase.

`summarize-tests` is the one with an npm script, `bun run ci:summarize`, because it is worth
running by hand: with no `GITHUB_STEP_SUMMARY` in the environment it prints the table to
stdout. The other two read stdin or are imported, and are run by path.

[`../../.github/workflows/AGENTS.md`](../../.github/workflows/AGENTS.md) is where the jobs
that call them are described.
