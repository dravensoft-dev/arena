# Which units does Arena use, and which do I use in my markup?

Read this when your own markup sets a size, a breakpoint or a measurement in script, and you need to know whether it follows the reader's text setting.

**Every dimension sits on one of three axes**, and the axis decides the CSS unit. A token on the `scales` axis is emitted in `rem` and grows when the reader raises the text size in the browser. That covers the type scale `--fs-*`, the control text `--dz-text*`, the icon sizes and the breakpoints `--bp-*`. A token on the `follows` axis is a ratio of a size that already grows, so it is a plain number or an `em`. A token on the `fixed` axis stays in `px` on purpose.

**Space, radii, borders and rings are `px` on purpose.** The `--sp-*` steps, the density box sizes (`--dz-ctl-h`, `--dz-row-*`, `--dz-stack`), the corner radii `--r-*`, the border widths `--bw-*` and the focus rings do not scale with the text. A control height is a floor, not a size the text is fitted into. A button holding larger text grows taller by its content and never shorter than its token. Boxes therefore grow by least height, and the gaps between them stay where they are. The widths that frame a column of text follow the text: grid and board columns and scroller items are on the `scales` axis.

**Your own markup reads tokens and writes no `px` for text.** Set a size with `text-title-section` or `var(--step-title-section)`, as [`type`](./type.md) names the roles, and a heading follows the reader without a line of code from you. A `px` written beside a token takes the text out of the reader's hands. A width that frames text goes in `rem`, `em` or `ch`, not in `px`.

**The Tailwind breakpoints `sm:`, `md:` and `lg:` are in `em`.** Media queries answer in `em` against the browser default font size, and no sheet of yours moves them. The variant `md:` is `48em`, which is 768px at the browser default. A reader who raises the default text size meets the layout change at a wider window, since the same `em` is then more pixels.

**In script, read a breakpoint with `arenaReadBreakpoint`.** React and Angular both export it. The function takes `sm`, `md` or `lg` and returns the width in pixels, resolved against the root font size at the moment of the call. Never call `parseFloat` on a token. The value `48rem` would read as 48. A project that re-declares `--bp-md` in `px` gets those pixels back.

**A sheet that sets the root font size moves `rem` and leaves `em` alone.** Take a project whose own sheet says `html { font-size: 62.5% }`. Every `rem` token then follows that root, so `--bp-md` reads as 480px through `arenaReadBreakpoint`, and a font size in `rem` draws smaller. An `em` media query still follows the browser default, so `md:` still fires at 768px. Nothing throws, and the two readings differ by design: the script follows the root, the query follows the reader's browser. If you change the root, test the layout at both, and keep the sizes of text in `rem` so the root and the reader both reach them.

**Where the numbers live.** The value of each token, with its pixel at the browser default, is in the pages under [`../scales/`](../scales/index.md). The roles your markup reads for type are in [`type`](./type.md).
