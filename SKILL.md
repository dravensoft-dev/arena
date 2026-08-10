---
name: design
description: Use this skill to build user interfaces with Arena, a token-driven design system with React and Angular component libraries on a shared Tailwind layer, for production screens or for throwaway prototypes and mocks. Covers design tokens, colour, type, spacing, motion, iconography, the accessibility pattern each component binds, and a UI kit. Arena carries the design language and not the skin: it ships Dravensoft's palette and fonts, and any project declares its own in arena.config.json.
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

## Start here, in this order

**Everything you need to build is under `frameworks/`, and each level of it narrows.**

1. **[`frameworks/SKILL.md`](./frameworks/SKILL.md)**: every component Arena ships, by the
   category it is filed under, with what each one is and what it takes. One read tells you what
   exists and what to reach for.
2. **`frameworks/<layer>/SKILL.md`**, linked from there: the same components under the names
   your framework binds them to, each linking its own prompt. Read your layer's, and no other.
3. **The component's own `.prompt.md`**, linked from that index: its members as a table, its
   examples and its Do/Don't. Read one per component you actually write, and no more.

A prompt states every member's type and default, so `contracts/api/components/<Name>.json` is
only for the reasoning behind one, and you will rarely need it.

## The rules, and they are not style preferences

Every one of these is enforced somewhere, so breaking one is a defect rather than a variation.

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
- **A design extension is a second voice, and you pick one.** Put `.arena-expressive` on a root
  or a container and every component softens, groups by elevation instead of by hairline, and
  answers the pointer more slowly. It composes with a theme and with the compact density,
  because the three change different things. Write no extension of your own.
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
- **A required member absent is a caller bug**, not a state to render. Every layer fails hard
  rather than drawing something empty, so an absent one is loud on the first render.
- **No render follows from whether you bound a listener or filled a slot.** A member decides,
  always, because at least one platform cannot ask the question.
- **A few components answer with a method rather than a member**, since no member is
  imperative. The component's own document names them where they exist.

## Where each question is answered

| Question | Read |
|---|---|
| Which component do I need? Does one exist? | [`frameworks/SKILL.md`](./frameworks/SKILL.md) |
| What is it called in my framework, and where is its prompt? | `frameworks/<layer>/SKILL.md` |
| How do I use this component? | its `.prompt.md`, linked from that index |
| What exactly does this member take? | the members table in that same prompt |
| Why does this member exist at all? | `contracts/api/components/<Name>.json` |
| What else does the package export, besides components? | the layer's `PACKAGE.md`: the theme surface, the two measurements, the chart ramp helpers, and Angular's projection markers |
| How do I size a page layout, or fit a panel to its own box? | the same section: `useArenaViewportBelow` / `arenaViewportBelow` for a page, `useArenaContainerWidth` / `arenaContainerWidth` for a box |
| What is the value of a token? | the DTCG JSON for its group in `contracts/design/` (`ls contracts/design/*.json`), which is the machine-readable form and is cheaper than the specification below. Two files hold what DTCG cannot: `contracts/design/colors.css` (the aliases such as `--crimson`, and the muted text levels) and `contracts/design/environment.css` (`--pad-safe-*`, the device's own insets composed with the spacing scale, for a shell you draw around Arena) |
| What does a value mean, and why is it that? | [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md), the normative design specification |
| What must this kind of component do to be accessible? | `contracts/behaviour/<pattern>.json`, and the component's own `<Name>.behaviour.json` |
| How do I install Arena in my app? | [`frameworks/react/PACKAGE.md`](./frameworks/react/PACKAGE.md) or [`frameworks/angular/PACKAGE.md`](./frameworks/angular/PACKAGE.md) |
| What does a finished Arena app look like? | `frameworks/react/ui-kits/console/`, the Delivery Console example |
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

Ask what the user wants to build, ask a few questions about audience and surface, then act as
an expert in the Arena language and produce either an HTML artifact or production code,
whichever the answer calls for.
