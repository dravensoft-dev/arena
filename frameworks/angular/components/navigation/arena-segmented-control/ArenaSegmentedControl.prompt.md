Arena segmented control, a compact inline filter over mutually exclusive options. **A real radio
group, never a tab list**, and it carries no crimson: a filter never outweighs the action beside
it. Standalone, `OnPush`, signal I/O. The host **is** the track, so it carries `role="radiogroup"`,
the accessible name and the focus ring.

```html
<arena-segmented-control ariaLabel="Time range" [options]="ranges" [value]="range()"
                         (change)="range.set($event)" />

<arena-segmented-control ariaLabel="Status" size="sm" [options]="statuses"
                         defaultValue="failing" (change)="filter.set($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaSegmentedControl.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `options*` | array | `readonly ArenaSegmentOption[]` |  | The options, in order. Two to four with one-word labels. |
| `value` | primitive | `string` |  | The selected option's value. Omit and pass `defaultValue` to let it govern itself. |
| `defaultValue` | primitive | `string` |  | The initially selected value when uncontrolled. Defaults to the first option. |
| `size` | enum | `ArenaSegmentedControlSize` | `"md"` | Compact or default. |
| `ariaLabel*` | primitive | `string` |  | Names what is being filtered: "Time range", not "Filter". A radio group with no accessible name is announced unlabelled. |
| `name` | primitive | `string` |  | Shared name for the underlying radios; generated when omitted. |
| `change` | event | `string` |  | A different option was chosen; carries its value. |

<!-- @api end -->

```ts
readonly ranges: ArenaSegmentOption[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];
```

**It replaces a Material control that got one thing wrong, and this one must not inherit it.**
`MatButtonToggleGroup` applies `role="group"` even in its exclusive single-selection mode, the
delegated entry carried a `roles.group` exception saying so, citing Material's own docs. Arena
renders `role="radiogroup"` itself, so this binding has **no exceptions**, and the compliance suite
asserts the role by name rather than by pattern so that a regression reads as what it is.

**Do / Don't**
- **`ariaLabel` is required** and names what is being *filtered*, "Time range", not "Filter". A
  radio group with no accessible name is announced unlabelled, and a name that only says the
  control is a filter satisfies the requirement while telling a screen-reader user nothing.
- **Two to four options with one-word labels.** The track stops being compact past that; a longer
  set is `arena-radio-group`, and a set that switches *views* rather than filtering one is
  `arena-tabs`.
- It works controlled or not: pass `value` and it is yours, or pass `defaultValue` and the track
  remembers its own choice. With neither, **the first option is selected**: a filter showing
  nothing selected over an unfiltered list is lying about itself.
- **The roving tab stop, the arrow keys and Space are the platform's.** Each segment is a native
  `<input type="radio">` inside its `<label>`, sharing one `name`. Arena authors no `tabindex`.
- `name` is the radios' shared form name, generated per instance when omitted, and never reaches a
  screen reader. Two tracks sharing one name rove as a single group.
- The focus ring is on the **track**, through `focus-within:`, because the element that takes focus
  is an `opacity-0 size-0` input. That is the whole reason the ring is not on the segment.
- Don't reach for it as a form field. It is a filter; a mutually exclusive answer inside a form,
  with labels that need room, is `arena-radio-group`.
- Don't give the selected segment the brand colour. It lifts on `bg-neutral` with a shadow instead,
  and no state of the control reaches for `primary` at all.

**By hand, in real Chromium**: the platform behaviour above is what happy-dom cannot show. Run
`bun run demos` and open
`/frameworks/angular/components/navigation/arena-segmented-control/ArenaSegmentedControl.demo.generated.html`:
- Tab into the track **once**: the ring appears around the whole track, not around a segment, and
  Tab again leaves it rather than walking the segments.
- Arrow keys move the selection along the track and wrap at both ends.
- The selected segment's shadow reads as a lift against the track's own surface at `sm` as well as
  `md`, `sm` is the size that decides whether the lift is visible at all.
- Two tracks on the page select independently, which is the generated `name` working.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
