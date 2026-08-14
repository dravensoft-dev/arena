# Arena, a design system consumable by AI agents via repo & npm packages

[![npm react](https://img.shields.io/npm/v/@dravensoft/arena-react?style=flat-square&color=c5a059&label=arena-react)](https://www.npmjs.com/package/@dravensoft/arena-react)
[![npm angular](https://img.shields.io/npm/v/@dravensoft/arena-angular?style=flat-square&color=c5a059&label=arena-angular)](https://www.npmjs.com/package/@dravensoft/arena-angular)
[![downloads](https://img.shields.io/npm/dm/@dravensoft/arena-react?style=flat-square&color=c5a059&label=downloads)](https://www.npmjs.com/package/@dravensoft/arena-react)
[![license](https://img.shields.io/npm/l/@dravensoft/arena-react?style=flat-square&color=c5a059)](./LICENSE)

MIT License · Token-driven design system for React, Angular and Tailwind.

**Arena** is the single interface language under which every Dravensoft software product is built.

**It is built to be operated by an agent.** Every value traces to a design token, every
component's API and every accessibility pattern it binds is a contract file rather than a
paragraph, and a gate holds the code, the documentation and the published packages to those
contracts. An agent handed this repository does not guess at Arena: it reads the contract that
governs what it is about to write, and the gate tells it when it got it wrong.

**Three ways to take it**, and they compose: an npm package for React or for Angular, a Claude
Code plugin, and a standalone Agent Skill in [`SKILL.md`](./SKILL.md) that any agent can read.

## Latest project artifacts
- **Repo/Claude Code plugin**: 9.0.0
- [npm React package](https://www.npmjs.com/package/@dravensoft/arena-react?activeTab=versions)
- [npm Angular package](https://www.npmjs.com/package/@dravensoft/arena-angular?activeTab=versions)

## Getting started
Arena ships three ways: as a **Claude Code plugin**, as two **npm packages**, and as a downloadable **Agent Skill** (`SKILL.md`).

### Install as a Claude Code plugin
Inside Claude Code, add the marketplace and install the plugin:

```
/plugin marketplace add dravensoft-dev/arena
/plugin install arena@dravensoft
/reload-plugins
```
**Update plugin**
```
/plugin marketplace update dravensoft   # refresh the catalog: learns a new version exists
/plugin update arena@dravensoft         # update the plugin you actually have
/reload-plugins                         # apply it to the running session
```
**A version means one commit.** Each release is served from its git tag, with the marketplace entry pinning `source.ref` to `vX.Y.Z`.

### Install from npm

```bash
bun add @dravensoft/arena-react     # or @dravensoft/arena-angular
bun add @phosphor-icons/web         # required: Arena renders icon class names, never SVG
```
**The package carries the language and not the skin.** For more info, read `frameworks/<framework>/PACKAGE.md`

**These packages work with this repository rather than instead of it.** Install the plugin above, or hand any other agent `SKILL.md`, and the agent gets the guidelines, the contracts and every component's usage document, which is what turns "integrate Arena" into a task it finishes on its own.

[`frameworks/PACKAGING.md`](./frameworks/PACKAGING.md) is how the packages are built, what they exclude and why, and what `check:packages` holds.

### Dependencies
- **Fonts are self-hosted, and no CDN request is made.** Arena ships the Archivo / Familjen Grotesk / Spline Sans Mono `.woff2` binaries in `assets/fonts/`, and `contracts/design-generated/fonts.generated.css` declares them with `@font-face`, so they load from the same origin as the page that reads them. A package consumer names their own three families in `arena.config.json`, where `src` is either a stylesheet URL or a binary they host.
- **Icons are [Phosphor Icons](https://phosphoricons.com) (MIT)**, and are not bundled. **Install the official package by default**, either `@phosphor-icons/web` (webfont) or `@phosphor-icons/react`, for full weight and tree-shaking flexibility. The CDN is a prototype-only convenience, not the default. See [Iconography](./contracts/design/AGENTS.md#iconography).

## Where to go next

**Which job is this?** The two audiences read almost disjoint sets of these files, and
starting on the wrong branch is how a short question turns into a long read.

**Building something with Arena.** [`SKILL.md`](./SKILL.md) is the router, and it answers
each question with one file. From it:
[`frameworks/SKILL.md`](./frameworks/SKILL.md) is every component in one read and
`frameworks/<layer>/SKILL.md` is the same list under your own framework's names, each
component's `.prompt.md` is how to use that one, and
[`frameworks/react/PACKAGE.md`](./frameworks/react/PACKAGE.md) or
[`frameworks/angular/PACKAGE.md`](./frameworks/angular/PACKAGE.md) is how to install it.

**Working on Arena itself.** [`AGENTS.md`](./AGENTS.md) is the root of that branch, and
everything below is reached through it.

- [`scripts/build/AGENTS.md`](./scripts/build/AGENTS.md): **compile Arena for the first
  time**, meaning what a machine has to already carry, what a fresh clone must build before
  `bun run demos` or `bun run check` mean anything, and why some generated files are tracked
  and some are not. Linux and macOS are the two supported platforms; on Windows the supported
  path is WSL2, with the clone in the Linux filesystem.
- [`frameworks/PACKAGING.md`](./frameworks/PACKAGING.md): the npm channel, meaning how the
  two packages are assembled from the tree in place, why a published Arena carries no skin,
  and what the consumer declares instead.
- [`contracts/AGENTS.md`](./contracts/AGENTS.md): Arena's three contract levels, and a
  map of everything in this repository.
- [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md): **the normative design
  specification**, covering voice, type, color, spacing, motion, the danger convention,
  iconography and theming. [`contracts/design/TokenTypes.md`](./contracts/design/TokenTypes.md)
  beside it carries the DTCG token type map, for whoever authors a token.
- [`frameworks/react/AGENTS.md`](./frameworks/react/AGENTS.md): the React layer.
- [`frameworks/angular/AGENTS.md`](./frameworks/angular/AGENTS.md): the Angular layer,
  including how to adopt it.
- [`frameworks/tailwind/AGENTS.md`](./frameworks/tailwind/AGENTS.md): the shared
  Tailwind layer.
- [`frameworks/demos/AGENTS.md`](./frameworks/demos/AGENTS.md): the fixture behind every
  component's playground page, which is the one part of that page anybody writes.
- [`DOUBTS.md`](./DOUBTS.md): what counts as a debt in Arena, and where the records live.
