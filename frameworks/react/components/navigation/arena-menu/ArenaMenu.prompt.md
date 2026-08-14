Actions menu on a trigger (overflow "⋮", more actions, context). Don't confuse with `ArenaCommandPalette` (global search ⌘K) or with `ArenaSelect` (choosing a form value).

```tsx
<ArenaMenu align="end" trigger={<ArenaIconButton label="More options" icon="ph-bold ph-dots-three-vertical" />}
  onSelect={(item) => run(item.label)}
  items={[
    { header:'Deployment' },
    { label:'View logs', icon:'ph-bold ph-scroll' },
    { label:'Duplicate', icon:'ph-bold ph-copy', shortcut:'⌘D' },
    { divider:true },
    { label:'Delete', icon:'ph-bold ph-trash', destructive:true },
  ]} />
```

<!-- @api GENERATED from contracts/api/components/ArenaMenu.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `trigger*` | slot |  |  | The element that opens the menu. The consumer draws it -- an ArenaIconButton with ph-dots-three-vertical, a secondary ArenaButton -- so it is a slot, and it carries its own accessible name. |
| `items*` | array | `readonly ArenaMenuItem[]` |  | The entries, in order: activatable rows, dividers and group headers. |
| `align` | enum | `ArenaMenuAlign` | `"start"` | Which edge of the trigger the panel lines up with. |
| `onSelect` | event | `ArenaMenuItem` |  | An entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. |

<!-- @api end -->

An entry has no `onClick` of its own. Activating one reports `onSelect(item)` --
the whole item, not a key into the list -- so the handler switches on whatever
field it finds useful, usually `label`. There is deliberately no `id`:
`{ divider:true }` and `{ header:'Text' }` are legitimate entries carrying neither
a label nor anything to identify, and a required `id` would force a meaningless
one onto every rule and every group heading. A `disabled` entry reports nothing,
and a divider or a header cannot be activated at all.

`icon` is a **Phosphor class-name string**, never markup: Arena draws the `<i>`
and the caller names the glyph. What that costs is the general price of the
single-icon convention: an entry carries no markup of a consumer's own,
so a row with an avatar, a coloured dot or a two-line body has no expression
here. `items` is required and throws when absent; an empty array is a caller
saying "no entries right now" and renders.

**Do / Don't**
- The trigger must have an accessible name (use `ArenaIconButton label`).
- **The trigger must be a control, not a picture of one.** An `ArenaAvatar`, a `<span>` or anything else that takes no focus receives the handlers and answers no key, so the menu opens on a pointer and a reader on a keyboard never reaches it. Arena reports that once at runtime; pass an `ArenaIconButton`, an `ArenaButton`, or your own element carrying a button role and a tabindex.
- Destructive actions go last and are marked `destructive`.
- To choose a value from a form, use `ArenaSelect`, not an ArenaMenu.
- Don't reach for a per-entry callback -- there is none. Read `onSelect`'s item.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
