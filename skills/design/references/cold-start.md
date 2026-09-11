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
| Yes, it has an `arena.config.json` and screens built on it | 7 |
| No, or it has the package installed and nothing written against it | 2 |

## 2. Where does the appearance come from?

| The answer | Go to | What it costs you |
|---|---|---|
| A document stating the palette, the type and the roles | 5 | nothing, and this is the case the rest of this page exists to reach |
| A public URL to copy | 3, then 5 | every role that lives behind a state, and probably the register |
| A screenshot | 3, then 5 | every role outside the one polarity, density and state it caught |
| One of the registers Arena measured, picked rather than invented | 4 | the palette is still yours to state, and nothing else about the product is settled |
| Nothing yet | 3 | the whole interview, which is the honest price |

**A public site hides its own states.** Hover, focus, disabled, error, empty and loading are behind
interactions a reading never performs, so every role about a state is guessed rather than read. A
marketing page is also a different register from the product behind the login, and copying the first
gives the second a skin it was never designed to wear.

**A screenshot is one polarity, one density, one breakpoint and one state.** Worse, a colour read off
a pixel is the composite of a surface, an opacity level and whatever was laid over it. That composite enters the palette as a literal that no theme can move, and the second polarity
inherits it and is wrong.

Neither is a reason to stop. Both are reasons to run node 3 first and to show the user what you
concluded before you build on it.

## 3. The minimum interview

Five questions, and they cover the decisions
[`style-kernel.md`](./style-kernel.md) measured as the ones that separate one product from another.
Ask them one at a time. Which colour the TEXT takes is not among them, because eight unrelated
products answered that identically. Which surface the page takes is settled by the first question
rather than by a sixth of its own, since it follows from what the screen is. That page's own table
is where both are.

| Ask | What the answer fixes |
|---|---|
| What is being built, and who works in it | the register, whether Arena's component list is the right one, and `aspect-media` and `fit-media` |
| Whose brand is this, which polarity leads, and which colour is the voice | the palettes in `arena.config.json`, both of them |
| Which three faces: display, body, mono | `ff-heading`, `ff-body`, `ff-mono` |
| What character does it have to the eye: soft, drawn, or flat | `r-*`, `bw-*`, `fw-*`, `tt-*` and `track-*`, `shadow-*`, `press-scale` and `lift-control` |
| How dense is it, and how wide does it breathe | `pad-control-*` and `gap-*`, `container-max`, `measure-prose`, `grid-min`, `gutter` |

The fourth is one question rather than four because those roles move together. A product is soft, or
drawn, or flat. A plugin that rounds the corners while keeping the hard border and the deep shadow
reads as two products sharing a screen.

| The answer | Go to |
|---|---|
| The user answers them | 5 |
| The user will not answer them | 4 |

## 4. Start from a register Arena measured

**Two arrivals reach this node**, one that would rather pick than answer and one that will not
answer at all, and it is a real answer to both. Ask for one thing only: a short description of
the app. Then match that description against the catalogue in `plugin-style-store/catalogue/`,
where each directory is a register measured on a real product and carrying its own `ENTRY.md`.

**Match on one line rather than on the entries themselves.** Every `ENTRY.md` carries a line
beginning `Take this entry when`, which says what that register is for in the terms a description
arrives in. Read those lines, pick the one the description fits, and only then open that entry. Read
it, do not remember it.

**Name the entry you picked and what it decides, and wait.** Say which register it is, what it
answered for shape, air and depth, and what it leaves open. An entry chosen silently is the same
failure as a screenshot read silently, with a better result and the same missing consent.

**An entry is copied rather than cited.** The entry's `plugin.tokens.json` and `plugin.css` become
your project's own under `design/<name>/`, and node 11 is where they land.

**The catalogue is in the Arena repository rather than in the package.** From an installed project,
read it there.

| The answer | Go to | What it costs you |
|---|---|---|
| The user confirms an entry | 5 | the palette is still theirs to replace, and nothing else is settled |
| Nothing in the catalogue is close | 5 | the appearance Arena installs with, which every project on that step shares |

## 5. Write the identity document, and stop

Whatever route reached this node, the output is the same. The output is a page stating the palette in both polarities, the three faces, the character, the
air, the media shape and the page shape, with the reason beside each. `arena-from-scratch/identity.html` in the Arena repository is the template, and
`arena-from-scratch/identity.example.html` beside it is one worked answer to read first.

The output is a page rather than a list, because a palette described in prose is a palette nobody
can approve. Serve it over HTTP, show it to the user, and change what they change.

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
| How does it answer the kernel's roles | [`style-kernel.md`](./style-kernel.md) | node 7 found a plugin that already answers every role |
| Does anybody outside it have to find it | [`seo.md`](./seo.md) | never, because a no that was never chosen is announced by nothing and reaches the install rather than a screen |

Then go to 8, because the last of those four is a yes or a no and the next node is how much.

## 7. Read what is already there

An identity somebody already established is context to acquire, not a step to skip. Before adding
anything:

- Read `arena.config.json`. The file names the palettes, the leading polarity, the fonts and the
  plugin that comes first. That first plugin is the root and answers every role.
- Read the project's own `plugin.tokens.json`: which roles it answers and with what. A role it does
  not answer is a property that disappears rather than a plainer look.
- Read its `plugin.css`, if it has one, to see which decisions the project paints by hand. Those decisions are the ones no role reaches, and they are the ones your new screen has to
  keep.
- Run `arena-to-prod --audit` and report what it names before you write anything. The audit reads the project's own sources and its declared plugin directories for the rules a
  source text can show.

Say what you found. A project whose plugin answers every role needs no style plugin work, and
saying so is what stops an agent rewriting an appearance somebody already chose.

Then go to 6, and skip the rows it says you may skip. **Stop there rather than going on to 8**,
because the nodes past it decide an install a project carrying Arena has already made. The route
from here is the per-screen one in [`../SKILL.md`](../SKILL.md). Reach 8 only when this screen is
the first that has to be found from outside the product.

## 8. How much does it have to be found?

Node 6 answered whether anybody outside the product has to arrive at it. This asks how much, and it
is a separate question because the answer decides a layer and a peer dependency rather than a
screen. **Both layers draw the same components; only one of them writes the document `<head>`.**

| The answer | Go to | What it takes |
|---|---|---|
| Nothing. The product is behind a login, or it is a console | 9 | neither layer, and no metadata anything. That row is the honest answer for most tools |
| A title and a description per route | 9 | either layer. Angular has it in the package; React carries it through whatever its own framework offers |
| Everything: canonical, `og:*`, a default that keeps a route out of an index until it says otherwise | 9 | on Angular, `@dravensoft/arena-angular/metadata`, where `@angular/router` stops being optional; on React, your own framework's head, since Arena writes none there |

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

## 9. What is it built on?

**Arena takes no position on how an application is assembled**, and that is a real property rather
than a slogan. The React layer imports `react`, `react-dom` and its own two bundled styling
utilities, and nothing else. Neither layer ships a router, a store or an application shell. What follows is
what that buys per architecture, and where it stops.

| The answer | Go to | What is true, and what you carry |
|---|---|---|
| A single-page application | 10 | the ordinary case, and everything below is a variation on it |
| Server rendering with hydration | 10 | supported. React's own suites server-render, and neither layer reads a browser global at module scope |
| Static generation or prerender | 10 | the components take the same path they take under server rendering. Arena ships no prerender tooling, so producing the pages is your framework's job |
| React Server Components | 10 | **Arena ships no `use client` directive**, so the boundary is yours to draw, and it is one line |
| A microfrontend inside a host | 10 | the components are safe; the stylesheet is document-wide. Read the paragraph below before choosing this |

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
the last stylesheet loaded wins. One thing works in your favour. A palette other than the
default emits as a plain class, so your own subtree can carry its own theme without touching the
host. Take this row knowing the host is being changed, or give the fragment a document of its own.

## 10. What does the code you write around Arena bring with it?

Arena's components carry their own appearance, so this node is about everything else a project
writes: its own markup, and on Angular its forms. **Take every row that is true**, then go to 11.

| If your code | Take | What it gets you |
|---|---|---|
| draws markup of its own with Tailwind v4 | `@import 'tailwindcss';` and then `@import '@dravensoft/arena-<layer>/css/tailwind-theme.css';`. Declare a key of your own below that import, never above it | every utility resolves to Arena's scale and none to Tailwind's defaults. Arena's own utilities work by name: `case-eyebrow`, `case-label`, `fit-media` and the ones its components animate with. The air between components is `gap-group`, `gap-component` and `gap-section` |
| draws markup of its own, styled with CSS of its own | the tokens through `var()`, and `css/rhythm.css` for the air between components: `.arena-stack` and `.arena-row`, with `--group` and `--section` for the steps either side | the lengths and the air the components are spaced with, as named steps rather than a number you pick |
| is an Angular project binding Arena's controls with `@angular/forms` | `@dravensoft/arena-angular/forms`, and `ARENA_FORM_CONTROLS` in the component's `imports` | `formControlName` and `ngModel` on every data-entry control. Reaching that entry point makes `@angular/forms` required |

## 11. Now write it

**What the answers made necessary.** Nothing here is a preference, and no further question about
dependencies is the skill's to ask: past this table the stack is the project's own.

| Always | Which layer | Why |
|---|---|---|
| `@dravensoft/arena-react` **or** `@dravensoft/arena-angular` | one of them, never both | the layer nodes 8 and 9 settled. The package is Arena itself. Everything under it is a peer, and a list of peers with the package missing installs nothing that draws |
| `@phosphor-icons/web` | both | icons are class-name strings a component renders, and the font is never bundled |
| `@angular/cdk` | Angular only | a peer of that layer, and **not** something a React project installs |
| `@angular/core`, `@angular/common`, `@angular/platform-browser` | Angular only | the peers the layer is built on |
| `react`, `react-dom` | React only | the peers that layer is built on |

| Added by an answer | When | From which node |
|---|---|---|
| `@angular/router` | the third row of node 8, on Angular | the router is an optional peer until the metadata entry point is reached, and reaching that entry point makes it required |
| `@angular/forms` | the second row of node 10 | an optional peer until the forms entry point is reached, like the router above it |

**Any of npm, bun or pnpm installs this.** The packages declare their peers rather than assuming a
flat tree. The strict layout of pnpm is the one worth naming, because it is the one that would
break a package that assumed otherwise. Installed under pnpm, the command below resolves the icon
font through the symlinked store and writes both stylesheets. Nothing here needs a hoisting flag.

Then, in this order, because each file is read by the next.

- `arena.config.json`, with both palettes, the three font slots, and `stylePlugins` naming the
  directory the next two bullets write, as `["./design/<name>"]`. **A plugin the config never
  names is a plugin nothing loads**, and nothing reports it: the build succeeds and the product
  wears the answers Arena installs with, which are Dravensoft's. `["default"]`, or leaving the key out, is that same appearance chosen on purpose rather than
  by omission. That answer is a finished one for a first screen, or for a tool nobody
  outside the team looks at.
- `design/<name>/plugin.tokens.json`, answering every role. Shapes first, then space, then weight,
  then depth, and leave the colour roles at the answers
  [`style-kernel.md`](./style-kernel.md) reports eight products converged on.
- `design/<name>/plugin.css`, only for a decision no role reaches.
- Run `arena-to-prod`, which writes the stylesheet no package can carry and subsets the icon font
  to the glyphs your screens draw. Import what it wrote.
- Then the first screen, through the per-screen route in [`../SKILL.md`](../SKILL.md).

The identity document from node 5 is what each of these is checked against, and it stays in the
project. The next agent to open the project starts at node 2 with the good answer instead of at
node 3.
