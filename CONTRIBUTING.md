# Contributing

**Arena takes external pull requests.** A feature, a defect, a security patch, a
paragraph that turned out to be wrong: every one of them arrives the same way, and
none of them waits for permission.

What a change owes is not permission. It is an argument, and how much of one you
have to make before you write the code depends on how far the change reaches.
Almost nothing here is local. A component's API is a contract file, the
accessibility pattern it binds is another, and the values it renders resolve
through design tokens that every other component reads too. So the question that
decides your route is not how large the diff is. It is how many things it binds.

## Straight to a pull request

**A change that stays inside one thing does not need anything to happen first.**
A component that renders or behaves differently from what its contract says, a
gate that refuses something correct or passes something it should refuse, a
document that sends a reader somewhere empty, a package that does not install as
its page describes, a manifest, a playground fixture, a suite, a typo. Open the
pull request. Nobody has to agree in advance that a defect is a defect.

An accessibility failure is the category that gets read first, whether it arrives
as a report or as a fix.

## Bring the argument first

**A change to a rule starts as a proposal**, which is the third issue form. A file
under [`contracts/`](./contracts/AGENTS.md), a design token, the claim a gate
holds, or a member a consumer imports: each of those binds every component at
once, and a patch that changes one arrives with the change and without the
argument. The argument is the part that has to be made, and the form asks for it:
what Arena cannot do today, what it costs a project already on Arena, and which
alternatives were weighed and refused. A refused option without its reason is
worth nothing, which is the same standard [`DOUBTS.md`](./DOUBTS.md) holds a
decision to.

Say in the proposal that you intend to write it. Agreement on the rule is what the
form is for, and the code is yours to send once there is agreement.

If you cannot tell which of the two you are holding, open the proposal. Hearing
that it was a pull request all along costs one comment, and hearing the opposite
costs a weekend.

## What a change may not break

Arena is opinionated, and the opinions are written down rather than held. A pull
request is not refused for arguing with one of them. It is refused when it quietly
stops one of them being true.

- **Arena carries the design language and never the skin.** No colour and no font
  of Arena's own reaches a consumer's build. [`AGENTS.md`](./AGENTS.md).
- **The kernel keeps the questions and every answer is a style plugin.** A plugin
  that writes a hex is authoring a skin it does not own.
  [`contracts/design/StylePlugins.md`](./contracts/design/StylePlugins.md).
- **Tokens are the only styling layer**, and a bare literal in a token-governed
  property is a bug rather than a shortcut.
  [`frameworks/AGENTS.md`](./frameworks/AGENTS.md).
- **The layers are peers and neither is the other's authority.** A fact recorded
  only as matching the other layer is a fact missing from a contract.
  [`frameworks/AGENTS.md`](./frameworks/AGENTS.md).
- **An API is a contract file rather than a paragraph**, and a reshape may not
  weaken the behaviour a component binds or the tokens it renders from.
  [`contracts/AGENTS.md`](./contracts/AGENTS.md).
- **A fact belongs to one branch and one document.** A rule with a second home is
  the one that goes stale. [`AGENTS.md`](./AGENTS.md).

None of those is a matter of taste, and each one has a document that decides it. If
you think one is wrong, that is a proposal, and it is a welcome one.

## How a change is made

Branch off `develop`, name it for what it touches, and open the pull request back
into `develop`. That branch is where integration happens; `main` receives one merge
per release and nothing else.

Write the commit subject as `area: a sentence naming the defect that existed`.
`scripts/ci/arena/release-notes.ts:AREA` parses that prefix and groups the release
page by it, so a subject without one lands under everything else.

A fresh clone builds before it checks: `bun install && bun run build`, or part of
the tree does not exist and every gate reading it reports its subject missing. Run
`bun run build` again when the work is done and read `git status --short`. A file
you did not expect means a generator you did not know reads what you edited, and a
file you expected and did not get means the generator never saw it;
[`GENERATED.md`](./GENERATED.md) says which half of a file is yours.

Then `bun run check` once, when the implementation is finished rather than per
commit. It runs every gate and every suite, and one of them runs at a time. The
same gates run on the pull request, so a green board here is the board there.

[`AGENTS.md`](./AGENTS.md) roots this branch and routes the rest by what you are
changing. Read it before the file you are about to edit, and read
[`skills/design/SKILL.md`](./skills/design/SKILL.md) instead if what you are doing
is building something *with* Arena rather than changing it.

## What you can do without us

Arena is MIT, and that is not a formality. Fork it, cut it apart, ship a
derivative, take the token contracts and leave the components. The license is the
whole of the permission, and nothing here asks you to come back and ask.

What a fork does not get is the guarantee, because the guarantee is the gates, and
those run against this tree.

## Security

A vulnerability does not go in an issue and does not go in a pull request.
[`SECURITY.md`](./SECURITY.md) says where it goes, and how to write the fix for one
without publishing it first.

## Conduct

[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) is the Contributor Covenant, and it
names the address a report goes to.
