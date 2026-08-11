---
name: design
description: Use this skill to build user interfaces with Arena, a token-driven design system with React and Angular component libraries on a shared Tailwind layer, for production screens or for throwaway prototypes and mocks. Starts by picking the voice the application takes, one of the design extensions, and then covers design tokens, colour, type, spacing, motion, iconography, and the accessibility pattern each component binds. Arena carries the design language and not the skin: it ships Dravensoft's palette and fonts, and any project declares its own in arena.config.json.
user-invocable: true
---

# Arena

Arena is Dravensoft's design language: a token layer, React and Angular component libraries
built on it, and a shared Tailwind layer. Its identity is dark-first, warm black under bone
text, crimson as the voice and gold as distinction, sharp geometry, no gradients.

**This file routes. Read only what your task needs.**

## Which job is this?

**Building something with Arena** (a screen, a prototype, a component, an integration): stay
here, and follow the table below.

**Changing Arena itself** (adding a component, moving a token, editing a contract or a gate):
read [`AGENTS.md`](./AGENTS.md) instead. It is the root of that branch and this file is not.

## First, which voice is this application?

**Arena has more than one voice, and picking one is the first decision, before any component.**
It is a decision about the *work the screen does*, not about taste: the three group things
differently, so a screen that scans and a screen that invites are told apart by the mechanism
rather than by a dial. Pick from the job, not from the description of the look.

<!-- @voices GENERATED from contracts/design/extension.*.json. Edit the contract, not this table. -->

| Voice | The work it is for | What says two things belong together |
|---|---|---|
| none, the default | scan and operate: dashboards, consoles, tables, admin and internal tooling, anything read a screenful at a time | a line drawn around a region says the things inside it are one thing |
| `.arena-editorial` | read: documentation, reports, changelogs, release notes, any screen somebody reads top to bottom | what belongs together is near and what does not is far, and nothing is drawn at all |
| `.arena-showcase` | invite and convert: marketing, commerce, onboarding, pricing, a landing page somebody arrives on | a surface is an object standing off a floor, so depth separates it and no line has to |

<!-- @voices end -->

**Ask the user what the application is for if you do not know**, then take the row that answers
it. The class goes on the root, or on any container to scope it to part of a page; a project that
has already decided writes `"extension": "showcase"` in its `arena.config.json` and gets it
everywhere. **One voice per page, and write none of your own.** A voice composes with a theme and
with the density classes because the three change different things: a voice takes the surfaces, the
gaps between them, the weight and leading of type and how much energy a response has; a theme takes
the colour; and density keeps the controls and the data rows.

**Everything after this is one component at a time**, and none of it changes what you picked here.

## Then, in this order

1. **`frameworks/<layer>/SKILL.md`**: every component your framework ships, under the names it
   binds them to, with what each one is and what it takes, each linking its own prompt. Read your
   layer's, and no other.
2. **The component's own `.prompt.md`**, linked from that index: its members as a table, its
   examples and its Do/Don't. Read one per component you actually write, and no more.

[`frameworks/SKILL.md`](./frameworks/SKILL.md) is the layer-neutral index beside those two, and it
answers one question the layer index cannot: whether a component exists at all, and which layers
ship it. Read it when you are looking for something you are not sure Arena has, and skip it when
you already know what you are reaching for.

A prompt states every member's type and default, so `contracts/api/components/<Name>.json` is
only for the reasoning behind one, and you will rarely need it.

## The rules, and they are not style preferences

Every one of these is a rule of the language rather than a preference, and most are enforced
inside Arena by a gate over Arena's own tree. **No gate reads your application**, so in your code
these hold because you hold them: breaking one is a defect that nothing will report.

- **Tokens are the only styling layer.** A raw hex, or a bare `16px`, is a bug. Read a value
  through its custom property (`var(--crimson)`, `var(--sp-4)`) or derive it with
  `calc()`/`clamp()` over one.
- **Danger is outline, never filled**: transparent background, border and content in
  `--error`/`--danger`. The single filled danger surface in the whole system is the final
  irreversible confirmation inside `ArenaConfirmDialog`.
- **One primary accent per view.** Crimson is the voice; at most one `variant="primary"`
  action on a screen. Gold is distinction and focus, not a second primary.
- **No gradients** on any surface. Depth comes from the `base-100` to `base-200` to `base-300`
  surface scale, the hairline border and the warm shadow. `ArenaSkeleton`'s neutral shimmer is the
  one exception.
- **No emoji**, in product or in copy.
- **Icons are Phosphor class-name strings, never elements and never SVG**:
  `icon="ph-bold ph-plus"`. Install `@phosphor-icons/web`; Arena never bundles it.
- **Two themes, dark first.** Dark is `:root`, light is the `.arena-light` class. Components
  are never rewritten per theme, because they read tokens. `.arena-compact` re-densifies
  and `.arena-comfortable` grows the controls to a 48px touch target; the two are exclusive.
- **One voice per page, picked before anything else**, from the table at the top of this file. It
  is a decision about the work the screen does, and every component answers to it without being
  told.
- **A chart carries identity or meaning, never both.** The `--color-cat-*` ramp in fixed order
  is identity; the status colours are meaning. Status colours are never series colours.
- **Copy is English, formal and direct**, concrete action verbs, no boastful adjectives.
  Errors are blame-free and say what to do next.
- **An anchor Arena draws splits its activations.** A primary click with no modifier, and
  Enter, are cancelled and reported through the component's own event, so route from that
  handler and nothing navigates twice. A modified click, a middle click and the context menu
  are the browser's: they open the `href` themselves and report nothing. **Never wrap an Arena
  component in your router's own link**, which nests an anchor inside an anchor, and in Angular
  does not bind at all. `ArenaCard.href`, `ArenaCommand.route`, `ArenaCrumb.href` and `ArenaSideNavItem.href`.
- **A press that starts on a control keeps to that control.** Where Arena draws an activation
  target around content you write, a card or a table row, a click or an Enter that begins on a
  button, a link or a field inside it runs that control and nothing else; a press anywhere else on
  the surface activates the surface. So a card or a row may hold your own controls, and it may also
  hand the press over entirely by not being interactive at all.
- **A required member absent is a caller bug**, not a state to render. Every layer fails hard
  rather than drawing something empty, so an absent one is loud on the first render.
- **No render follows from whether you bound a listener or filled a slot.** A member decides,
  always, because at least one platform cannot ask the question.
- **A few components answer with a method rather than a member**, since no member is
  imperative. The component's own document names them where they exist.

## Where each question is answered

| Question | Read |
|---|---|
| Which voice does this application take? | the table at the top of this file, and nothing else: it is the whole of the decision |
| Does a component like this exist at all, and which layers ship it? | [`frameworks/SKILL.md`](./frameworks/SKILL.md) |
| Which component do I need, what is it called in my framework, and where is its prompt? | `frameworks/<layer>/SKILL.md` |
| How do I use this component? | its `.prompt.md`, linked from that index |
| What exactly does this member take? | the members table in that same prompt |
| Why does this member exist at all? | `contracts/api/components/<Name>.json` |
| What else does the package export, besides components? | the layer's `PACKAGE.md`: the theme surface, the two measurements, the chart ramp helpers, and Angular's projection markers |
| How do I size a page layout, or fit a panel to its own box? | the same section: `useArenaViewportBelow` / `arenaViewportBelow` for a page, `useArenaContainerWidth` / `arenaContainerWidth` for a box |
| What is the value of a token? | the DTCG JSON for its group in `contracts/design/` (`ls contracts/design/*.json`), which is the machine-readable form and is cheaper than the specification below. Two files hold what DTCG cannot: `contracts/design/colors.css` (the aliases such as `--crimson`, and the muted text levels) and `contracts/design/environment.css` (`--pad-safe-*`, the device's own insets composed with the spacing scale, for a shell you draw around Arena) |
| What does a value mean, and why is it that? | [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md), the normative design specification |
| What must this kind of component do to be accessible? | `contracts/behaviour/<pattern>.json`, and the component's own `<Name>.behaviour.json` |
| How do I install Arena in my app? | [`frameworks/react/PACKAGE.md`](./frameworks/react/PACKAGE.md) or [`frameworks/angular/PACKAGE.md`](./frameworks/angular/PACKAGE.md) |
| What does every component look like at once, in one design extension? | `frameworks/react/kitchen-sink/<extension>/`, and the same page in `frameworks/angular/` |
| What does a token look like on screen? | `intro/guidelines/*.html`, the specimen cards |

**Do not read these to build something.** `contracts/api/AGENTS.md`,
`contracts/behaviour/AGENTS.md`, `frameworks/PACKAGING.md`, and each layer's own `AGENTS.md`
are about *changing* Arena, not about using it. They are large, and none of them answers a
question in the table above.

## Two ways to deliver

**A visual artifact** (a slide, a mock, a throwaway prototype): copy the assets you need out
of `assets/`, and write static HTML that links `intro/styles.css`. That one stylesheet pulls
in every token, so the page is on-brand with no build step. It must be served over HTTP rather
than opened from `file://`.

**Production code**: use the component library for the consumer's framework, import from
`@dravensoft/arena-react` or `@dravensoft/arena-angular`, and follow the prompts. **Put no class
of your own on an Arena component**, and write no rule targeting one. A component renders
`arena-<component>__<slot>` class names, so a rule of yours can reach one by specificity;
nothing stops you and nothing supports you either. The name reads like a BEM surface somebody
meant you to target and it is not one: it is compiler output, no contract names it, and a slot
may be renamed in any release. Re-skin through `arena.config.json`, which is
what it is for. Content you draw yourself is yours, styled through the same tokens.

## Invoked with no other guidance

**Ask what kind of application this is before you ask anything else**, and take the voice from the
answer: a screen that is scanned, one that is read, and one that invites are three different jobs
and Arena draws them differently. Then ask what the user wants to build, and a few questions about
audience and surface. Then act as an expert in the Arena language and produce either an HTML
artifact or production code, whichever the answer calls for.
