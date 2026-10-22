# Switching palettes and avoiding the first-paint flash

How do I switch between a dark and a light palette? How do I stop a flash of the wrong palette on first paint? What do `initArenaTheme`, `useArenaTheme`, `provideArenaThemes` and `ArenaThemeService` do? Read this when the config declares more than one palette.

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
  return <ArenaButton onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</ArenaButton>;
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

`useArenaPalette()` and `injectArenaPalette()` answer the palette of the nearest scope above, and the page theme when there is none. A palette name the theme config does not declare throws, listing the declared ones.

**A subtree takes** the component sheets, the project's own Arena Tailwind utilities, the colour aliases and the colour-mix washes, the ink levels, `color-scheme`, `--picker-invert` and the scrim. A style-plugin class and a density class go on any element the same way, and the nearest one wins. A nested plugin keeps the high-contrast widths and the hero fit. Angular overlays take the palette, style plugin and density of their trigger. The overlays are the menu, popover, tooltip, combobox and multiselect, and through them the split button and the side-nav item. React panels stay in the subtree.

**A subtree does not take** the page canvas, which follows the root's palette. A subtree takes no ground either unless something paints one. `ArenaPaletteScope` paints `bg-base-100 text-base-content`, and a bare class paints nothing, so a section wearing only `arena-light` keeps the ground behind it. Surfaces mounted elsewhere, which are dialogs, sheets, the confirm queue, the command palette, onboarding and the toast host, take the palette of where they are mounted. An island that wants its own toasts mounts a toast host inside it.

**A bare class is not a scope.** The readers see an `ArenaPaletteScope` and nothing else, so `useArenaPalette()` under a `<section class="arena-light">` answers the page theme. Use the scope when code below the element reads the palette, such as a canvas chart, and the class when markup alone is enough.

## When does a palette get stored?

Each layer stores only a user's choice. React's `setArenaTheme`, `toggleArenaTheme` and the setter `useArenaTheme` returns write the `arena-theme` key, and so do Angular's `set` and `toggle`. Neither `initArenaTheme` nor injecting the service writes it. Until a choice is stored the page follows the system. Remove the `arena-theme` key to follow the system again. In React call `initArenaTheme(themes)` after removing it, and in Angular the next load follows the system. Nothing listens for a change of the system setting while the page is open.

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
          cached.name === stored && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(stored) &&
          (cached.polarity === 'dark' || cached.polarity === 'light');
        for (var key in props) {
          if (!fits) break;
          var val = props[key];
          fits = Object.prototype.hasOwnProperty.call(props, key) && typeof val === 'string' &&
            (key === '--arena-palette' ? val === stored
              : /^--color-[a-z0-9-]+$/.test(key) ? /^#[0-9a-f]{6}$/.test(val)
              : /^--level-[a-z0-9-]+$/.test(key) && /^\d{1,3}%$/.test(val));
        }
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

Set the list to your own palettes and `DEFAULT` to the palette your config marks default. The theme surface takes the same two values. Keep both copies equal, or a palette added to one is a palette the first paint never shows. The snippet reads the key the surface writes, `arena-theme`, and it treats a stored name the build no longer declares as a first visit, as the surface does. A runtime palette is the one exception. A runtime palette has a name the config does not declare, and the `arena-runtime-palette` key holds the cache for it. For that name the snippet puts the `arena-polarity-<polarity>` class on `<html>` and sets each cached property with `style.setProperty`. The snippet accepts the cache on the surface's own checks. The name is kebab and equals the stored one, and the polarity is `dark` or `light`. `--color-*` values are lower-case `#rrggbb`, `--level-*` values look like `40%`, and `--arena-palette` equals the name. A cache that fails any check is a first visit.

The default reaches `:root` and also has its class, `.arena-dark` in Arena's own palettes. The theme surface leaves `<html>` bare for the default. A snippet that names the wrong default puts on `<html>` the class of the palette the theme surface leaves bare, or leaves a palette that needs its class without it.

## Why does the snippet read the media query?

On a first visit nothing is stored. The theme surface falls back to the first palette whose polarity matches the device. A snippet that reads only storage paints the default first. The app corrects it after boot, and that correction is the flash the snippet exists to prevent.
