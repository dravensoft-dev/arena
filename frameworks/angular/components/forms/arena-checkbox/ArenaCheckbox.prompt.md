Arena checkbox, one independent choice, checked showing a crimson fill with a tick. Standalone,
`OnPush`, signal I/O. The host stays bare and out of layout. The root is a real `<label>` wrapping a real `<input type="checkbox">`. That pairing is what gives the control its role, its name and Space-to-toggle, without a single line of authored ARIA.

```html
<arena-checkbox label="Notify on failure" [checked]="notify()" (change)="notify.set($event)" />
<arena-checkbox label="Managed by policy" checked disabled />
<arena-checkbox label="I accept the terms" required name="terms" value="yes"
                [checked]="accepted()" (change)="accepted.set($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaCheckbox.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `checked` | primitive | `boolean` | `false` | Whether it is ticked. |
| `label` | primitive | `string` |  | Text beside the box. |
| `disabled` | primitive | `boolean` | `false` | Blocks toggling and dims it. |
| `required` | primitive | `boolean` | `false` | Must be checked for the form to submit. |
| `name` | primitive | `string` |  | Submitted with the form. |
| `value` | primitive | `string` |  | The value submitted under `name` when checked. |
| `change` | event | `boolean` |  | Toggled; carries the new checked state. |

<!-- @api end -->

**Do / Don't**
- The control is **controlled**. `checked` is what the consumer owns and pushes back in; the component
  never holds a copy, so a `(change)` you ignore is a checkbox that visibly does not move.
- **Always pass `label`.** The member is optional in the contract, and the accessible name comes from the
  wrapping `<label>`'s own text, so a checkbox without one announces nothing. If the name must
  live elsewhere on screen, the control is the wrong shape; reach for a labelled group instead.
- `change` carries the new boolean, not the DOM event. `change` is an output named after a native DOM event, so Angular would register both the output subscription and a host DOM listener. A consumer's `(change)` would then fire twice, and the inner input calls `stopPropagation()` to make it fire once. The cost is that a native `change` never reaches an ancestor, bind on the
  `<arena-checkbox>` itself.
- `disabled` and `required` land on the native input, never as `aria-disabled` or
  `aria-required`. The native attributes are what the accessibility tree reads, what removes the
  control from the Tab order, and what Arena's `:disabled`-family styling can match.
- The box and the tick are decoration: the `<span>` carries the fill and the `<svg>` the tick,
  and neither is the control. Do not attach a click handler to either, because the `<label>` already
  forwards a click to the input, and a second handler double-toggles.
- Don't use a checkbox for an immediate effect. A checkbox reads as a pending form value; a
  setting that applies the moment it flips is `<arena-switch>`.
- There is no indeterminate state. `aria-checked="mixed"` is in the pattern and not in this
  contract, so a partially-selected parent row needs a different control, not this one.

**By hand, in real Chromium**: none of these is provable in happy-dom. Run `bun run demos` and open `/frameworks/angular/components/forms/arena-checkbox/ArenaCheckbox.demo.generated.html`: - The tick's stroke reads cleanly on the crimson fill at 100% zoom. The tick's box is `--sp-3` inside an `--sp-5` square rather than filling it.
- Clicking the label text toggles the box, and so does Space with the control focused.
- `disabled` dims the whole control to 50% and the cursor turns to not-allowed over the label
  as well as the box.
- Tab to the control and the **box** takes a gold focus ring, even though the element the
  browser focused is the `opacity-0 size-0` native input. The `box` slot carries `[&:has(~input:focus-visible)]:shadow-[…]`, which reaches the input as a later sibling inside the same `<label>`. The input must stay after the box in the template, and moving it removes the ring with nothing failing.

**With reactive forms.** `ArenaCheckboxControl` from `@dravensoft/arena-angular/forms` binds the box to a form control holding a boolean, which replaces `checked` while the form is bound. The native `value` member is untouched: it is what a submitted form posts, not what the control holds. Binding the member the form replaces as well is a caller bug, and the layer warns about it once.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
