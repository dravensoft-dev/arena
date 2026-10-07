# Installing Arena and wiring its stylesheets

How do I install an Arena package? Which peers arrive with it? How do I import the generated stylesheets in React or in Angular? Why does TypeScript report TS2307 on a stylesheet import? Why does every name start with Arena? Read this once per project, before the first screen.

The support matrix and the peer ranges are in [`stack.md`](./stack.md). This page does not repeat them.

## How do I install a package?

Pick the package for your layer and the manager you already use.

```bash
npm i @dravensoft/arena-react        # or: pnpm add / yarn add / bun add
npm i @dravensoft/arena-angular      # or: pnpm add / yarn add / bun add
```

Each of these managers installs Arena. Under pnpm the layout is strict, and every peer is declared rather than assumed. The command that ships with the package resolves the icon font through the symlinked store like any other dependency. No hoisting flag is needed.

The package manager brings down whichever peers the project lacks. The package declares `engines: { node: ">=22" }`, the oldest line Node still supports. The `arena-to-prod` command is plain JavaScript over `node:fs`, `node:path` and `node:url`. A project on a supported Node installs without an engine warning.

## What comes down with the React package?

The peers are `react`, `react-dom` and `@phosphor-icons/web`. The first two are already in the project. The third may not be.

Arena's icons are Phosphor class names that a component renders. No SVG is bundled. The font is installed beside the package and never inside it.

The package has no runtime dependency and needs no CSS toolchain. Every component's CSS ships compiled against Arena's own class names and tokens. A project running its own utility framework cannot collide with it in either direction.

## What comes down with the Angular package?

The peers are `@angular/core`, `@angular/common` and `@angular/platform-browser`, which the project already has. `@angular/cdk` arrives too. A primitive that anchors a surface to a trigger uses its overlay, and `arena-tabs` uses its roving-focus key manager. The CDK supplies position only. The roles, the keys and the focus are Arena's own.

`@phosphor-icons/web` is the last peer and may be new to the project. The font is installed beside the package. `tslib` is the only runtime dependency the package declares.

Angular's own Node floor is the stricter of the two, so Angular decides which Node the project runs. Arena never refuses a Node that the framework accepts.

You do not need to run Tailwind. Every component's CSS ships compiled, and one `@import` is enough. A `--spacing` of your own moves nothing in Arena.

## What is an icon in Arena?

An icon is a class name and never an element. Every `icon` prop in React and every `icon` input in Angular takes a Phosphor class list such as `"ph-bold ph-bell"`. The component renders it.

The stylesheet that turns those classes into glyphs is the subset that `arena-to-prod` writes. Phosphor's own stylesheet is not the one Arena reads. [`cli.md`](./cli.md) says how the subset is built.

## How do I import the stylesheets in React?

Run `arena-to-prod` first. The command writes two files, and a third when a style plugin of yours carries CSS. Import them last, in your entry file.

```js
import './icons.generated.css';
import './arena.generated.css';
import './plugin.generated.css';   // only when a style plugin of yours carries CSS
```

The import happens in JavaScript. A bundler resolves each specifier as a stylesheet.

## How do I import the stylesheets in Angular?

Import the generated files from `src/styles.css`, and import them last.

```css
@import './icons.generated.css';
@import './arena.generated.css';
@import './plugin.generated.css';   /* only when a style plugin of yours carries CSS */
```

The CDK overlay sheet comes with them. `arena.css` imports `css/arena-cdk.css` itself, and a `stylesheet` block carries it too. There is no extra line to add.

That sheet re-bases the CDK overlay onto Arena's `--z-*` scale. Without it a menu opened inside a dialog paints behind the dialog. Write the import yourself only under `--no-import`, where you import the package sheet by hand.

## Why does TypeScript report TS2307 on a stylesheet import in React?

Those import lines are a bundler idiom and not TypeScript's. A `.css` specifier resolves to no module. Under `strict` the compiler reports TS2307 on every one of them. The build then stops at the file that wires Arena in.

Most toolchains already ship the declaration, and the fix is to reference it. Vite takes `"types": ["vite/client"]` in `tsconfig.json`. A Next project generates `next-env.d.ts`.

A project whose toolchain ships none declares the modules once. Put them in a declaration file that your `include` already reaches.

```ts
declare module '*.css';
declare module '*.svg' {
  const src: string;
  export default src;
}
```

Neither declaration is Arena's to ship. An ambient `*.css` is global to whoever compiles it. A package that declared one would decide that for every project that installs it.

## How do I pass a logo to ArenaAppLogo in React?

`ArenaAppLogo` takes the mark as a node you pass. A bundled `import mark from './mark.svg'` is a specifier that TypeScript resolves no better than a stylesheet. The `*.svg` declaration above is the fix.

Passing the path as a bare string in `src` avoids the question. The price is the hashed filename that a build would have written.

## One name everywhere in React

Every export carries the `Arena` prefix, and so does every type. The component is `ArenaButton`, its props are `ArenaButtonProps`, and a tone is an `ArenaTone`.

```tsx
import { ArenaButton, ArenaCard } from '@dravensoft/arena-react';
import type { ArenaTone } from '@dravensoft/arena-react';
```

The prefix is the name and not a decoration on it. The prefix lets `"components": "auto"` tell a component of Arena's from one of yours. A `<Card>` in your source belongs to whoever wrote it. An `<ArenaCard>` belongs to Arena.

## One name everywhere in Angular

Every element carries the `arena-` prefix and every exported class carries `Arena`. The two are one name in two spellings. `<arena-button>` is the element, and `ArenaButton` is the class that goes in an `imports` array. The kebab rule turns one into the other.

```ts
import { ArenaButton, ArenaCard } from '@dravensoft/arena-angular';

@Component({ imports: [ArenaButton, ArenaCard], template: `<arena-button>Save</arena-button>` })
```

Every type carries the prefix as well, so a tone is an `ArenaTone`. The projection markers carry it already. [`exports.md`](./exports.md) lists them and says why each must be imported.

An optional value binds straight through. Every input that carries a default resolves an absent value back to it. A field of yours that may be unset needs no `?? '...'` at the call site. Write `[tone]="toast.tone"` and the default stays stated once, in the component.

## Why do class names and stylesheet names carry the component name?

A component renders `.arena-button__root`, spelt from the component's own name. A rule of yours written against that class is a rule about that component and nothing else.

Every sheet is named the same way. `css/components/arena-button.css` is the file, and `arena-button` is what you write in a `stylesheet` list. [`config.md`](./config.md) covers that list.
