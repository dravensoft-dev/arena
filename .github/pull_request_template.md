Thanks for the work you put into this.

[`CONTRIBUTING.md`](https://github.com/dravensoft-dev/arena/blob/main/CONTRIBUTING.md)
says which changes go straight to a pull request and which start as a proposal, and
which decisions a change is not allowed to quietly break. Delete whichever lines
below do not apply to yours.

**What moved, and why.** The defect that existed, or what Arena could not do.

**What holds it.** The contract, the token, the gate or the suite that fails if this
regresses. A change nothing holds is one that goes quietly false later.

**The proposal it answers**, if it needed one. Link the issue.

**`bun run check`.** Paste what it said. If a gate is red for a reason you believe is
the gate's rather than yours, say which one and why.

**`bun run build` left the tree clean.** `git status --short` reports nothing, because
the build is idempotent and CI fails a tracked file a generator rewrote.
