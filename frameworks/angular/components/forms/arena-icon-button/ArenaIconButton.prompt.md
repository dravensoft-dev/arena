Arena icon-only button, an action compact enough to carry no visible text, and an accessible
name in every state regardless. Standalone, `OnPush`, signal I/O. The host stays
bare and out of layout: Arena's own styling lands on a real `<button>` inside it, because the element
carrying the behaviour contract must be the element the browser already knows how to focus,
activate and disable.

```html
<arena-icon-button icon="ph-bold ph-trash" label="Delete project" (click)="confirmDelete()" />
<arena-icon-button icon="ph-bold ph-plus" label="New project" variant="solid" (click)="create()" />
<arena-icon-button icon="ph-bold ph-pencil-simple" label="Rename" size="sm" (click)="rename()" />
<arena-icon-button icon="ph-bold ph-download-simple" label="Export CSV" showLabel (click)="export()" />
<arena-icon-button icon="ph-bold ph-arrow-clockwise" label="Retry" disabled />
<arena-icon-button icon="ph-bold ph-push-pin" label="Pin this view" [pressed]="pinned()" (click)="pinned.set(!pinned())" />
```

<!-- @api GENERATED from contracts/api/components/ArenaIconButton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `icon*` | primitive | `string` |  | Phosphor class name, e.g. 'ph-bold ph-plus'. Arena draws the <i> and hides it from assistive technology; `label` is the accessible name. |
| `label*` | primitive | `string` |  | The accessible name, present in every state. Also the visible text when showLabel is set, and the title attribute when it is not. |
| `size` | enum | `ArenaControlSize` | `"md"` | Height, from the density tokens: the same scale ArenaButton uses, so the two re-densify together in a toolbar. |
| `variant` | enum | `ArenaIconButtonVariant` | `"ghost"` | Visual treatment. |
| `showLabel` | primitive | `boolean` | `false` | Shows the label as text beside the icon (H6). Don't rely on the title alone on touch or keyboard surfaces. |
| `pressed` | primitive | `boolean` |  | Whether this control is a toggle, and whether it is currently on. Present, Arena writes aria-pressed and draws the on state with the same accent tint a current ArenaSideNav item takes, so "this one is on" is one statement across the library; absent, the control is not a toggle at all. The tri-state is the point and a default of false would destroy it: aria-pressed="false" on a plain button announces a toggle that is off rather than a button, so every ArenaIconButton in the system would announce as an unpressed toggle. The label does NOT change with the state, which is what the button pattern means by a toggle: a control that renames itself is announced as a different control rather than as the same one in another state. |
| `disabled` | primitive | `boolean` | `false` | Blocks activation and dims the control. |
| `type` | enum | `ArenaButtonType` | `"button"` | Native button behaviour. Defaults to 'button' so an icon button inside a form does not submit it by accident. |
| `name` | primitive | `string` |  | Submitted with the form, when the button submits one. |
| `value` | primitive | `string` |  | The value submitted under `name`. |
| `autoFocus` | primitive | `boolean` | `false` | Focused on mount. |
| `form` | primitive | `string` |  | The id of the form this button belongs to, when it is not a descendant of it. |
| `tabStop` | primitive | `boolean` | `true` | Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. |
| `click` | event |  |  | The button was activated, by pointer or by keyboard. |

<!-- @api end -->

**Do / Don't**
- `label` is **required and is the accessible name**, not a decoration. It is the `aria-label` in
  every state, the visible text under `showLabel`, and the `title` when there is none. An icon
  button without it announces nothing at all, which is why this input has no default.
- **`pressed` is what makes it a toggle, and its absence is a state of its own.** Bound, Arena
  writes `aria-pressed` and draws the on state with the accent tint a current `arena-side-nav`
  item takes; unbound, the control is not a toggle at all. Never default it to `false`: on a
  plain button `aria-pressed="false"` announces a toggle that is off rather than a button, so
  every icon button in the app would read as an unpressed toggle.
- **A toggle keeps its `label` in both states.** Changing the name to carry the state is the
  workaround `pressed` exists to end: a screen reader then announces a different control instead
  of the same one in another state. Name what it does, not what pressing it will do next.
- `icon` is a Phosphor class-name string Arena draws inside an `aria-hidden` `<i>`, never a slot.
  That is the single-icon convention, and it is why this component projects nothing.
- The `title` is dropped the moment `showLabel` is set. A title beside a visible label makes the
  browser draw a tooltip repeating what is already on screen.
- Don't rely on the `title` alone on a touch or keyboard surface, because a title appears on pointer
  hover and nowhere else. Set `showLabel`, or reach for `arena-tooltip` on the trigger.
- `variant="solid"` fills with the brand and is for the one primary action in a dense toolbar.
  `ghost` is the default and the right answer nearly always; a row of solid icon buttons has no
  hierarchy left to spend.
- There is no `danger` variant, and that is the danger convention rather than an omission: a
  destructive action needs a word, so use `<arena-button variant="danger">`.
- `size` reads the same density tokens `arena-button` does, so the two re-densify together in a
  toolbar. Set the same `size` on both or they will not line up.
- Reach for `tabStop="false"` only inside a composite that manages its own focus (a grid with a
  roving tab stop, a menu) where reaching this control by Tab would be a second way in.
- Don't rely on click delegation from an ancestor. `click` is an output named after a native DOM
  event, and Angular then registers **both** the output subscription and a host DOM listener, so
  a consumer's `(click)` would fire twice on every press. The inner button calls
  `stopPropagation()` to make it fire once, which is the whole reason the event does not reach
  ancestors. Bind `(click)` on the `<arena-icon-button>` itself; `type="submit"` still submits,
  because the default action is untouched and only propagation is.

**By hand, in real Chromium**: none of these is provable in happy-dom. Run `bun run demos` and
open `/frameworks/angular/components/forms/arena-icon-button/ArenaIconButton.demo.generated.html`:
- The focus ring is visible on keyboard focus for both variants, including `ghost`, whose
  background is transparent.
- Without `showLabel` the control is square at every size, and the glyph is optically centred
  rather than merely boxed in the middle.
- Hovering shows the `title`, and setting `showLabel` stops it appearing at all.
- `disabled` dims to 45% and the cursor turns to not-allowed; both come from `:disabled`
  variants, so they prove the native attribute is really set.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
