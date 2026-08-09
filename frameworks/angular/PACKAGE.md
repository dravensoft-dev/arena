# @dravensoft/arena-angular

[![npm](https://img.shields.io/npm/v/@dravensoft/arena-angular?style=flat-square&color=c5a059&label=npm)](https://www.npmjs.com/package/@dravensoft/arena-angular)
[![downloads](https://img.shields.io/npm/dm/@dravensoft/arena-angular?style=flat-square&color=c5a059)](https://www.npmjs.com/package/@dravensoft/arena-angular)
[![license](https://img.shields.io/npm/l/@dravensoft/arena-angular?style=flat-square&color=c5a059)](https://github.com/dravensoft-dev/arena/blob/main/LICENSE)

Arena is Dravensoft's design system. This package is its Angular layer: 59 components, standalone
and `OnPush`, with signal inputs and outputs, styled by a shared Tailwind recipe per
component, and shipped in Angular Package Format.

**The package carries the language. It does not carry a skin.** Your palettes and your fonts
are yours, declared in one JSON file, and the `arena-to-prod` command that ships here turns
that file into the stylesheets Arena reads.

**What comes down with it.** `@angular/core`, `@angular/common` and `@angular/platform-browser`,
which you already have; `@angular/cdk`, because `arena-tooltip` and `arena-menu` use its overlay
to position themselves, and for position only, since the roles, the keys and the focus are
Arena's own; and `@phosphor-icons/web`, which you may not have: Arena's icons are Phosphor class
names a component renders, never SVGs it bundles, so the font is installed alongside the package
rather than bundled inside it. `tslib` is the only runtime dependency this package declares.

**You do not need to run Tailwind, and running your own cannot collide with this one.** Every
component's CSS ships compiled, so one `@import` is enough and you compile nothing. The rules
are written against Arena's own class names and read Arena's own tokens: Tailwind is how they
were authored and nothing more, so a `--spacing` of your own moves nothing here.

## It works with the repository, and that is the point

Source, guidelines and full documentation: **https://github.com/dravensoft-dev/arena**

That repository is not just where the code comes from. It ships as a **Claude Code plugin**
and as an **Agent Skill**, and installing either hands an agent the whole design language:
the normative colour, spacing and voice guidelines, the API contract of every component, the
accessibility pattern each one binds, and a usage document per component with its Do and its
Don't. An agent that has read those does not guess at Arena; it builds with it. So the fastest
way to adopt this package is to install the plugin, or point your agent at the repository's
`SKILL.md`, and then ask for the screen you want.

The package is the code. The repository is the criterion.

## Install

```bash
bun add @dravensoft/arena-angular
```

That is the whole install. Angular, the CDK and `@phosphor-icons/web` are peer dependencies, so
your package manager brings down whichever of them the project does not already have.

**An icon is a class name, not an element.** Every `icon` input takes a Phosphor class list,
`"ph-bold ph-bell"`, and the component renders it. The stylesheet that turns those classes into
glyphs is not the one Phosphor ships: it is the subset `arena-to-prod` writes for you, below.

## One name everywhere

Every element carries the `arena-` prefix and every exported class carries `Arena`, which are
the same name in two spellings: `<arena-button>` is the element, `ArenaButton` is the class you
put in an `imports` array, and `kebab('ArenaButton')` is what turns one into the other.

```ts
import { ArenaButton, ArenaCard } from '@dravensoft/arena-angular';

@Component({ imports: [ArenaButton, ArenaCard], template: `<arena-button>Save</arena-button>` })
```

Every type carries it as well, so a tone is an `ArenaTone`, and the projection markers carry it
already: `ArenaAction`, `ArenaActions`, `ArenaBrand`, `ArenaFooter` and `ArenaSecondaryAction`.

**The class names carry it too, and they carry it once.** A component renders
`.arena-button__root`, spelt from the component's own name, so a rule of yours written against
that class is a rule about this component and nothing else. Every sheet is named the same way,
which is why `css/components/arena-button.css` is the file and `arena-button` is what you write
in a `stylesheet` list.

## Declare your skin

Write `arena.config.json` in your project root. This is the whole file, with one palette and
three fonts served by Google Fonts, and it is enough to start:

```json
{
  "palettes": [
    {
      "name": "dark",
      "default": true,
      "polarity": "dark",
      "colors": {
        "base-100": "#141010",
        "base-200": "#1d1715",
        "base-300": "#241c19",
        "base-content": "#f3ede5",
        "primary": "#b52a20",
        "primary-content": "#ffffff",
        "secondary": "#c5a059",
        "secondary-content": "#141010",
        "neutral": "#2c221e",
        "neutral-content": "#d8cfc4",
        "info": "#3182ce",
        "info-content": "#141010",
        "success": "#38a169",
        "success-content": "#141010",
        "warning": "#ecc94b",
        "warning-content": "#141010",
        "error": "#e85151",
        "error-content": "#ffffff",
        "cat-1": "#3c7b0a",
        "cat-2": "#3b63be",
        "cat-3": "#0a924b",
        "cat-4": "#6a59bc",
        "cat-5": "#00a3c0",
        "cat-6": "#884da9",
        "cat-7": "#00a99a",
        "cat-8": "#984697"
      }
    }
  ],
  "fonts": {
    "display": { "family": "Archivo", "src": "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap" },
    "body": { "family": "Familjen Grotesk", "src": "https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700;800;900&display=swap" },
    "mono": { "family": "Spline Sans Mono", "src": "https://fonts.googleapis.com/css2?family=Spline+Sans+Mono:wght@400;500;600;700;800;900&display=swap" }
  }
}
```

`arena.config.example.json` in this package is the same file with both Dravensoft palettes in
it, ready to copy and edit.

What each part means:

- **`palettes`** is an array, so declare as many as you want. Exactly one is the `default` and
  reaches `:root`; every other one becomes a class, `.arena-<name>`, that you put on
  `<html>` to switch skin.
- **`polarity`** is `dark` or `light`. It decides the native date picker's colour and it is
  what a first visit matches `prefers-color-scheme` against.
- **`colors`** takes all 27 keys above. `error-fill` is the only optional one: leave it out and
  Arena darkens `error` in oklab for the single filled danger surface it has.
- **`cat-1`** through **`cat-8`** are the chart ramp. Their order is their identity, so slot 3
  is always slot 3, and they are never used to mean anything, only to tell series apart.
- **`fonts`** fills the three families Arena reads. `src` takes either a stylesheet URL, as
  above, or a font binary you host yourself, which becomes an `@font-face`:
  `{ "family": "Archivo", "src": "/fonts/archivo.woff2", "weight": "400 900" }`.
- **`stylesheet`** is optional and names what you render, so you send nothing else. See
  Build to production, below.

# Build to production

```bash
bunx arena-to-prod
```

One command, no arguments. It reads `arena.config.json` and your `src` tree, and writes two
files into `src`:

- **`arena.generated.css`**, your palettes and your `@font-face` rules, led by an `@import` of
  the package's own stylesheet. Both declare into `:root` at equal specificity, so source order
  decides and your values win.
- **`icons.generated.css`**, the Phosphor subset in `woff2` alone: every glyph your sources draw
  and every glyph Arena draws for you. It exists because a whole Phosphor weight carries every
  icon Phosphor has and a screen draws a handful, which makes it the largest thing an Arena
  project would send that nothing on it reads. Counting what Arena draws is the part you cannot
  do by hand: a component renders icons you never wrote, and leaving those out is an empty box
  in a menu you did not know had one.

Import both from `src/styles.css`, and import them **last**:

```css
@import './icons.generated.css';
@import './arena.generated.css';
@import '@dravensoft/arena-angular/css/arena-cdk.css';
```

Add that third line when you first use `arena-tooltip` or `arena-menu`: it re-bases the CDK
overlay onto Arena's `--z-*` scale, without which a menu opened inside a dialog paints behind it.

| flag | what it does |
| --- | --- |
| `--undrawn` | Name the components this package ships that your sources draw nowhere. It is the answer to "which of them have I not used yet", and it costs nothing extra: the command already reads your sources to resolve `"components": "auto"`. A component Arena draws on your behalf counts as undrawn, because you never wrote it. |
| a projection marker you write and do not import | Reported by name. A slot such as `[footer]` or `[actions]` is gated on a query for its directive, so a template that writes the attribute without listing `ArenaFooter` in its own `imports` renders nothing there, and neither the build nor `ngc --strictTemplates` says a word. This is the one defect a component cannot report about itself. |
| `--strict` | Exit 1 on a contrast report, a ramp report or a glyph Phosphor does not have, rather than writing anyway. Use it in CI if you want that discipline. |
| `--no-import` | Omit the `@import` of the package stylesheet, for when you would rather import `@dravensoft/arena-angular/arena.css` yourself. |
| `--config`, `--src`, `--out` | The config file, the trees to scan and where the two files go. They default to `arena.config.json`, `src` and `src`. |

**It reports rather than refuses.** If a text colour lands under 4.5:1, if two ramp slots are
too close to tell apart with a common colour vision deficiency, or if you name a glyph Phosphor
does not have, it says so on stderr and writes the files anyway. Your brand is yours; Arena's
job is to tell you what it costs. A malformed config is a different matter and always fails,
naming the key.

**`stylesheet` in `arena.config.json` is how you pay for only what you render.** Set
`"components": "auto"` and the command reads your templates and works the list out:

```json
{ "stylesheet": { "components": "auto", "preflight": false } }
```

It counts a component as drawn when its element appears in a template, and it adds what Arena
draws on your behalf, because `<arena-table>` renders a pagination and a select you never wrote.
It tells you both counts on stderr, and names any `arena-` element it saw and could not place.
`preflight: false` is separate: set it when your project already ships an equivalent browser
reset.

**What a scan cannot see, it cannot send.** A component reached only through a value your code
computes is a component this misses, and a missing sheet renders with no border, no padding and
no colour, with nothing to tell you. Naming the sheets yourself is still there, and is the honest
choice for a project that renders through indirection:

```json
{ "stylesheet": { "components": ["arena-button", "arena-page-head", "arena-side-nav", "arena-stat-card", "arena-table"] } }
```

A name this package does not ship fails the command and lists the ones it does, so a typo stops
the build instead. That list is then yours to keep current.

## Run it before your build

```json
{
  "scripts": {
    "prebuild": "arena-to-prod",
    "prestart": "arena-to-prod"
  }
}
```

Both bun and npm run a `pre<name>` script ahead of the script it names, so wiring it once is
what keeps the two files from ever going stale. They are build products of your config and your
sources, so ignore them in version control the way you ignore the rest of your build.

## Switch palettes

```ts
import { provideArenaThemes, ArenaThemeService } from '@dravensoft/arena-angular';

bootstrapApplication(App, {
  providers: [
    provideArenaThemes({
      palettes: [
        { name: 'dark', polarity: 'dark' },
        { name: 'light', polarity: 'light' },
      ],
      default: 'dark',
    }),
  ],
});
```

Pass the same palettes your config declares. Then inject `ArenaThemeService` and call `set('light')`,
or `toggle()` to walk them in order. `theme` is a signal, so a template reads it directly. With
no providers the service answers `dark` and `light`.

To avoid a flash on first paint, apply the class in `index.html` before your stylesheet:

```html
<script>
  (function () {
    try {
      var name = localStorage.getItem('arena-theme');
      if (name && name !== 'dark' && /^[a-z][a-z0-9-]*$/.test(name)) {
        document.documentElement.classList.add('arena-' + name);
      }
    } catch (e) {}
  })();
</script>
```

## What the package ships besides the components

Every component is standalone, so import the ones a template uses. Five other surfaces reach the
package root, each answering a question a consumer cannot answer from outside.

**The projection markers, and they are not optional.** `ArenaAction`, `ArenaActions`,
`ArenaBrand`, `ArenaFooter` and `ArenaSecondaryAction` are the directives behind the `[action]`,
`[actions]`, `[brand]`, `[footer]` and `[secondaryAction]` attributes. **Put the marker your
template writes in that component's own `imports`.** A component detects a projected slot with a
`contentChild` on the directive, so an un-imported marker leaves the query null and the slot
silently unrendered: no error and no template diagnostic, because a bare `footer` attribute on a
`<div>` is valid HTML whether or not a directive matches it. The component cannot tell an
un-imported marker from an unfilled slot, so nothing can warn you.

| export | what it is |
| --- | --- |
| `provideArenaThemes`, `ArenaThemeService`, `arenaThemeClass`, `ArenaPalette`, `ArenaThemeConfig` | the theme surface above |
| `arenaContainerWidth(ref?)` | `Signal<number \| null>` over the host's own box, or the `ElementRef` you pass. For a component or a panel that has to fit the room it was given. **The width is `null` until the first measurement**, so render the wide branch while it is: a panel that flashes into its phone shape on every mount is worse than one that settles into it |
| `arenaViewportBelow(name)` | `Signal<boolean>` over `not all and (min-width: N)`, where `name` is `'sm' \| 'md' \| 'lg'` and resolves the same `--bp-*` token Arena's own components branch on. For a page's own layout, and **never for a component**: that is wrong the first time somebody puts it in a narrow column. Call `forgetArenaBreakpoints()` if your app swaps its stylesheet at runtime |
| `arenaCatColor(slot)`, `arenaCatSurface(slot)`, `arenaCatSlotFor(key)`, `ARENA_CAT_SLOTS` | the chart ramp, for a legend or a chip you draw yourself. The ramp's order is its identity, so a slot means the same thing in every chart on the screen |
| `isArenaPrimaryActivation(event)` | the predicate behind the anchor rule: true for a primary click with no modifier, false for every modified click, middle click and context menu |
| `isArenaOwnActivation(target, container)` | true when an activation landed on the container itself rather than on a link, a button, a field or any other interactive element inside it: the predicate that lets a clickable row hold a checkbox and a row action without taking their presses |
| `ARENA_ICONS` | the role-to-Phosphor map Arena's own components draw from, as `{ role, phosphor, weight }`. Read it when you want your icon for a role to match Arena's |

Call either measurement from an injection context, a field initializer or the constructor:
`DestroyRef` disconnects the observer and `afterNextRender` decides when there is a box to
measure at all. Every other symbol reaching the root is an internal of this layer, exported
because the barrel is not curated, and carries no compatibility promise. It carries the prefix
too, since the convention is about the name and not about the promise, so reading `Arena` on a
symbol tells you where it comes from and never that it is yours to depend on.

The stylesheets are a tree, and you pick your depth. `arena.css` is all of it and the
zero-friction path:

| stylesheet | what it is |
| --- | --- |
| `css/base.css` | Tailwind's preflight and nothing of Arena's. Arena needs one: without `button, input, select, textarea { font: inherit }` a control falls back to the browser's 13.33px Arial and every control in the library is 20% off, with nothing to tell you. Keep yours or keep this one, but keep one |
| `css/components.css` | every component Arena draws |
| `css/components/<name>.css` | one component, named for its sheet as `arena-button.css` or `arena-stat-card.css`. Each imports the prelude it needs itself, so importing one alone is safe |
| `css/numerals.css` | `.arena-num`, the mono face and `tabular-nums` and no colour. Put it on a figure you draw yourself and a column of them aligns by digit the way a table's does |
| `css/arena-cdk.css` | the CDK overlay, re-based onto Arena's layering |

Importing the halves rather than `arena.css` makes **order** yours: Arena's components have to
come before your own rules if you want yours to win. There is nothing to compile either way: no
file in this package carries a Tailwind class, so pointing a `@source` at it produces an empty
sheet.

## Why might this package's latest version not match Arena's latest version?

[Why are the published package versions not identical?](https://github.com/dravensoft-dev/arena/blob/main/.github/workflows/AGENTS.md#why-are-the-published-package-versions-not-identical)

## License

MIT. See the repository.
