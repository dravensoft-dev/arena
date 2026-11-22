# Before the first screen

This page is where a project settles what it looks like. The first node below splits the two ways
of arriving. A project with no `arena.config.json`, no style plugin and no screens is one where the
appearance is invented by whoever writes the first file. A project already carrying all three is
one where the appearance is context to acquire rather than to invent. **Read this before any other page this branch
routes you to**, because every one of them assumes the decisions below have been made.

**This page is a tree rather than a list.** Each node asks one question, and the table under it
says where each answer goes. Take the row your answer matches, go to the node it names, and read
nothing else. A node you did not reach holds a decision that is not yours to make yet, and reading
it early is how an agent answers a question nobody asked.

**Two rules hold at every node.** Write no file before the node that writes one. And where a row costs something, say that cost to the user in their own words and get an explicit
yes before going on. The cost is the concrete way that answer goes wrong, and a warning nobody
answered is a decision the agent made alone.

## 1. Does the project already carry Arena?

| The answer | Go to |
|---|---|
| Yes, it has an `arena.config.json` and screens built on it | 8 |
| No, or it has the package installed and nothing written against it | 2 |

## 2. Where does the appearance come from?

| The answer | Go to | What it costs you |
|---|---|---|
| A document stating the palette, the type and the roles | 5 | nothing, and this is the case the rest of this page exists to reach |
| A public URL to copy | 3, then 5 | every role that lives behind a state, and probably the register |
| A screenshot | 3, then 5 | every role outside the one polarity, density and state it caught |
| One of the registers Arena measured, picked rather than invented | 4 | the palette is still yours to state, and an entry is the fastest complete root plugin |
| Nothing yet | 3 | the whole interview, which is the honest price |

**A public site hides its own states.** Hover, focus, disabled, error, empty and loading are behind
interactions a reading never performs, so every role about a state is guessed rather than read. A
marketing page is also a different register from the product behind the login, and copying the first
gives the second a skin it was never designed to wear.

**A screenshot is one polarity, one density, one breakpoint and one state.** Worse, a colour read off
a pixel is the composite of a surface, an opacity level and whatever was laid over it. That composite enters the palette as a literal that no theme can move, and the second polarity
inherits it and is wrong.

Neither is a reason to stop; run node 3 first and show the user your conclusion before you
build on it.

## 3. The minimum interview

Five questions, and they cover the decisions
[`style-kernel.md`](./style-kernel.md) measured as the ones that separate one product from another.
Ask them one at a time. Which colour the TEXT takes is not among them, because eight unrelated
products answered that identically. The first question settles the page's surface, since it follows from what the screen is. That page's own table
is where both are.

| Ask | What the answer fixes |
|---|---|
| What is being built, and who works in it | the register, whether Arena's component list is the right one, and `aspect-media` and `fit-media` |
| Whose brand is this, which polarity leads, and which colour is the voice | the palettes in `arena.config.json`, both of them |
| Which three faces: display, body, mono | `fonts.display`, `fonts.body` and `fonts.mono` in `arena.config.json`, and the `ff-heading`, `ff-eyebrow` and `ff-label` roles that pick among them |
| What character does it have to the eye: soft, drawn, or flat | `r-*`, `bw-*`, `fw-*`, `tt-*` and `track-*`, `shadow-*`, `press-scale` and `lift-control` |
| How dense is it, and how wide does it breathe | `pad-control-*` and `gap-*`, `container-max`, `measure-prose`, `grid-min`, `gutter` |

The fourth is one question rather than four because those roles move together. A product is soft, or
drawn, or flat. A plugin that rounds the corners while keeping the hard border and the deep shadow
reads as two products sharing a screen.

| The answer | Go to |
|---|---|
| The user answers them, and takes no entry | 5 |
| The user answers them, and one entry's `Take this entry when` line fits the product | 4 |
| The user will not answer them | 4 |

## 4. Start from a register Arena measured

**Three arrivals reach this node.** One would rather pick than answer. One will not answer at all. One answered the interview and wants the fastest complete root plugin. Each is a real answer. The third keeps its answers, and they replace the entry's palette, fonts and any role the character or the air answered differently. Ask for one thing only: a short description of
the app, unless the answers gave it. Then match that description against the catalogue's index,
[`plugin-style-store/catalogue/INDEX.md`](../../../plugin-style-store/catalogue/INDEX.md), one row
per register measured on a real product, each with its own `ENTRY.md` and the files you copy.
Without a clone, fetch the index at `https://arena.dravensoft.org/plugin-style-store/catalogue/INDEX.md` and the entry files it links, or call `arena_read` on `arena://style/catalogue/INDEX.md` and on each entry's URI that the index links. The package does not carry them.

**Match on one line rather than on the entries themselves.** The index carries each entry's line
beginning `Take this entry when`, which says what that register is for in the terms a description
arrives in. Read that column, pick the row the description fits, and only then open that entry. Read
it, do not remember it.

**Name the entry you picked and what it decides, and wait.** Say which register it is, what it
answered for shape, air and depth, and what it leaves open. An entry chosen silently is the same
failure as a screenshot read silently, with a better result and the same missing consent.

**An entry is copied rather than cited.** An entry has three files: `plugin.tokens.json`, `plugin.css` and
`arena.config.json`. The first two become your project's own under `design/<name>/` as they are, and
node 12 is where they land. The config is a starting file for the root of your project. With no
`arena.config.json` there, copy it and replace the palette and the fonts. With one already there, replace its `stylePlugins` list with
the entry's and replace the palette and the fonts with the project's own, since a catalogue entry answers every role.
The config `arena init` writes holds `["default"]` and Dravensoft's palette and fonts.

**The catalogue is on the site and in the repository, not the package.** Each entry's files sit
beside its `ENTRY.md`.

| The answer | Go to | What it costs you |
|---|---|---|
| The user confirms an entry | 5 | the palette is still theirs to replace unless the interview gave it, and nothing else is settled |
| Nothing in the catalogue is close | 5 | the appearance Arena installs with, which every project on that step shares |

## 5. Write the identity document, and stop

Whatever route reached this node, the output is the same. The output is a page stating the palette
in both polarities, the three faces, the character, the air, the media shape and the page shape,
with the reason beside each. The document also lists the surfaces, the slots, the states, the language and the theme.
[`arena-from-scratch/identity.html`](../../../arena-from-scratch/identity.html) in a clone of the
Arena repository is the template, and
[`identity.example.html`](../../../arena-from-scratch/identity.example.html) beside it is one worked
answer to read first. Without a clone, fetch the template at
`https://arena.dravensoft.org/arena-from-scratch/identity.html` and the worked answer at
`https://arena.dravensoft.org/arena-from-scratch/identity.example.html`, or call `arena_read`, which [`mcp.md`](./mcp.md) describes, on
`arena://identity/identity.html` and on `arena://identity/identity.example.html`.

The output is a page rather than a list, because a palette described in prose is a palette nobody
can approve. Save the filled document as `design/identity.html` in the project, and serve it over HTTP with `npx serve design`, so the web fonts it names load. Show it to the user, and change what they change.

**The document is the template with every section kept and every dashed block replaced.** A page of prose in its place is not the document. [`arena check`](./cli.md) reports a `design/identity.html` that keeps a block or drops a section, as the `identity` kind.

**Then stop.** The next node writes files, and files written against an unapproved appearance are
the ones that get rewritten.

| The answer | Go to |
|---|---|
| The user approves the document | 6 |
| The user changes something | 5, again, until they stop |

## 6. The four decisions a project makes once

Each is settled before the first screen and never per screen. The four are in this order because each one asks about something the next one assumes.

| Ask | Read | Skip it when |
|---|---|---|
| What does Arena ship, and how much of it am I taking | [`surface.md`](./surface.md) | never, because the three below ask how much of a thing you have not been shown |
| Is Arena's component list right for this product | [`media-register.md`](./media-register.md) | the register is an application somebody works in and nothing on screen is a wall, a feed, a viewer or a document |
| How does it answer the kernel's roles | [`style-kernel.md`](./style-kernel.md) | node 8 found a plugin that already answers every role that carries no default |
| Does anybody outside it have to find it | [`seo.md`](./seo.md) | never, because a no that was never chosen is announced by nothing and reaches the install rather than a screen |

| You arrived from | Go to |
|---|---|
| 5, with the document approved | 7 |
| 8, a project already carrying Arena | 7 for the rows node 8 found unanswered only, then the last table of node 7 |

## 7. The decisions every screen inherits

A project decides each row below once, and every screen reads the answer without asking again. The first column says what the decision shapes on the finished screen, so the question means something before you put it. Ask the user in the second column's words, then read the page in the third.

| The decision, and what it shapes on screen | Ask | Read |
|---|---|---|
| **Colour slots.** A slot is one coloured part of one group of components in one state, answered with a role. The answers decide whether the brand appears once per screen or on every selected thing, and how an invalid field reads | Where does the brand go? How quiet is selection? How loud is an error? | [`color-slots.md`](./color-slots.md#which-plugin-answers): its two routes, then its common case |
| **Density.** Density is an axis apart from the plugin. `.arena-compact` and `.arena-comfortable` re-answer the control and row sizes only, and the second gives a 48px touch target. Either one is a class on an ancestor. Node 3's question set the plugin's padding and gaps, and this row sets the class | Who points at the product, and on what screen? Does the density change with the width? | [`style.md`](./style.md#density), then [`exports.md`](./exports.md#how-do-i-change-density-below-a-breakpoint) for a swap below a breakpoint |
| **Locale and `<html lang>`.** Arena's components draw words of their own, such as a close button's name, `Today` and a table's empty line, and the locale answers them. `<html lang>` tells a screen reader, the browser's translation and hyphenation which language the page is in, and Arena writes none | Which language does the product ship in? | [`locale.md`](./locale.md), and its section on [the document's language](./locale.md#which-language-does-the-document-declare) |
| **Palette switching.** Every palette is a class, and the default one reaches `:root`. A switch puts a class on `<html>`. A page that applies a stored choice after its stylesheet first paints the default, and that is the flash | Does the user switch? Which polarity does a first visit see? | [`theme.md`](./theme.md#how-do-i-avoid-a-flash-on-first-paint) and its two switch sections, [React](./theme.md#how-do-i-switch-palettes-in-react) and [Angular](./theme.md#how-do-i-switch-palettes-in-angular) |
| **The page skeleton.** The frame every screen sits in is the skip link, the app bar, the side navigation, the main region and the footer, each a landmark. Arena ships the pieces and no shape | Which pieces does the frame carry? Where does the navigation live? | [`shell.md`](./shell.md) |

The answers join the sections of the identity document that carry the same names.

| You arrived with | Go to |
|---|---|
| No Arena in the project yet | 9 |
| A project from node 8 | the per-screen route in [`../SKILL.md`](../SKILL.md), or 9 only when this screen is the first that has to be found from outside the product |

## 8. Read what is already there

An identity somebody already established is context to acquire, not a step to skip. Before adding
anything:

- Read `arena.config.json`. The file names the palettes, the leading polarity, the fonts and the
  plugin that comes first. That first plugin is the root and answers every role that carries no default.
- Read the project's own `plugin.tokens.json`: which roles it answers and with what. A role it does
  not answer is a property that disappears rather than a plainer look.
- Read its `plugin.css`, if it has one, to see which decisions the project paints by hand. Those decisions are the ones no role reaches, and they are the ones your new screen has to
  keep.
- Read the density class, the locale, the `lang`, the first-paint snippet and the frame the project already sets, and the slots its plugin answers.
- Run `arena audit` and report what it names before you write anything. The audit reads the project's own sources and its declared plugin directories for the rules a
  source text can show.

Say what you found. A project whose plugin answers every role that carries no default needs no style plugin work, and
saying so is what stops an agent rewriting an appearance somebody already chose.

Then go to 6, and skip the rows it says you may skip. The last table of node 6 sends a project carrying Arena on from there.

## 9. How much does it have to be found?

Node 6 answered whether anybody outside the product has to arrive at it. This asks how much, and it
is a separate question because the answer decides a layer and a peer dependency rather than a
screen. **Both layers draw the same components; only one of them writes the document `<head>`.**

| The answer | Go to | What it takes |
|---|---|---|
| Nothing. The product is behind a login, or it is a console | 10 | neither layer, and no metadata anything. That row is the honest answer for most tools |
| A title and a description per route | 10 | either layer. Angular has it in the package; React carries it through whatever its own framework offers |
| Everything: canonical, `og:*`, a default that keeps a route out of an index until it says otherwise | 10 | on Angular, `@dravensoft/arena-angular/metadata`, where `@angular/router` stops being optional; on React, your own framework's head, since Arena writes none there |

**The third row is a decision about the framework, and it is worth making while it is still cheap.**
`@dravensoft/arena-react` writes no `<head>` at all, by design, so a React project answering that
way carries the whole of it itself. The Angular entry point is a second one, apart from the one components come from, and reaching it
is what pulls the router in. The router is declared an optional peer for exactly that reason, so a
project that never reaches for metadata never installs one it does not use.

[`seo.md`](./seo.md) is where the three properties behind that third row are written down, and
node 6 sends every project there whatever it answered here. Sending every project there is not a contradiction with this node. A no
reached by choosing is a decision the project can defend later, and a no reached by never asking
is announced by nothing. Read it on the third row to learn what you are taking on,
and on the first to learn what you are declining.

## 10. What is it built on?

**Arena takes no position on how an application is assembled**, and that is a real property rather
than a slogan. The React layer imports `react`, `react-dom` and its own two bundled styling
utilities, and nothing else. Neither layer ships a router, a store or an application shell. What follows is
what that buys per architecture, and where it stops.

| The answer | Go to | What is true, and what you carry |
|---|---|---|
| A single-page application | 11 | the ordinary case, and everything below is a variation on it |
| Server rendering with hydration | 11 | supported. React's own suites server-render, and neither layer reads a browser global at module scope |
| Static generation or prerender | 11 | the components take the same path they take under server rendering. Arena ships no prerender tooling, so producing the pages is your framework's job |
| React Server Components | 11 | **Arena ships no `use client` directive**, so the boundary is yours to draw, and it is one line |
| A microfrontend inside a host | 11 | the components are safe; the stylesheet is document-wide. Read the paragraph below before choosing this |

**Server rendering is the claim with the most evidence behind it.** Much of the React suite renders
through `react-dom/server` on every run, so the layer is exercised rather than merely believed.
There is no `useLayoutEffect` anywhere in it, and the only module-scope touch of `document` sits
behind a `typeof document === 'undefined'` guard. Angular reaches the document through the injected
token rather than the global, and its two measurements run after render, which is the same
property arrived at by a different route. One honest asymmetry is worth
naming. React's server rendering is held by a suite and Angular's is held by its code. The second is the
one to smoke-test first in a project that depends on it.

**One hydration behaviour is worth knowing**, since nothing reports it. The viewport measurement
answers false on a server, so a component branching on it renders its wide branch into the HTML
and corrects after hydration. Branch on a container rather than the viewport where the difference would be seen.

**React Server Components need one line from you.** Arena's components use hooks, and no file in the
package carries `'use client'`, so importing one directly into a server component fails. Put the directive at the top of your own module that imports Arena. The boundary is then drawn
where you meant it, which is better than the package drawing it for you at every leaf.

**A microfrontend is the one where the answer is split.** The JavaScript is genuinely
architecture-neutral. The stylesheet is not. The tokens are declared on `:root`, and the reset
sets the box model on `*` and a line height on `html`. Loading Arena inside a host page changes that page and not only
your subtree. Two different Arena versions on one document collide on `:root`, and
the last stylesheet loaded wins. One thing works in your favour. Every palette
emits as a plain class, and `ArenaPaletteScope` puts one on your own subtree, so the fragment can carry its own theme without touching the
host. Take this row knowing the host is being changed, or give the fragment a document of its own.

**Which bundler, and where Arena's JavaScript and stylesheet land.** [`bundlers/index.md`](./bundlers/index.md) says how to keep Arena's JS and package sheet in files of their own, with one page per bundler family. [`environments.md`](./environments.md) holds what each bundler measured, as a record and not a recommendation.

## 11. What does the code you write around Arena bring with it?

Arena's components carry their own appearance, so this node is about everything else a project
writes: its own markup, and on Angular its forms. **Take every row that is true**, then go to 12.

| If your code | Take | What it gets you |
|---|---|---|
| draws markup of its own with Tailwind v4 | Arena's `@layer` order statement from [`install.md`](./install.md), then `@import 'tailwindcss';` and `@import '@dravensoft/arena-<layer>/css/tailwind-theme.css';`. Declare a key of your own below that import, never above it | every utility resolves to Arena's scale and none to Tailwind's defaults. Arena's own utilities work by name: `case-eyebrow`, `case-label`, `fit-media` and the ones its components animate with. The air between components is `gap-group`, `gap-component` and `gap-section` |
| draws markup of its own, styled with CSS of its own | the tokens through `var()`, and the vocabulary page for the air between components. `.arena-stack` has `arena-stack--group` and `arena-stack--section` for the step and `arena-stack--start` and `arena-stack--end` for the alignment alone. `.arena-row` has `arena-row--component` for the step and `arena-row--baseline`, `arena-row--between` and `arena-row--start` for the alignment alone | the lengths and the air the components are spaced with, as named steps rather than a number you pick |
| is an Angular project binding Arena's controls with `@angular/forms` | `@dravensoft/arena-angular/forms`, and `ARENA_FORM_CONTROLS` in the component's `imports` | `formControlName` and `ngModel` on every data-entry control. Reaching that entry point makes `@angular/forms` required |

## 12. Now write it

**What the answers made necessary.** Nothing here is a preference, and no further question about
dependencies is the skill's to ask: past this table the stack is the project's own.

| Always | Which layer | Why |
|---|---|---|
| `@dravensoft/arena-react` **or** `@dravensoft/arena-angular` | one of them, never both | the layer nodes 9 and 10 settled. The package is Arena itself. Every package its components load is a peer, and a list of peers with the package missing installs nothing that draws |
| `@angular/cdk` | Angular only | a peer of that layer, and **not** something a React project installs |
| `@angular/core`, `@angular/common`, `@angular/platform-browser` | Angular only | the peers the layer is built on |
| `react`, `react-dom` | React only | the peers that layer is built on |

| Added by an answer | When | From which node |
|---|---|---|
| `@angular/router` | the third row of node 9, on Angular | the router is an optional peer until the metadata entry point is reached, and reaching that entry point makes it required |
| `@angular/forms` | the third row of node 11 | an optional peer until the forms entry point is reached, like the router above it |

**Any of npm, bun or pnpm installs this.** The packages declare their peers rather than assuming a
flat tree. The strict layout of pnpm is the one worth naming, because it is the one that would
break a package that assumed otherwise. Installed under pnpm, `arena build` resolves the three packages
it reads at build ([`install.md`](./install.md) names them) through the symlinked store. Nothing here needs a hoisting flag.

Then, in this order, because each file is read by the next.

- [`arena.config.json`](./config.md), with both palettes, the three font slots, and `stylePlugins` naming the
  directory the next two bullets write, as `["./design/<name>"]`. **A plugin the config never
  names is a plugin nothing loads**, and nothing reports it: the build succeeds and the product
  wears the answers Arena installs with, which are Dravensoft's. `["default"]`, or leaving the key out, is that same appearance chosen on purpose rather than
  by omission. That answer is a finished one for a first screen, or for a tool nobody
  outside the team looks at.
- `design/<name>/plugin.tokens.json`, answering every role that carries no default. Shapes first, then space, then weight,
  then depth. Leave the ink roles and the four quiet edges at the answers
  [`style-kernel.md`](./style-kernel.md#where-the-appearance-actually-comes-from) reports eight products converged on. Answer the surface fills and the control edges from the page shape the identity document settled.
- The slot answers node 7 settled go in the same `plugin.tokens.json`, or in a later plugin as the first route of [`color-slots.md`](./color-slots.md#which-plugin-answers) says.
- `design/<name>/plugin.css`, only for a decision no role reaches.
- Run [`arena build`](./cli.md). The command writes the package sheet, the theme sheet and, when a style plugin of yours carries CSS,
  the plugin sheet. The command also writes the icon sprite for the glyphs your screens draw, with its module, and the local font cuts. [`install.md`](./install.md)
  gives the order to import them in.
- Then the first screen, through the per-screen route in [`../SKILL.md`](../SKILL.md).

**A catalogue entry from node 4 answers part of this list.** The entry's `plugin.tokens.json` and
`plugin.css` are the second and third bullets, copied as they are. The entry's `arena.config.json`
is the starting file of the first bullet. With no config in the project, copy it and replace the
palette and the fonts. With one already there, replace its `stylePlugins` list with the entry's and
replace the palette and the fonts with the project's own, since a catalogue entry answers every role.
The config `arena init` writes holds `["default"]` and Dravensoft's palette and fonts.

The identity document from node 5 is what each of these is checked against, and it stays in the
project. The next agent to open the project starts at node 2 with the good answer instead of at
node 3.
