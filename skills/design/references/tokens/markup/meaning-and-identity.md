# Which colour means something, and which one identifies something?

Read this when your own markup draws a status, a tone, a category or a chart series, and you must pick between the aliases and the ramp.

**The aliases are in [`contracts/design/colors.css`](../../../../../contracts/design/colors.css)**:
`--crimson` and `--gold` are the two accents, with a soft wash beside each: `--crimson-soft` and `--gold-soft`. `--danger`,
`--success`, `--warning` and `--info` are the four status colours, with the same. `--bone` and
`--mute` are text at full strength and text held back. The aliases that hold text back and the soft washes read the levels, so they follow a level `arena build` raises for a palette. `--mute-2-disabled` holds a fixed 40%, because the disabled level is the one the scale never raises.
Each key of a palette's `colors` becomes `--color-<key>`, so `base-100` is `--color-base-100` and `base-content` is `--color-base-content`. [config.md](../../config.md#declare-your-skin) lists the keys.

**A status colour means something and a ramp colour identifies something, and neither does the
other's job.** The components hold that rule, and markup of yours holds it the same
way. Otherwise a reader learns that green is sometimes a category.

- **Meaning** is the four status colours. `arenaToneColor(tone)` from `@dravensoft/arena-react` or `@dravensoft/arena-angular` resolves the
  one a tone stands for, so a shape you draw yourself keeps meaning what the components mean by
  it.
- **Identity** is the eight ramp colours, `--color-cat-1` through `--color-cat-8`, in fixed order.
  The order is the identity, so slot three is slot three in every chart on the screen.
  `arenaCatColor`, `arenaCatIndex`, `arenaCatSurface`, `arenaCatTint`, `arenaCatSlotFor` and `arenaCatRotate` are there for a legend or a chip you draw. For a status tone, use `arenaToneColor`. [`exports.md`](../../exports.md#how-do-i-colour-a-legend-or-a-chip-of-my-own) shows how to use them, and [its React table](../../exports.md#what-does-the-react-package-export-besides-components) and [Angular table](../../exports.md#what-does-the-angular-package-export-besides-components) say what each returns.
