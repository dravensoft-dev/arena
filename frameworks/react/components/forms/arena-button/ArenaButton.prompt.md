Action button. The main action is the default emphasis, `arena-emphasis-primary` (crimson), maximum one per view.

```tsx
<ArenaButton onClick={deploy}>Deploy</ArenaButton>
<ArenaButton icon="ph-bold ph-arrow-counter-clockwise" className="arena-emphasis-secondary">Roll back</ArenaButton>
<ArenaButton iconRight="ph-bold ph-caret-down" className="arena-emphasis-secondary">Actions</ArenaButton>
<ArenaButton className="arena-emphasis-ghost arena-size-sm">Cancel</ArenaButton>
<ArenaButton destructive loading>Deleting…</ArenaButton>
```

<!-- @api GENERATED from contracts/api/components/ArenaButton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The button's label. Sits between the two icons when both are given. |
| `destructive` | primitive | `boolean` | `false` | Whether the action destroys or removes something. Destructive draws the danger outline whatever emphasis the button is given: danger is never filled outside ArenaConfirmDialog's final confirmation. |
| `icon` | primitive | `string` |  | Phosphor class name drawn before the label. Replaced by the spinner while loading. |
| `iconRight` | primitive | `string` |  | Phosphor class name drawn after the label: a caret on a menu trigger, an arrow on a next action. |
| `loading` | primitive | `boolean` | `false` | Replaces the leading icon with a spinner and blocks activation. The spin slows under reduced motion rather than stopping: a frozen spinner reads as a hung process. |
| `disabled` | primitive | `boolean` | `false` | Blocks activation and dims the control. Implied by loading. |
| `type` | enum | `ArenaButtonType` | `"button"` | Native button behaviour. Defaults to 'button' so a button inside a form does not submit it by accident. |
| `name` | primitive | `string` |  | Submitted with the form, when the button submits one. |
| `value` | primitive | `string` |  | The value submitted under `name`. |
| `autoFocus` | primitive | `boolean` | `false` | Focused on mount. |
| `form` | primitive | `string` |  | The id of the form this button belongs to, when it is not a descendant of it. |
| `tabStop` | primitive | `boolean` | `true` | Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. Arena's own table is NOT that composite: its grid deliberately has no step-in, so a control in a cell keeps its place in the page Tab sequence and setting this false there takes away its only keyboard route, since the cursor moves by cell and Enter activates the row. |
| `onClick` | event |  |  | The button was activated, by pointer or by keyboard. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`fill`](../../../../VOCABULARY.md#fill): `arena-fill`, `arena-fit` (default). Write one as `className="arena-fill"` on the component, or on a container whose components should all take it.

**Answers** [`emphasis`](../../../../VOCABULARY.md#emphasis): `arena-emphasis-ghost`, `arena-emphasis-primary` (default), `arena-emphasis-secondary`. Write one as `className="arena-emphasis-ghost"` on the component, or on a container whose components should all take it.

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`button`](../../../../../contracts/behaviour/button.json):
- `Space`: activate.
- `Enter`: activate.
<!-- @keys end -->
The `arena-emphasis-*` classes pick primary, secondary or ghost, and `destructive` adds the danger outline. The `arena-size-*` classes pick sm, md or lg. Props: icon, iconRight, loading, disabled. A vocabulary class decides the width: `className="arena-fill"` spans the container, and with no class it fits its label.

- Pass `icon` and `iconRight` as Phosphor class names: `icon="ph-bold ph-plus"`. Arena draws each `<i>` and hides it from assistive technology; `icon` sits before the label, `iconRight` after it. While `loading`, the spinner replaces the leading icon.
- Keyboard focus draws Arena's own gold ring at every emphasis, including `arena-emphasis-ghost`, whose border is transparent, and the ring draws over any hover shadow. The treatment comes from the manifest, so nothing you write turns it on and no `className` of yours is how to change it.
- Don't pass an element as `icon` or `iconRight`. A single icon is a class name in Arena, which keeps the glyph inside Arena's own iconography and inside the markup Arena is answerable for.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
