# Switching palettes and avoiding the first-paint flash

How do I switch between a dark and a light palette? How do I stop a flash of the wrong palette on first paint? What do `initArenaTheme`, `useArenaTheme`, `provideArenaThemes` and `ArenaThemeService` do? Read this when the config declares more than one palette.

Declare the palettes in `arena.config.json` first. [`config.md`](./config.md) covers the file. Exactly one palette is the default and reaches `:root`. Every other palette becomes a class, `.arena-<name>`, that goes on `<html>`.

## How do I switch palettes in React?

Call `initArenaTheme` once with the palettes your config declares. Read and set the choice with `useArenaTheme`.

```tsx
import { initArenaTheme, useArenaTheme } from '@dravensoft/arena-react';

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

`initArenaTheme` reads the stored choice. The function falls back to `prefers-color-scheme`, matched against each palette's polarity. Then the function puts the right class on `<html>`. Called with nothing, it answers `dark` and `light`.

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

Pass the same palettes your config declares. Call `set('light')` on the service, or `toggle()` to walk the palettes in order. `theme` is a signal, so a template reads it directly. With no providers the service answers `dark` and `light`.

## How do I avoid a flash on first paint?

Apply the class before your stylesheet loads. In React put the script in your HTML shell. In Angular put it in `index.html`.

```html
<script>
  (function () {
    var PALETTES = [               // every palette your arena.config.json declares, in its order
      { name: 'dark', polarity: 'dark' },
      { name: 'light', polarity: 'light' }
    ];
    var DEFAULT = 'dark';          // the palette your arena.config.json marks default
    try {
      var name = localStorage.getItem('arena-theme');
      if (!name) {
        var wants = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        for (var i = 0; i < PALETTES.length; i++) {
          if (PALETTES[i].polarity === wants) { name = PALETTES[i].name; break; }
        }
      }
      if (name && name !== DEFAULT && /^[a-z][a-z0-9-]*$/.test(name)) {
        document.documentElement.classList.add('arena-' + name);
      }
    } catch (e) {}
  })();
</script>
```

Set the list to your own palettes and `DEFAULT` to the palette your config marks default. Those two values are what the theme surface takes. A build with several palettes states them once, and the snippet cannot drift from the app.

The default reaches `:root` and wears no class. A snippet that names the wrong default puts a class on the very palette that must not have one.

## Why does the snippet read the media query?

On a first visit nothing is stored. The theme surface falls back to the first palette whose polarity matches the device. A snippet that reads only storage paints the default first. The app corrects it after boot, and that correction is the flash the snippet exists to prevent.
