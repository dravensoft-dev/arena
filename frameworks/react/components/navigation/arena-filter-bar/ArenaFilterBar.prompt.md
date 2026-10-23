A labelled row of filter controls above what they narrow, such as a table. The filters in effect show as removable chips, with a Clear all control after them. The bar holds no filter state.

```tsx
<ArenaFilterBar label="Deployment filters" applied={applied}
  onRemove={(filter) => setApplied(applied.filter((f) => f.id !== filter.id))} onClear={() => setApplied([])}>
  <ArenaSelect label="Region" options={regions} value={region} onChange={setRegion} />
  <ArenaSegmentedControl ariaLabel="Status" options={statuses} value={status} onChange={setStatus} />
</ArenaFilterBar>
```

<!-- @api GENERATED from contracts/api/components/ArenaFilterBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the group of filters, such as "Deployment filters", never "Filters". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. |
| `children*` | slot |  |  | The filter controls, in order: selects, inputs, segmented controls, comboboxes. Fills the bar's control row and never replaces the bar. Required, and guarded at runtime: a bar with no control filters nothing. |
| `applied` | array | `readonly ArenaAppliedFilter[]` | `[]` | The filters in effect, drawn as chips in a list after the controls. An empty list draws no chip row. |
| `clearable` | primitive | `boolean` | `true` | Whether Clear all is drawn while `applied` holds a filter. Every layer gates on this member and never on whether anything listens for `onClear`. |
| `onRemove` | event | `ArenaAppliedFilter` |  | A chip's remove button was activated; carries the whole filter. Once the host drops it from `applied`, focus moves to the chip now in its place, else the last chip, else the first control. A control the person has moved to since keeps focus. |
| `onClear` | event |  |  | Clear all was activated. Once the host empties `applied`, focus moves to the first control. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`group`).
<!-- @keys end -->

**The host owns every filter.** Pass the controls as children and write `applied` yourself. Each entry is `{ id, label }`, with `label` already formatted, such as "Region: Europe West". Whether a change of filter returns a table to page one is yours too.

**A chip's remove button fires `onRemove` with the whole filter.** Drop that filter from `applied` to remove the chip. `onClear` fires from Clear all; empty `applied` to answer it.

**Focus stays in the bar after a removal.** Once `applied` loses the chip, focus lands on the chip now in its place, or the last chip. With no chip left, and after Clear all, focus lands on the first control. A removal you refuse moves nothing. Focus never leaves a control the person has moved to since.

**The bar adds no keys and no tab stop.** Each control keeps its own keyboard, and each remove button is a tab stop. Tab order is the controls, then the chips, then Clear all.

**Clear all shows only while a filter is applied.** Pass `clearable={false}` to hide it even then.

**The bar stacks by its own width.** Below `--bp-sm` of its own container it becomes one column, whatever the viewport. Stacking reorders nothing, so tab order still matches reading order.

**Names.** `label` names the group, and a blank one throws. The locale's `filterBarApplied` names the chip list. `filterBarClear` is the Clear all text, and `filterBarClearLabel` its name. Each remove button reads `tagRemove` and then the chip's text.

**Do**
- Name the group by what it narrows, such as "Deployment filters", never "Filters".
- Put a label on each control, or an `ariaLabel` on a segmented control.

**Don't**
- Don't describe the filters as data for the bar to draw; pass the controls themselves.
- Don't colour a chip, or give one its own menu.
- Don't reach for `clearable={false}` casually: a long list of filters nobody can empty at once is a trap.

**By hand.** The wrap and the one-column shape at phone width, with a real select, input and segmented control inside. The controls' baselines line up when one has no label. After a keyboard removal, focus lands on the next chip. A screen reader announces the group name and the list name.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
