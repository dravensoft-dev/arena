Arena single-selection group, governs the value and distributes it to its `arena-radio`
children. Standalone, `OnPush`, signal I/O. The host **is** the radiogroup: it carries the role,
the accessible name and the column layout, so there is no wrapper inside it.

```html
<arena-radio-group ariaLabel="Deployment target" name="env" [value]="target()"
                   (change)="target.set($event)">
  <arena-radio value="production" label="Production" hint="Serves real traffic" />
  <arena-radio value="staging" label="Staging" />
  <arena-radio value="qa" label="QA" [disabled]="!canReachQa()" />
</arena-radio-group>
```

<!-- @api GENERATED from contracts/api/components/ArenaRadioGroup.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names the group: what is being chosen, not that it is a choice. Required, and guarded at runtime: a radiogroup with no accessible name is announced unlabelled, and each option's own label says what that option is, never what the set is for. "Deployment target", not "Options". Distinct from `name`, which is the radios' shared form name and never reaches a screen reader. |
| `content` | slot |  |  | The Radios. An option never holds a selected state of its own -- the group owns it, and how the two are wired is each layer's business rather than this contract's. |
| `value` | primitive | `string` |  | The selected option's value. |
| `name` | primitive | `string` |  | Shared name for the underlying radios; generated when omitted. |
| `change` | event | `string` |  | A different option was chosen; carries its value. |

<!-- @api end -->

**The children pull; the parent does not push.** `arena-radio` injects a
`ArenaRadioGroupState` the group provides and reads the shared name and the selected value from it,
reporting a choice back through it. Nothing is injected into the option, which is why none of that
coordination is a member of either contract and why an option outside a group is a DI error rather
than a silently inert control.

**Do / Don't**
- **`ariaLabel` is required.** It names *what is being chosen*, "Deployment target", not
  "Options". Each option's own label says what that option is, never what the set is for, so a
  group without this is announced unlabelled.
- `ariaLabel` is not `name`. `name` is the radios' shared form name and never reaches a screen
  reader; it is generated per instance when omitted, which matters because **two groups sharing one
  name rove as a single group**.
- **The roving tab stop, the arrow keys and Space are the platform's, not Arena's.** The options
  are native `<input type="radio">` sharing one `name`, and that is the entire mechanism: the
  browser gives the group one tab stop, lands focus on the checked option, and moves selection with
  the arrows. Arena authors **no `tabindex` anywhere**: doing so would fight it.
- It works controlled or not. Pass `value` and it is yours; omit it and the group remembers the
  last choice itself. `change` fires either way.
- Wrapping an `arena-radio` in your own component or a `@for` block is fine, because projection reaches
  it however deep, because the child resolves the group through DI rather than by being a direct
  child. Nothing here inspects its own children, so nothing between them can break it.
- Don't put a lone `arena-radio` outside a group. A single radio is a checkbox with worse
  semantics, and this one will throw for want of its provider.

**By hand, in real Chromium**: the platform behaviour above is exactly what happy-dom cannot show,
so this is the only place it is checked at all. Run `bun run demos` and open
`/frameworks/angular/components/forms/arena-radio-group/ArenaRadioGroup.demo.generated.html`:
- Tab into the group **once**: focus lands on the checked option, and Tab again leaves the group
  entirely rather than walking the other options.
- Arrow Down/Right and Up/Left move the selection and wrap at both ends.
- The disabled option is skipped while arrowing, and cannot be reached by Tab.
- Tab in and the focused option's **ring** takes a gold focus ring, though the focused element
  is the `opacity-0 size-0` native input. The `ring` slot carries
  `[&:has(~input:focus-visible)]:shadow-[…]`, which reaches the input as a later sibling, so the
  input must stay after the ring in the template, and moving it removes the ring silently.
  `arena-checkbox` draws the identical ring the identical way.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
