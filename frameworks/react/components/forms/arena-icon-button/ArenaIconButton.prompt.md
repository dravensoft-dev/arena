Icon-only button for toolbars and rows. Always pass `label` (accessible name in all states). Where there's room, use `showLabel` so you don't rely only on the hover tooltip (H6).

```tsx
<ArenaIconButton label="More options" icon="ph-bold ph-dots-three-vertical" />
<ArenaIconButton variant="solid" showLabel label="New project" icon="ph-bold ph-plus" />
<ArenaIconButton label="Pin this view" icon="ph-bold ph-push-pin" pressed={pinned} onClick={() => setPinned(!pinned)} />
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
| `onClick` | event |  |  | The button was activated, by pointer or by keyboard. |

<!-- @api end -->

- **`pressed` is what makes it a toggle, and leaving it off is a state of its own.** Passed, Arena writes `aria-pressed` and draws the on state with the accent tint a current `ArenaSideNav` item takes; omitted, the control is not a toggle at all. Never default it to `false`: on a plain button `aria-pressed="false"` announces a toggle that is off rather than a button, so every icon button in the app would read as an unpressed toggle.
- **A toggle keeps its `label` in both states.** Changing the name to carry the state is the workaround `pressed` exists to end: a screen reader then announces a different control instead of the same one in another state. Name what it does, not what pressing it will do next.
- Pass `icon` as a Phosphor class name: `icon="ph-bold ph-plus"`. Arena draws the `<i>` and hides it; `label` is what a screen reader announces.
- Don't pass an element as the icon. A single icon is a class name in Arena, which keeps the glyph inside Arena's own iconography and inside the markup Arena is answerable for.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
