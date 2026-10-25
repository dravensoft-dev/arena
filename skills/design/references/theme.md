# Switching palettes and avoiding the first-paint flash

How do I switch between a dark and a light palette? How do I stop a flash of the wrong palette on first paint? What do `initArenaTheme`, `useArenaTheme`, `provideArenaThemes` and `ArenaThemeService` do? Read this when the config declares more than one palette, or when a user designs a palette of their own.

Declare the palettes in `arena.config.json` first. [`config.md`](./config.md) covers the file. Exactly one palette is the default and reaches `:root`. Every palette is a class, `.arena-<name>`. The theme functions put the chosen class on `<html>`, and a subtree takes one through `ArenaPaletteScope` or the class itself.

## How do I switch palettes in React?

Call `initArenaTheme` once with the palettes your config declares. Read and set the choice with `useArenaTheme`.

```tsx
import { ArenaButton, initArenaTheme, useArenaTheme } from '@dravensoft/arena-react';

initArenaTheme({
  palettes: [
    { name: 'dark', polarity: 'dark' },
    { name: 'light', polarity: 'light' },
  ],
  default: 'dark',
});

function ThemeButton() {
  const [theme, setTheme] = useArenaTheme();
  return <ArenaButton onActivate={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</ArenaButton>;
}
```

`initArenaTheme` reads the stored choice. The function falls back to `prefers-color-scheme`, matched against each palette's polarity. Then the function puts the right class on `<html>`, and the page-wide choice is all it sets. [How do I put a palette on part of a page?](#how-do-i-put-a-palette-on-part-of-a-page) covers a subtree. Called with nothing, it answers `dark` and `light`. Outside a component, `setArenaTheme(name)`, `toggleArenaTheme()` and `getArenaTheme()` do what the hook does. A name the palettes do not declare throws, and a config with no `default` takes its first palette.

## How do I switch palettes in Angular?

Provide the palettes at bootstrap. Inject `ArenaThemeService` to change them.

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

Pass the same palettes your config declares. Call `set('light')` on the service, or `toggle()` to walk the palettes in order. `theme` is a signal, so a template reads it directly. With no providers the service answers `dark` and `light`. **The service applies the palette only once something injects it**, so inject it in your root component even when no control there switches palette. `set()` throws on a name the palettes do not declare.

## How do I put a palette on part of a page?

**Put the palette on the element that should wear it.** Every palette is a class, `.arena-<name>`, and the class skins whatever element carries it. On `<html>` it skins the page. On a section it skins that subtree, and the nearest palette wins when two nest, also inside a style plugin. React and Angular both ship a scope that draws the class and tells the code below which palette it is in.

```tsx
import { ArenaButton, ArenaPaletteScope, useArenaPalette } from '@dravensoft/arena-react';

function PaletteName() {
  return <span>{useArenaPalette()}</span>;
}

function Island() {
  return (
    <ArenaPaletteScope palette="light">
      <ArenaButton>Save</ArenaButton>
      <PaletteName />
    </ArenaPaletteScope>
  );
}
```

In Angular the scope is the attribute component `[arenaPalette]`, and `injectArenaPalette()` returns the palette as a signal. The token behind it is `ARENA_PALETTE`.

```ts
import { Component } from '@angular/core';
import { ArenaButton, ArenaPaletteScope, injectArenaPalette } from '@dravensoft/arena-angular';

@Component({
  selector: 'app-palette-name',
  template: '{{ palette() }}',
})
export class PaletteName {
  readonly palette = injectArenaPalette();
}

@Component({
  selector: 'app-island',
  imports: [ArenaPaletteScope, ArenaButton, PaletteName],
  template: `<section arenaPalette="light"><arena-button>Save</arena-button><app-palette-name /></section>`,
})
export class Island {}
```

`useArenaPalette()` and `injectArenaPalette()` answer the palette of the nearest scope above, and the page theme when there is none. A palette name the theme config does not declare renders the scope pending until a runtime palette of that name is registered.

**A subtree takes** the component sheets, the project's own Arena Tailwind utilities, the colour aliases and the colour-mix washes, the ink levels, `color-scheme`, `--picker-invert` and the scrim. A style-plugin class and a density class go on any element the same way, and the nearest one wins. A nested plugin keeps the high-contrast widths and the hero fit, and so does a project's own root plugin. Angular overlays take the palette, style plugin and density of their trigger. The overlays are the menu, popover, tooltip, combobox and multiselect, and through them the split button and the side-nav item. React panels stay in the subtree.

**A subtree does not take** the page canvas, which follows the root's palette. A subtree takes no ground either unless something paints one. `ArenaPaletteScope` paints `bg-base-100 text-base-content`, and a bare class paints nothing, so a section wearing only `arena-light` keeps the ground behind it. Surfaces mounted elsewhere, which are dialogs, sheets, the confirm queue, the command palette, onboarding and the toast host, take the palette of where they are mounted. An island that wants its own toasts mounts a toast host inside it.

**A bare class is not a scope.** The readers see an `ArenaPaletteScope` and nothing else, so `useArenaPalette()` under a `<section class="arena-light">` answers the page theme. Use the scope when code below the element reads the palette, such as a canvas chart, and the class when markup alone is enough.

## When does a palette get stored?

Each layer stores a user's choice and, for a runtime palette, a copy of it. React's `setArenaTheme`, `toggleArenaTheme` and the setter `useArenaTheme` returns write the `arena-theme` key, and so do Angular's `set` and `toggle`. Neither `initArenaTheme` nor injecting the service writes it. Until a choice is stored the page follows the system. Remove the `arena-theme` key to follow the system again. In React call `initArenaTheme(themes)` after removing it, and in Angular the next load follows the system. Nothing listens for a change of the system setting while the page is open. The copy lives under `arena-runtime-palette`. A layer writes it when a runtime palette becomes the current one, by setting it or by registering the name that is already current. A layer removes it when a declared palette is chosen, and when the current runtime palette is removed.

## How do I avoid a flash on first paint?

Apply the class before your stylesheet loads. In React put the script in the HTML document your bundler or server sends, in `<head>` before the stylesheet link. In Angular put it in `index.html`.

```html
<script>
  (function () {
    var PALETTES = [               // every palette your arena.config.json declares, in its order
      { name: 'dark', polarity: 'dark' },
      { name: 'light', polarity: 'light' }
    ];
    var DEFAULT = 'dark';          // the palette your arena.config.json marks default
    try {
      var stored = localStorage.getItem('arena-theme');
      var name = null;
      for (var i = 0; i < PALETTES.length; i++) {
        if (PALETTES[i].name === stored) { name = stored; break; }
      }
      var runtime = null;
      if (!name && stored) {
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem('arena-runtime-palette')); } catch (e) {}
        var props = cached && cached.properties;
        var fits = !!props && typeof props === 'object' && !Array.isArray(props) &&
          cached.name === stored && /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(stored) &&
          (cached.polarity === 'dark' || cached.polarity === 'light');
        for (var key in props) {
          if (!fits) break;
          var val = props[key];
          fits = Object.prototype.hasOwnProperty.call(props, key) && typeof val === 'string' &&
            (key === '--arena-palette' ? val === stored
              : /^--color-[a-z0-9-]+$/.test(key) ? /^#[0-9a-f]{6}$/.test(val)
              : /^--level-[a-z0-9-]+$/.test(key) && /^\d{1,3}%$/.test(val));
        }
        if (fits && props['--arena-palette'] !== stored) fits = false;
        if (fits) runtime = cached;
      }
      if (runtime) {
        document.documentElement.classList.add('arena-polarity-' + runtime.polarity);
        for (var prop in runtime.properties) {
          document.documentElement.style.setProperty(prop, runtime.properties[prop]);
        }
      } else if (!name) {
        var wants = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        for (var j = 0; j < PALETTES.length; j++) {
          if (PALETTES[j].polarity === wants) { name = PALETTES[j].name; break; }
        }
      }
      if (!runtime && name && name !== DEFAULT) {
        document.documentElement.classList.add('arena-' + name);
      }
    } catch (e) {}
  })();
</script>
```

Set the list to your own palettes and `DEFAULT` to the palette your config marks default. The theme surface takes the same two values. Keep both copies equal, or a palette added to one is a palette the first paint never shows. The snippet reads the key the surface writes, `arena-theme`, and it treats a stored name the build no longer declares as a first visit, as the surface does. A runtime palette is the one exception. A runtime palette has a name the config does not declare, and the `arena-runtime-palette` key holds the cache for it. For that name the snippet puts the `arena-polarity-<polarity>` class on `<html>` and sets each cached property with `style.setProperty`. The snippet accepts the cache on the surface's own checks. The name is kebab and equals the stored one, and the polarity is `dark` or `light`. `--color-*` values are lower-case `#rrggbb`, `--level-*` values look like `40%`, and `--arena-palette` is present and equals the name. A cache that fails any check is a first visit.

The default reaches `:root` and also has its class, `.arena-dark` in Arena's own palettes. The theme surface leaves `<html>` bare for the default. A snippet that names the wrong default puts on `<html>` the class of the palette the theme surface leaves bare, or leaves a palette that needs its class without it.

## Why does the snippet read the media query?

On a first visit nothing is stored. The theme surface falls back to the first palette whose polarity matches the device. A snippet that reads only storage paints the default first. The app corrects it after boot, and that correction is the flash the snippet exists to prevent.

## What is a runtime palette?

A runtime palette is a palette nobody declared in `arena.config.json`: a user designs it, and the app applies it while it runs. The checks the build runs on a declared palette run on a runtime palette too. The palette paints what the same colours would paint if the config declared them.

**A runtime palette may change** every colour key and the polarity. The colour keys are the 26 required keys of a declared palette, the eight chart slots `cat-1` to `cat-8` among them. The polarity is `dark` or `light`. The seven optional keys, `error-fill`, `primary-fill` and `heat-1` to `heat-5`, may be given and are derived when absent, as in the config. The polarity picks which of the style plugin's answers apply, plus the native date picker's colour and `color-scheme`.

**A runtime palette may not change** the style plugin and its roles, the fonts, the density, the component sheets or the gradient mark. The build fixes those, and a runtime palette answers to the plugin the app was built with, as a declared palette does.

**The app keeps the rest.** Arena does not store a user's palette, load it at sign-in, draw the editor where the user picks colours, or decide who may change whose palette.

## How do I switch a runtime palette on?

Set `"runtimePalettes": true` in `arena.config.json` ([`config.md`](./config.md)). With the key, `arena build` does three more things.

- `arena build` writes `arena.runtime.generated.json` for the palette functions to read ([`cli.md`](./cli.md)).
- It adds `--arena-runtime-palettes:1` to `:root`.
- It emits the `.arena-polarity-dark` and `.arena-polarity-light` blocks. The blocks hold the plugin roles, the colour aliases, `--picker-invert` and `color-scheme` that depend on polarity.

A runtime palette applied to an element, `<html>` included, wins there over any palette the config declares. Without the key, `arena.generated.css` is what it is for a project that never heard of runtime palettes, and the functions below refuse. The names `polarity-dark` and `polarity-light` belong to those blocks, so no palette or plugin can take them.

## How do I check a runtime palette and turn it into a palette to apply?

`@dravensoft/arena-react/palette` and `@dravensoft/arena-angular/palette` are one module with no framework in it. The module runs in the browser and on a server that saves the palette. The module sits outside the root entry, so an app that never imports it ships none of it. Pass the contents of `arena.runtime.generated.json` as `data`. The file sits where `arena build` wrote it, which is `src` unless `-o` names another directory ([`cli.md`](./cli.md)). A bundler imports the JSON. Node ESM needs the `with { type: 'json' }` attribute, or `JSON.parse(readFileSync(path, 'utf8'))`.

```ts
import { arenaRuntimePalette } from '@dravensoft/arena-react/palette';
import data from './arena.runtime.generated.json' with { type: 'json' };

const { palette, reports } = arenaRuntimePalette('ocean', {
  polarity: 'light',
  colors: { 'base-100': '#fbfaf7', /* ...every required colour key... */ },
}, data);
```

| function | what it does |
| --- | --- |
| `arenaRuntimePalette(name, input, data)` | answers `{ palette, reports }`. `palette` is `{ name, polarity, properties }`, the custom properties to apply, and `reports` is the list of what the checks found |
| `arenaCheckPalette(input, data)` | answers only the reports |
| `arenaPaletteDeclarations(input, data)` | answers only the properties, as an object of name to value |

`input` is `{ polarity, colors }`. Each colour is a six-digit hex such as `#141010`, and the properties carry it in lower case. The types are `ArenaPolarity`, `ArenaPaletteInput`, `ArenaPaletteReport`, `ArenaRuntimeData` and `ArenaRuntimePalette`.

**A palette that fails a check is returned, not refused.** `reports` holds the rules and messages `arena check` prints for a declared palette. The rules are the ramp and colour-vision simulation, the text pairs, the axis, the ink on a fill, emphasis, the levels and the washes. Whether to apply a palette with reports, warn the user or turn it away is the app's decision. An empty list means the build would have said nothing.

**The functions throw** on input they cannot read. Data that is missing or of another shape throws a message naming `"runtimePalettes": true`. An input that is not an object, or a polarity that is neither `dark` nor `light`, throws too. So does a missing or malformed colour, a colour key Arena does not have, or only some of `heat-1` to `heat-5`. So does a name that is not kebab-case, that the config declares, that is a class the package ships, or that is `polarity-dark` or `polarity-light`. Check a palette with `arenaCheckPalette` on the server before it is saved.

## How do I apply a runtime palette?

Register the `palette` the function answered. Then it behaves like a declared one.

```tsx
import { registerArenaPalette, setArenaTheme } from '@dravensoft/arena-react';

registerArenaPalette(palette);
setArenaTheme(palette.name);
```

```ts
const theme = inject(ArenaThemeService);
theme.register(palette);
theme.set(palette.name);
```

In React `arenaPalettes()` and `useArenaPalettes()` list the declared palettes followed by the registered ones, in registration order. `setArenaTheme`, `useArenaTheme` and `toggleArenaTheme` accept a registered name. In Angular `runtimePalettes` is a signal of the registered palettes, `runtimePalette(name)` answers one or `null`, and `set`, `toggle` and `polarityOf` accept a registered name. `toggle` walks the declared palettes and then the registered ones. A name that is neither declared nor registered throws, and the message lists both.

The page paints it with the polarity class on `<html>` and each property set with `style.setProperty`. `ArenaPaletteScope` and `[arenaPalette]` accept a registered name too. An Angular overlay wears the palette in effect at its anchor, a scope's or the page's. **A scope can mount before the palette it names is registered.** Such a scope renders pending in both layers: no palette class and no properties, so its children inherit the page's palette, and a one-time `console.warn` names the missing palette. The scope paints as soon as that name is registered, which serves the flow of booting, fetching the user's palette and registering it. `useArenaPalette()` and `injectArenaPalette()` below a pending scope answer the scope's name. In React the scope judges a name only once `initArenaTheme` has run. Before that it draws `arena-<name>` with no properties, and a name the config declares keeps that class.

**Registration throws** in four cases. The config declares the name. The page's `:root` lacks `--arena-runtime-palettes:1`, and the message names `"runtimePalettes": true`. The polarity is neither `dark` nor `light`, or the name is not kebab-case. Or `properties` is wrong. A value is not a string, or a key is none of `--color-*`, `--level-*` and `--arena-palette`. A `--color-*` value is not `#rrggbb`, or a `--level-*` value is not a percentage such as `40%`. Or `--arena-palette` is missing or differs from the name. React accepts a registration before `initArenaTheme`. When the config that `initArenaTheme` then receives declares that name, the registration is dropped and a one-time `console.warn` names it.

## How do I remove a runtime palette?

Call `unregisterArenaPalette` in React or `ArenaThemeService.unregister` in Angular with the palette's name.

```tsx
import { unregisterArenaPalette } from '@dravensoft/arena-react';

unregisterArenaPalette('ocean');
```

```ts
const theme = inject(ArenaThemeService);
theme.unregister('ocean');
```

The name leaves `arenaPalettes()`, `useArenaPalettes()` and `runtimePalettes`. `set` and `setArenaTheme` throw for it, and `toggle` and `toggleArenaTheme` skip it. When it is the current palette the page follows the system, as it does with nothing stored, and both `arena-theme` and `arena-runtime-palette` are removed. When it is not the current palette both keys stay, since they belong to the current one. A scope naming it renders pending, and paints again if the name is registered. Registering a removed current palette does not make it current again. A name that is not registered returns `false` and changes nothing, a removal returns `true`, and a name the config declares throws. A user deleting a palette in the app's store is the moment to call it.

## How do I keep a runtime palette between visits?

The app keeps the palette; Arena keeps a copy to paint the first frame. When the active palette is a runtime one, the theme surface writes it to `localStorage['arena-runtime-palette']` beside `arena-theme`, and choosing a declared palette removes it. Removing the current runtime palette removes it too. The cache is not the source. The app loads the user's palette from its own store and registers it. Until then the cache stops the page from showing the base palette. The snippet in [How do I avoid a flash on first paint?](#how-do-i-avoid-a-flash-on-first-paint) reads the cache before anything loads.

## What does a runtime palette cost under a content security policy?

The theme surface writes every property with `style.setProperty`. That needs no `unsafe-inline` in `style-src`, and nothing a user types reaches a stylesheet as text, because each value is a validated hex or percentage. A server render that writes the palette as a `style` attribute does need `unsafe-inline` for styles, or a hash or nonce scheme your server controls. Whether to render it on the server is the app's choice. The no-flash snippet is an inline script, so a strict `script-src` needs a hash or a nonce for it.
