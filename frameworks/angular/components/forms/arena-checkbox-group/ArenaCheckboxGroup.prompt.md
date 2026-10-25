Arena checkbox group, a set of independent choices reported as one value. Standalone, `OnPush`, signal I/O. The host **is** the group: `<arena-checkbox-group>` is the element you place. The group holds `value`, the ticked boxes' values, and each `arena-checkbox` declares its own `value`.

```html
<arena-fieldset legend="Notify me about" [error]="notify().length === 0 ? 'Choose at least one.' : undefined">
  <arena-checkbox-group ariaLabel="Notify me about" name="notify" [value]="notify()" (valueChange)="notify.set($event.values)">
    <arena-checkbox value="deploys" label="Deploys" />
    <arena-checkbox value="incidents" label="Incidents" />
    <arena-checkbox value="digest" label="Weekly digest" />
  </arena-checkbox-group>
</arena-fieldset>
```

<!-- @api GENERATED from contracts/api/components/ArenaCheckboxGroup.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names the group: what the choices are about, not that they are choices. Required, and guarded at runtime: a group with no accessible name is announced unlabelled, and each box's own label says what that box is, never what the set is for. "Notify me about", not "Options". Distinct from `name`, which is the boxes' shared form name and never reaches a screen reader. |
| `content` | slot |  |  | The Checkboxes, each with a `value`: the set holds that value while the box is ticked. The group owns each box's ticked state, and how the two are wired is not this contract's business. |
| `value` | array | `readonly string[]` | `[]` | The ticked boxes' values, in the order they were ticked. A value that matches no box is kept rather than dropped. |
| `name` | primitive | `string` |  | Shared form name for the underlying checkboxes, so a form submits every ticked value under one key; generated when omitted or blank. |
| `disabled` | primitive | `boolean` | `false` | Whether the whole group is unavailable. Every box it holds is disabled whatever its own disabled says, and the group reflects aria-disabled. |
| `valueChange` | event | `ArenaValueSet` |  | A box was ticked or unticked; carries the whole set after the change. The native change of the inner box is never stopped, so a listener on the document hears it; this event carries the value. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`group`).
<!-- @keys end -->

**The children pull, and the parent does not push.** `arena-checkbox` injects the `ArenaCheckboxGroupState` the group provides, when there is one. Inside a group the box reads the shared form name, its ticked state and the group's disabled state from it. The box reports its toggle back through the same state. Outside a group the box is a lone checkbox. A box under `@for` or inside a component of yours is in the group, because the box finds the group's state wherever it sits inside it.

`ariaLabel` names the set and is **required**, throwing when blank. The label says what the choices are about, never that they are choices. `name` is the boxes' shared form name, so a native form submits every ticked value under one key, and it never reaches a screen reader. One is generated per instance when omitted.

**The group works controlled or not.** Pass `value` and it draws yours, so write `$event.values` back on `valueChange`; omit it and the group keeps the set itself. `valueChange` carries an `ArenaValueSet`, the whole set after the toggle, exactly once per toggle. The set keeps the order the boxes were ticked in and adds a value once. A value matching no box is kept. A bound `value` you never write back is drawn until the first toggle, and the group keeps its own set from then until `value` changes.

**Every box needs a `value`, and the group owns its ticked state and its form name.** A box with no value throws inside a group. A `checked` bound on a box inside a group is ignored, the group's `value` is drawn, and the layer warns once; a literal `[checked]="false"` goes unseen. A `name` on a box is replaced by the group's. A box's own `valueChange` still fires, before the group's. A form directive on a box inside a group still hears each toggle as a boolean but never decides whether the box is ticked: bind the form to the group.

**The group draws no legend, hint or error.** A visible name, a line of help and a message about the set ("Choose at least one") come from an `arena-fieldset` around it. Make the legend and `ariaLabel` say the same words. There is no "select all" parent and no `required`: a native checkbox's `required` means that one box must be ticked, and "at least one" is the fieldset's error.

**Do / Don't**
- **Do** use it for a handful of independent choices that are all worth seeing at once. Past a dozen, a searchable multiple choice serves better.
- **Do** disable the group rather than each box when the whole set is unavailable: the group reflects `aria-disabled` and every box is disabled whatever its own `disabled` says.
- **Don't** hold the options as data. Each box is a component, so it carries its own label.
- **Don't** reach for it for a single choice of one among many; that is `arena-radio-group`.

**With reactive forms.** `ArenaCheckboxGroupControl` from `@dravensoft/arena-angular/forms` goes on the group rather than on a box, and the form control holds a `string[]`. A `null` or a value that is not an array draws nothing ticked, and every toggle reports a fresh array. Disabling the form control disables the group, and with it every box inside. Binding `value` as well as the form is a caller bug, and the layer warns about it once.

**By hand.** Tab visits each box once and Space toggles it. A native form submits every ticked value under the one `name`. A screen reader announces the group by its name on entering it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
