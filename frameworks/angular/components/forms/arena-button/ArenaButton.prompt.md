Arena action button, one primary per view, and danger stays outline. Standalone, `OnPush`,
signal I/O. The host stays bare and unstyled: Arena's own styling lands on a real `<button>`
inside it, because the element carrying the behaviour contract must be the element the browser
already knows how to focus, activate and disable.

```html
<arena-button (click)="save()">Save changes</arena-button>
<arena-button variant="secondary" size="sm">Cancel</arena-button>
<arena-button variant="danger" icon="ph-bold ph-trash" (click)="confirmDelete()">Delete project</arena-button>
<arena-button variant="ghost" iconRight="ph-bold ph-caret-down">More</arena-button>
<arena-button loading>Deploying</arena-button>
<arena-button type="submit" form="project-form" full>Create project</arena-button>
```

<!-- @api GENERATED from contracts/api/components/ArenaButton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The button's label. Sits between the two icons when both are given. |
| `variant` | enum | `ArenaButtonVariant` | `"primary"` | Which action this is. Danger is outline, never filled. |
| `size` | enum | `ArenaControlSize` | `"md"` | Height, from the density tokens, so the button re-densifies inside .arena-compact. |
| `icon` | primitive | `string` |  | Phosphor class name drawn before the label. Replaced by the spinner while loading. |
| `iconRight` | primitive | `string` |  | Phosphor class name drawn after the label: a caret on a menu trigger, an arrow on a next action. |
| `loading` | primitive | `boolean` | `false` | Replaces the leading icon with a spinner and blocks activation. The spin slows under reduced motion rather than stopping: a frozen spinner reads as a hung process. |
| `full` | primitive | `boolean` | `false` | Stretches to the container's width. |
| `disabled` | primitive | `boolean` | `false` | Blocks activation and dims the control. Implied by loading. |
| `type` | enum | `ArenaButtonType` | `"button"` | Native button behaviour. Defaults to 'button' so a button inside a form does not submit it by accident. |
| `name` | primitive | `string` |  | Submitted with the form, when the button submits one. |
| `value` | primitive | `string` |  | The value submitted under `name`. |
| `autoFocus` | primitive | `boolean` | `false` | Focused on mount. |
| `form` | primitive | `string` |  | The id of the form this button belongs to, when it is not a descendant of it. |
| `tabStop` | primitive | `boolean` | `true` | Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. ArenaTable's actions column is where this one is needed: an ArenaButton inside a row of a grid. |
| `click` | event |  |  | The button was activated, by pointer or by keyboard. |

<!-- @api end -->

**Do / Don't**
- Use `variant="danger"` for a destructive action: transparent background, border and text in
  `--error`. That is the danger convention, and the only filled danger surface in Arena is
  `ArenaConfirmDialog`'s final confirmation.
- `loading` implies `disabled`: it swaps the leading icon for a spinner and blocks activation,
  so there is no need to set both. The spin **slows** under `prefers-reduced-motion` rather
  than stopping, because a frozen spinner reads as a hung process; that answer comes from the
  shared design layer, not from this component.
- `icon` and `iconRight` are Phosphor class-name strings Arena draws, never slots. That is the
  single-icon convention, and it is why this component projects a label and nothing else.
- Set `type` explicitly when the button sits in a form. It defaults to `button` on purpose: a
  bare `<button>` inside a form silently defaults to `submit`, which is the footgun this member
  exists to make explicit. Use `form` only when the button is **not** a descendant of the form
  it submits.
- Reach for `tabStop="false"` only inside a composite that manages its own focus (a grid with
  a roving tab stop, a menu) where reaching this control by Tab would be a second way in. It
  writes `tabindex="-1"` and the control stays programmatically focusable. A positive tab order
  is not expressible and never should be.
- Don't use `disabled` to mean "this action is not available yet" on a control the user must
  discover. A disabled button is unreachable by Tab and announces nothing about why; prefer
  keeping it enabled and reporting the reason on activation.
- Don't wrap `<arena-button>` in another button or an anchor. It renders a real `<button>`, and
  nesting interactive elements is invalid regardless of how it looks.
- Don't rely on click delegation from an ancestor. `click` is an output named after a native
  DOM event, and Angular then registers **both** the output subscription and a host DOM
  listener, so a consumer's `(click)` would fire twice on every press. The inner button calls
  `stopPropagation()` to make it fire once, which is the whole reason the event does not reach
  ancestors. Bind `(click)` on the `<arena-button>` itself. `type="submit"` still submits: the
  default action is untouched, only propagation is.

**By hand, in real Chromium**: none of these is provable in happy-dom. Run `bun run demos` and
open `/frameworks/angular/components/forms/arena-button/ArenaButton.demo.generated.html`:
- With `loading` set, the spinner turns; with `prefers-reduced-motion: reduce` forced in
  DevTools' Rendering pane, it keeps turning and only slows.
- `active:scale-98` gives a real press response, and the focus ring is visible on keyboard
  focus for every one of the four variants, including `ghost`, whose border is transparent.
- `full` spans the row. The host is bare, so it carries `display: contents` to stay out of
  layout; without that it blockifies to shrink-to-fit as a flex item and `w-full` measures the
  shrunk host instead of the row. That defect shipped in batch 1 and this page is what found it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
