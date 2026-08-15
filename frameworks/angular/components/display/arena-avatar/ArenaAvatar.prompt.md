Arena avatar, a person's or team's mark. `src` renders the image; without it the
initials of `name` render on the raised surface, so `name` is always worth passing.
`shape="circle"` is a person, `shape="rounded"` a team or organisation. `status` adds
a presence dot.

```html
<arena-avatar name="Juan Carlos Hidalgo" />
<arena-avatar name="Delivery" shape="rounded" size="sm" />
<arena-avatar [src]="user.photo" [name]="user.name" size="lg" status="online" />
```

<!-- @api GENERATED from contracts/api/components/ArenaAvatar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `src` | primitive | `string` |  | Image URL. Absent renders initials from `name`. |
| `name` | primitive | `string` | `""` | The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. |
| `size` | enum | `ArenaAvatarSize` | `"md"` | The avatar's diameter. |
| `shape` | enum | `ArenaAvatarShape` | `"circle"` | Circle for a person, rounded for a team. |
| `status` | enum | `ArenaAvatarStatus` |  | A presence dot in the state's colour. `offline` is a visible muted dot; omit `status` entirely for no dot. Optional: there is no invisible enum value. |

<!-- @api end -->

**Do / Don't**
- Always pass `name`, even with `src`: it is the image's `alt` text and the fallback
  when the image fails to load.
- Don't use the presence dot as a status badge for anything but presence, the
  offline tone is a muted grey by design and reads as "not here", not as "disabled".
- The presence dot is filled (`bg-success`/`bg-warning`/`bg-error`/`bg-base-content/52`)
  even though danger is outline everywhere else, presence is its own semantic
  family, not a danger surface. convention section.
- Don't put an avatar in place of an icon. It represents a person or an entity; a
  role or an action is an icon.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
