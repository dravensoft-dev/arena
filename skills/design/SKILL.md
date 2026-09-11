---
name: design
license: MIT
description: "Use this skill to build user interfaces with Arena, a token-driven design system with React and Angular component libraries on a shared Tailwind layer, for production screens or for throwaway prototypes and mocks. Covers design tokens, colour, type, spacing, motion, iconography, and the accessibility pattern each component binds. Arena carries the design language and not the skin: it ships Dravensoft's palette and fonts, and any project declares its own in arena.config.json and answers the kernel's style roles with a style plugin of its own."
metadata:
  homepage: https://arena.dravensoft.org
---

# Arena

Arena is Dravensoft's design language: a token layer, React and Angular component libraries built
on that layer, and a shared Tailwind layer. Arena's identity is warm black under bone text, with
crimson as the voice and gold as distinction.

**Arena is a product-application library.** Arena ships tables, forms, navigation, dialogs,
charts, cards and the states around them, which is the furniture of an application somebody works
in. A
media or a consumer product is a different register. A photo wall, a feed of posts, a document
editor or a game map is markup you write yourself. The skin travels either way, because a style
plugin answers every role whatever the product is. **When that is your product**, or one screen of
it, read [`references/media-register.md`](./references/media-register.md). That page is what Arena
hands you instead of a component: the pattern your markup binds, the parts the package already
ships for it, and the one rule that bends.

**This file routes. Read only what your task needs.** The rules below bind the code you write.
The table under them routes. Read the rules once per project rather than once per screen.

## Which job is this?

**Building something with Arena**, meaning a screen, a prototype, a skin or an integration: stay
here and follow the table below. **On a project you have not walked yet**, start at
[`references/cold-start.md`](./references/cold-start.md) instead. That page's first question is
whether the project already carries Arena. A project that does gets a short walk, which reads the config
and the style plugin already there. A project that does not gets the only page that asks what this
product looks like before anything answers.

**Changing Arena itself**, meaning adding a component, moving a token, or editing a contract or a
gate: read [`AGENTS.md`](https://github.com/dravensoft-dev/arena/blob/main/AGENTS.md) instead.
That file is the root of the other branch and this file is not. `AGENTS.md` is named by URL
because that branch belongs to the repository and reaches nothing a package or this site
carries.

**A value you answer is not a value you move**, and that is what decides the branch when the job
is an appearance. A role your project fills belongs to this branch, whatever it paints. A scale
step every product reads belongs to the other branch. The type ladder and the page rhythm ladder
are the exceptions.

**Every path here outside `references/` is a repository path.** A clone carries it. So does the
plugin, and so does the corpus `@dravensoft/arena-mcp` serves. Read the path on the repository
above when you have none of the three.

**Everything here is one component at a time.**

## In this order

**Settle what this product is and what it looks like before the first screen**, once per project
rather than once per screen. A screen written ahead of those decisions is written against
decisions nobody made. [`references/cold-start.md`](./references/cold-start.md) is where that
happens, and that page is a tree rather than a list. The tree's branches reach the four decisions
a project settles once. Three more branches reach past them. One is the interview that comes
first when there is no appearance to read. One is the catalogue of measured style plugins a
project can start from instead. One is the identity document every branch converges on before a
file is written. Two questions on the
tree decide an install rather than a screen: how much of the product has to be found from outside
it, and what it is assembled on. The tree's last node derives the dependency list from those two
answers, so nothing has to be guessed at install time.

Then, per screen:

1. **`frameworks/<layer>/INDEX.md`**: the directory of your framework's components, naming every
   one under the category it is filed under. Read your layer's index and no other. The page is
   short because it describes nothing. The page names the category that holds what you are
   reaching for.
2. **`frameworks/<layer>/components/<category>/INDEX.md`**, linked from there: every component in
   that category under the names the layer binds them to, with what each one is and what it takes.
   Each row links its own prompt. Read the categories you are reaching into and no others. A screen
   of any size reaches into two or three, and the saving is the four you skip.
3. **The component's own `.prompt.md`**, linked from that index: its members as a table, its
   examples and its Do and Don't. Read one per component you actually write, and no more.

[`frameworks/INDEX.md`](../../frameworks/INDEX.md) is the layer-neutral index beside those three.
That index answers the one question your layer's index cannot, and the table below routes that
question. Skip the layer-neutral index when you already know what you are reaching for.

A prompt states every member's type and default. So `contracts/api/components/<Name>.json` is
only for the reasoning behind a member, and you will rarely need it.

## The rules, and they are not style preferences

<!-- @language GENERATED by bun run generate:rules. Edit scripts/lib/arena/language-rules.ts, not this copy. -->

Every rule below is a rule of the language and not a preference. **`arena-to-prod --audit` reads
your own sources and reports the ones marked below.** It reports rather than fails, so add
`--strict=audit` where a finding should stop the run. Nothing reads your application for the
unmarked ones, and those hold because you hold them. The full record, with the reason each
unmarked rule is one a source text cannot show, is `arena://rules` on the MCP server.

- **Tokens are the only styling layer.** A raw colour is a bug, and so is a bare `16px`. A hex, a
  channel triple in `rgb()` or `oklch()`, and a colour's own name are the same defect written
  three ways. Read a value through its custom property, as `var(--crimson)` or `var(--sp-4)`.
  Derive one with `calc()` or `clamp()` over a token, or mix one with `color-mix()` over a token.
  **`--audit` reports this one.**
- **Put no class of your own on an Arena component.** Write no rule targeting one either. A
  component renders `arena-<component>__<slot>` class names, so a rule of yours reaches one by
  specificity. The name reads like a surface somebody meant you to target and it is not one: it is
  compiler output, no contract names it, and a slot may be renamed in any release. Content you
  draw yourself is yours, styled through the same tokens. **`--audit` reports this one.**
- **Danger is outline, never filled.** The background stays transparent, and the border and the
  content read `--danger`. Arena draws one filled danger surface, and it is the final irreversible
  confirmation inside `ArenaConfirmDialog`. A surface of your own may carry the `--danger-soft`
  tint. **`--audit` reports this one.**
- **One primary accent per view.** Crimson is the voice, so at most one `variant="primary"` action
  stands on a screen. Gold is distinction and focus, and never a second primary. **`--audit`
  reports this one.**
- **No gradients, on any surface.** Depth comes from the `base-100` to `base-200` to `base-300`
  surface scale, the hairline border and the warm shadow. `ArenaSkeleton`'s neutral shimmer is the
  one exception. **`--audit` reports this one.**
- **No emoji, in product or in copy.** **`--audit` reports this one.**
- **Icons are Phosphor class-name strings, never elements and never SVG.** Write `icon="ph-bold
  ph-plus"`. Install `@phosphor-icons/web`, because Arena never bundles it. **`--audit` reports
  this one.**
- **Never wrap an Arena component in your router's own link.** That nests an anchor inside an
  anchor, and in Angular it does not bind at all. Pass the href to the component and route from
  the event it reports. The members that take one are `ArenaCard.href`, `ArenaCommand.route`,
  `ArenaCrumb.href` and `ArenaSideNavItem.href`. **`--audit` reports this one.**
- **An anchor Arena draws splits its activations.** A primary click with no modifier, and Enter,
  are cancelled and reported through the component's own event. Route from that handler, and
  nothing navigates twice. A modified click, a middle click and the context menu belong to the
  browser: they open the `href` themselves and report nothing.
- **A press that starts on a control keeps to that control.** Arena draws an activation target
  around content you write, such as a card or a table row. A click or an Enter that begins on a
  button, a link or a field inside that target runs the control and nothing else. A press anywhere
  else on the surface activates the surface. So a card or a row may hold controls of your own, and
  it may also hand the press over entirely by not being interactive at all.
- **Two themes, dark first.** Dark is `:root` and light is the `.arena-light` class. A component
  is never rewritten per theme, because it reads tokens. `.arena-compact` re-densifies the
  controls and `.arena-comfortable` grows them to a 48px touch target. The two classes are
  exclusive.
- **A chart carries identity or meaning, never both.** The `--color-cat-*` ramp in fixed order is
  identity. The status colours are meaning. A status colour is never a series colour.
- **Copy is formal and direct, in the product's language.** Concrete verbs, no boasting; an error
  is blame-free and says what to do next. Arena's words follow the locale.
- **A required member absent is a caller bug.** It is not a state to render. Every layer fails
  hard rather than drawing something empty, so an absent member is loud on the first render.
- **No render follows from whether you bound a listener or filled a slot.** A member decides,
  always, because at least one platform cannot ask the question.
- **A few components answer with a method rather than a member.** No member is imperative. The
  component's own document names the methods where they exist.

<!-- @language end -->

## Where each question is answered

| Question | Read |
|---|---|
| I am starting a project that has no appearance yet. What do I ask, and in what order? | [`references/cold-start.md`](./references/cold-start.md): the tree, its five questions, the catalogue of measured style plugins, and the identity document every branch converges on |
| Which layer, which architecture, and what do I have to install? | [`references/cold-start.md`](./references/cold-start.md), at its last four nodes. How much the product has to be found decides the layer and a peer. What the product is assembled on is answered per architecture, with the evidence for each. The dependency list follows from the answers |
| What may I build this with, and how sure is Arena about each answer? | [`references/stack.md`](./references/stack.md): the package manager, the runner, the module format, the bundler and the framework version, each answer carrying the evidence it actually has. Arena is built with bun, React 18 and Angular 22, and none of that is a requirement on you |
| How do I make Arena look like my own product? | [`references/style-kernel.md`](./references/style-kernel.md), once per project and before the first screen |
| Which of those answers actually change how it looks? | the table in [`references/style-kernel.md`](./references/style-kernel.md), measured over eight products built on this kernel |
| Does what I am building have to be found from outside it? | [`references/seo.md`](./references/seo.md), once per project: what Arena writes into the `<head>`, and which layer writes it |
| What questions does the kernel ask? | [`contracts/design/roles.json`](../../contracts/design/roles.json), one entry per role, with a type and a description and no value |
| Does a component like this exist at all, and what if it does not? | [`frameworks/INDEX.md`](../../frameworks/INDEX.md), which also says which layers ship it. A no is one of three. Your product is a different register and the markup is yours: [`references/media-register.md`](./references/media-register.md). Arena ships none on purpose: the last section of [`references/surface.md`](./references/surface.md) states that with the reason. Or nobody has added one, which is the other branch, named at the top of this page |
| Which category holds the component I am reaching for? | `frameworks/<layer>/INDEX.md`, which names every one of them and describes none |
| What is it called in my framework, what does it take, and where is its prompt? | `frameworks/<layer>/components/<category>/INDEX.md` |
| How do I use this component? | the component's own `.prompt.md`, linked from that index |
| What exactly does this member take? | the members table in that same prompt |
| Why does this member exist at all? | `contracts/api/components/<Name>.json` |
| What else does the package export, besides components? | the layer's `PACKAGE.md`: the theme surface, the two measurements, the chart ramp helpers, and Angular's projection markers |
| How do I size a page layout, or fit a panel to its own box? | the layer's `PACKAGE.md`, in that same section. Take `useArenaViewportBelow` or `arenaViewportBelow` for a page, and `useArenaContainerWidth` or `arenaContainerWidth` for a box |
| What do I paint my page and my own markup with? | [`references/page.md`](./references/page.md): the floor, the nineteen colour roles, and why a role follows the skin where an alias follows the palette. **Arena paints no page of yours** |
| How much air goes between two components, and what column does the page sit in? | [`references/page.md`](./references/page.md) again. That page carries the three named steps as classes and as tokens, and the four classes the column is made of. That page also draws the cut between air you place and air the kernel answers |
| What does Arena ship at all, and how much of it do I have to take? | [`references/surface.md`](./references/surface.md): every part in one table with the document that owns it, and three steps a project can stop at |
| Where does Arena stop? | the last section of [`references/surface.md`](./references/surface.md), which is a list of decisions rather than gaps waiting to close |
| What is the value of a token? | the DTCG JSON for its group in `contracts/design/` (`ls contracts/design/*.json`), which is the machine-readable form and is cheaper than the specification below. Two files hold what DTCG cannot: `contracts/design/colors.css` and `contracts/design/environment.css`, both of which [`references/page.md`](./references/page.md) reads for you |
| What does a value mean, and why is it that? | [`contracts/design/AGENTS.md`](../../contracts/design/AGENTS.md), the normative design specification |
| What must this kind of component do to be accessible, and what does an Arena one promise? | `contracts/behaviour/<pattern>.json`, one file per pattern and shipped inside your package. The page handing you the markup names the file it binds: [`references/media-register.md`](./references/media-register.md) for a feed, a lightbox or a viewer, [`references/seo.md`](./references/seo.md) for structured data. What one of Arena's own components does is its `.prompt.md`; the file recording which pattern it binds is what Arena is held to, not a document you read |
| How do I install Arena in my app? | [`frameworks/react/PACKAGE.md`](../../frameworks/react/PACKAGE.md) or [`frameworks/angular/PACKAGE.md`](../../frameworks/angular/PACKAGE.md) |
| What does every component look like at once? | `frameworks/react/kitchen-sink/`, and the same page in `frameworks/angular/` |
| What does a token look like on screen? | `intro/guidelines/*.html`, the specimen cards |
| Arena itself is wrong, or one of these pages sent me somewhere empty. Where does that go? | [`CONTRIBUTING.md`](https://github.com/dravensoft-dev/arena/blob/main/CONTRIBUTING.md), which takes an issue and a pull request alike, and says what makes either usable. A question this documentation did not answer is one of them |

**Do not read these to build something.** `contracts/api/AGENTS.md`,
`contracts/behaviour/AGENTS.md`, `frameworks/PACKAGING.md`, and each layer's own `AGENTS.md`
are about *changing* Arena, not about using it. Those four documents are large, and none of them
answers a question in the table above.

## Two ways to deliver

**A visual artifact** (a slide, a mock, a throwaway prototype): copy the assets you need out
of `assets/`, and write static HTML that links `intro/styles.css`. That one stylesheet pulls
in every token, so the page is on-brand with no build step. Serve the page over HTTP rather than
opening it from `file://`.

**Production code**: use the component library for the consumer's framework, import from
`@dravensoft/arena-react` or `@dravensoft/arena-angular`, and follow the prompts. The rules above
bind every line of it, and the one broken most often is the second.

**How a screen is composed is yours, and the silence is deliberate, and it is about the shape
rather than about the inventory.** Arena ships the pieces and no shape they must make: a console
and a reading view are different pages before they are different components. Start from what the
application is, and take the pieces from [`references/page.md`](./references/page.md), which is
the inventory half and holds every one of them.

Arena keeps the questions and every answer is a style plugin. The reasoning under the appearance
decision above is
[`contracts/design/StylePlugins.md`](../../contracts/design/StylePlugins.md).

## Ask before you build

**A brief names a product and never a palette, so the questions are always the same ones**, and a
one-line brief is the normal case rather than the empty one. Which ones to ask, in what order, and
what each answer unlocks is the tree named above. **Invoked with no guidance at
all**, ask what the user wants to build and then walk that tree from its first node. Then act as an
expert in the Arena language and produce either an HTML artifact or production code, whichever the
answer calls for.
