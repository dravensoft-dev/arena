Visual identity of a person or entity. With `src` it shows the image; without it, initials from `name`.

```tsx
<ArenaAvatar name="Lucy Fernandez" status="online" />
<ArenaAvatar src="/u/marco.jpg" name="Marco Ruiz" size="lg" />
<ArenaAvatar name="Aurora Bank" shape="rounded" />  {/* entity/team */}
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
- `circle` for people, `rounded` for teams/organizations.
- Always pass `name` (accessible name + fallback initials), even when there's a `src`.
- It's the only element, along with the switches, that can be fully round.

**Three things products asked this component for, and what each one measured.** Each is
recorded here because reading the code does not answer it, and every one of them was refused
with a reason rather than deferred.

- **A size past `lg`.** A profile header several times `lg` is a consumer-product measurement,
  and `lg` is already the largest step this scale names, the one a profile header in an
  application wears. The repertoire is four steps and not a length, so the product that wants a
  150px portrait re-values the scale inside its own scope, which is one line and stays that
  product's.
- **A ring around it.** The ask is a story ring, whose two states are a gradient and a grey, and
  a `ring` member taking a tone would hand that product two solid rings and lose the mark it was
  built for: an appearance selects the ring by its part and never by the value of a variant. A
  ring drawn as two padded circles around the avatar is markup the product owns, and it is
  exactly what the one product that wanted it wrote.
- **A group of them.** An assignee stack is negative margin over the sizes this component already
  ships, plus an overflow count, in about five lines. One product built it, and it is the one ask
  on this list a consumer composes out of what is already here.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
