# Arena by Dravensoft

**One design system, in React and in Angular, built to be operated by an AI agent.**

[![npm react](https://img.shields.io/npm/v/@dravensoft/arena-react?style=flat-square&color=c5a059&label=arena-react)](https://www.npmjs.com/package/@dravensoft/arena-react)
[![npm angular](https://img.shields.io/npm/v/@dravensoft/arena-angular?style=flat-square&color=c5a059&label=arena-angular)](https://www.npmjs.com/package/@dravensoft/arena-angular)
[![downloads](https://img.shields.io/npm/dm/@dravensoft/arena-react?style=flat-square&color=c5a059&label=downloads)](https://www.npmjs.com/package/@dravensoft/arena-react)
[![license](https://img.shields.io/npm/l/@dravensoft/arena-react?style=flat-square&color=c5a059)](./LICENSE)

MIT License · Token-driven design system for React, Angular and Tailwind.

## What you get

The same components under both framework names, rendering the same pixels, with
one shared Tailwind layer underneath. Every value they draw resolves through a
design token, so there is no hex and no bare pixel anywhere in a component.

**Arena carries the language and not the skin.** Your palettes and your fonts
arrive in an `arena.config.json` your project writes, and the `arena-to-prod`
command each package ships turns it into the one stylesheet a package cannot
carry. Nothing about Arena's own colours reaches your build.

## Why an agent can operate it

Every component's API and every accessibility pattern it binds is a contract
file rather than a paragraph, and a gate holds the code, the documentation and
the published packages to those contracts. An agent handed this repository does
not guess at Arena: it reads the contract that governs what it is about to
write, and the gate tells it when it got it wrong.

That is also what makes the rules enforceable rather than aspirational. Tokens
are the only styling layer, danger is an outline, one primary accent per view,
no gradients, no emoji, and icons are class-name strings. Each of those is
decided in [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md) and
handed to a builder by [`SKILL.md`](./SKILL.md).

## Install

```bash
bun add @dravensoft/arena-react     # or @dravensoft/arena-angular
bun add @phosphor-icons/web         # required: Arena renders icon class names, never SVG
```

Then write `arena.config.json`, run `bunx arena-to-prod`, and import what it
writes. [`frameworks/react/PACKAGE.md`](./frameworks/react/PACKAGE.md) and
[`frameworks/angular/PACKAGE.md`](./frameworks/angular/PACKAGE.md) are the whole
of it, and they are the pages npm shows.

### As a Claude Code plugin

```
/plugin marketplace add dravensoft-dev/arena
/plugin install arena@dravensoft
/reload-plugins
```

**Update**

```
/plugin marketplace update dravensoft   # refresh the catalog: learns a new version exists
/plugin update arena@dravensoft         # update the plugin you actually have
/reload-plugins                         # apply it to the running session
```

**A version means one commit.** Each release is served from its git tag, with
the marketplace entry pinning `source.ref` to `vX.Y.Z`.

### As a standalone Agent Skill

Hand any agent [`SKILL.md`](./SKILL.md). It is the router, and it answers each
question with one file.

**The packages work with this repository rather than instead of it.** Install
the plugin, or hand over the skill, and the agent gets the guidelines, the
contracts and every component's usage document, which is what turns "integrate
Arena" into a task it finishes on its own.

## See it

**[arena.dravensoft.org](https://arena.dravensoft.org)** carries the design
guidelines, the kitchen sink, and a playground page for every component, with no
clone and nothing to install.

The same pages come up locally with `bun run demos`, from the same list, and
[`scripts/build/AGENTS.md`](./scripts/build/AGENTS.md) says what a fresh clone
has to build before they mean anything.

## Dependencies

- **Fonts are self-hosted, and no CDN request is made.** Arena ships the Archivo
  / Familjen Grotesk / Spline Sans Mono `.woff2` binaries in `assets/fonts/`, and
  `contracts/design-generated/fonts.generated.css` declares them with
  `@font-face`, so they load from the same origin as the page that reads them. A
  package consumer names their own three families in `arena.config.json`, where
  `src` is either a stylesheet URL or a binary they host.
- **Icons are [Phosphor Icons](https://phosphoricons.com) (MIT)**, and are not
  bundled. **Install the official package by default**, either
  `@phosphor-icons/web` (webfont) or `@phosphor-icons/react`, for full weight and
  tree-shaking flexibility. The CDN is a prototype-only convenience, not the
  default. See [Iconography](./contracts/design/AGENTS.md#iconography).

## Which version am I getting

The two packages and the plugin do not always carry the same number, because a
package publishes only when something it ships changed.
[`.github/workflows/AGENTS.md`](./.github/workflows/AGENTS.md) explains what
that means for an upgrade.

## Latest project artifacts
- **Repo/Claude Code plugin**: 9.0.3
- [npm React package](https://www.npmjs.com/package/@dravensoft/arena-react?activeTab=versions)
- [npm Angular package](https://www.npmjs.com/package/@dravensoft/arena-angular?activeTab=versions)

## Where to go next

**Which job is this?** The two audiences read almost disjoint sets of these
files, and starting on the wrong branch is how a short question turns into a
long read.

**Building something with Arena.** [`SKILL.md`](./SKILL.md) is the router. From
it: [`frameworks/INDEX.md`](./frameworks/INDEX.md) is every component in one
read and `frameworks/<layer>/INDEX.md` is the same list under your own
framework's names, each component's `.prompt.md` is how to use that one, and
[`frameworks/react/PACKAGE.md`](./frameworks/react/PACKAGE.md) or
[`frameworks/angular/PACKAGE.md`](./frameworks/angular/PACKAGE.md) is how to
install it.

**Working on Arena itself.** [`AGENTS.md`](./AGENTS.md) is the root of that
branch, and everything below is reached through it.

- [`scripts/build/AGENTS.md`](./scripts/build/AGENTS.md): **compile Arena for the
  first time**, meaning what a machine has to already carry, what a fresh clone
  must build before `bun run demos` or `bun run check` mean anything, and why
  some generated files are tracked and some are not. Linux and macOS are the two
  supported platforms; on Windows the supported path is WSL2, with the clone in
  the Linux filesystem.
- [`frameworks/PACKAGING.md`](./frameworks/PACKAGING.md): the npm channel,
  meaning how the two packages are assembled from the tree in place, why a
  published Arena carries no skin, and what the consumer declares instead.
- [`contracts/AGENTS.md`](./contracts/AGENTS.md): Arena's three contract levels,
  and a map of everything in this repository.
- [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md): **the normative
  design specification**, covering voice, type, color, spacing, motion, the
  danger convention, iconography and theming.
  [`contracts/design/TokenTypes.md`](./contracts/design/TokenTypes.md) beside it
  carries the DTCG token type map, for whoever authors a token.
- [`frameworks/react/AGENTS.md`](./frameworks/react/AGENTS.md): the React layer.
- [`frameworks/angular/AGENTS.md`](./frameworks/angular/AGENTS.md): the Angular
  layer, including how to adopt it.
- [`frameworks/tailwind/AGENTS.md`](./frameworks/tailwind/AGENTS.md): the shared
  Tailwind layer.
- [`frameworks/demos/AGENTS.md`](./frameworks/demos/AGENTS.md): the fixture
  behind every component's playground page, which is the one part of that page
  anybody writes.
- [`DOUBTS.md`](./DOUBTS.md): what counts as a debt in Arena, and where the
  records live.

## Contributing and security

Arena takes issues. [`CONTRIBUTING.md`](./CONTRIBUTING.md) says what an issue is
for and which contributions are accepted, and [`SECURITY.md`](./SECURITY.md) is
where a vulnerability goes.

## About

Arena is the single interface language under which every Dravensoft software
product is built, published under the MIT License so that anyone else can build
under it too.
