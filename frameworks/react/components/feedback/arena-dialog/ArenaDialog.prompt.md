Modal for confirmations and short forms. Overlay with blur.

```tsx
<ArenaDialog open={o} onClose={close} eyebrow="Confirm" title="Deploy to production"
  footer={<><ArenaButton variant="ghost" onClick={close}>Cancel</ArenaButton><ArenaButton onClick={go}>Deploy</ArenaButton></>}>
  This action publishes build #4821 for all users.
</ArenaDialog>
```

<!-- @api GENERATED from contracts/api/components/ArenaDialog.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the dialog is shown. The host owns it. |
| `title*` | primitive | `string` |  | Names the dialog for assistive technology and heads it visually. Required: aria-labelledby points at it, and a modal with no name is worse than none at all. |
| `eyebrow` | primitive | `string` |  | A short kicker above the title. |
| `width` | primitive | `string` | `"calc(var(--sp-1) * 120)"` | A CSS width for the panel. It defaults to 480px, which each layer reaches in its own idiom, and the input overrides whichever. |
| `children` | slot |  |  | The dialog's body. |
| `footer` | slot |  |  | The action row, right-aligned. |
| `onClose` | event |  |  | The dialog was dismissed -- by Escape or by a scrim click. No payload. |

<!-- @api end -->

`title` is **required** and throws when missing. It is what names the dialog for
assistive technology, the panel's `aria-labelledby` points at it, and nothing
can derive a name for a dialog, because its subject is editorial. `open` is
required too and throws when absent; `open={false}` is the closed state and is
not an absence.

`width` is a **CSS string**, not a number; pass a token expression
(`width="calc(var(--sp-1) * 200)"`), never a bare `520`. A named size is not one of the things it takes: `width="md"` compiles, sets a declaration the browser drops, and leaves the panel at its default, so Arena reports that once at runtime rather than letting it pass in silence. The panel is capped at
`92vw` regardless, so a wide dialog still fits a narrow viewport.

Arena dismisses the dialog two ways, and both report through `onClose`: **Escape**
and a click on the backdrop. A third path is yours rather than Arena's, a button
in `footer` wired to the same handler, and it is worth naming only so the count
is not mistaken: `close` is one event with two sources inside the component, which
is what `contracts/api/components/ArenaDialog.json` declares. Opening
moves focus to the first focusable element inside the panel; closing returns it
to whatever had focus before, so a keyboard user lands back on the control that
opened the dialog. Tab and Shift+Tab wrap at the panel's edges rather than
walking out into the page behind the scrim.

- **Do** give every dialog a `title` that says what it is about, not what it is
  ("Delete project", never "Dialog").
- **Do** keep the dismissing control in `footer`, because Escape is a shortcut for it,
  never the only way out.
- **Don't** render a second modal inside an `ArenaDialog`. The trap is per panel, and
  two of them nested fight over the same Tab key.
- **Don't** put a `tabIndex={-1}` on content the user has to reach: it is how the
  trap decides what is focusable, so a control held out of the Tab order is a
  control the wrap skips over.

## Verifying the focus trap by hand

A suite proves the boundary wrap, because that is Arena's own `.focus()` call and
happy-dom honours it. It cannot prove the **interior**: that Tab from a control in
the middle reaches the next one, because that is the browser's native sequential
focus navigation, which Arena does not implement and happy-dom does not have. A
browser-driven gate was refused as this repo's fourth non-portable gate, so the
interior is checked by a person against this list.

Serve the tree with `bun run demos`, open
`frameworks/react/components/feedback/arena-dialog/ArenaDialog.demo.generated.html`, and check all of:

1. **Tab to "Open dialog" and press Enter.** Focus must land on **Cancel**, the
   first focusable inside the panel, not stay on the trigger.
2. **Tab once.** Focus moves to **Deploy**. This is the step no suite can make:
   Cancel is the first focusable and not the last, so Arena's handler does nothing
   and the browser moves focus on its own. If this fails, the trap is fighting
   native navigation rather than bounding it.
3. **Tab again.** Focus wraps from Deploy back to Cancel. This one is Arena's.
4. **Shift+Tab.** Focus wraps from Cancel back to Deploy.
5. **Escape.** The dialog closes and focus returns to "Open dialog".

If you drive this through CDP rather than by hand, one gotcha costs an afternoon:
a `rawKeyDown` does not activate a button. Enter must be dispatched as `keyDown`
carrying `text: '\r'`. Tab and Escape are fine as `rawKeyDown`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
