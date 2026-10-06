Arena avatar, a person's or team's mark. `src` renders the image; without it the
initials of `name` render on the raised surface, so `name` is always worth passing.
`kind="person"` is the default, `kind="team"` is a team or organisation. `status` adds
a presence dot.

```html
<arena-avatar name="Juan Carlos Hidalgo" />
<arena-avatar name="Delivery" kind="team" class="arena-size-sm" />
<arena-avatar [src]="user.photo" [name]="user.name" status="online" class="arena-size-lg" />
<arena-avatar [name]="user.name" status="online" nameShown />
```

<!-- @api GENERATED from contracts/api/components/ArenaAvatar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `src` | primitive | `string` |  | Image URL. Absent renders initials from `name`. |
| `name` | primitive | `string` | `""` | The person or entity name. Its first two words' initials render when there is no `src`, and it is the image's alt text. With `nameShown` set, both stay drawn and neither is announced, because what composes the avatar already says the name. |
| `kind` | enum | `ArenaAvatarKind` | `"person"` | Whether the avatar stands for a person or for a team. A person is drawn as a circle and a team as a rounded square, so the two read apart in a list that holds both. |
| `status` | enum | `ArenaAvatarStatus` |  | A presence dot in the state's colour. `offline` is a visible muted dot; omit `status` entirely for no dot. Optional: there is no invisible enum value. |
| `nameShown` | primitive | `boolean` | `false` | Whether what composes this avatar already says its name: a name drawn beside it, or a control named on its own. Set, the image and the initials leave the accessibility tree so the name is announced once, and the presence dot keeps its own name. Leave it unset where the avatar is the only statement of who this is, including when it is a control's whole content, since that is how the control gets its name. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`, `arena-size-xs`. Write one as `class="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

**Do / Don't**
- Always pass `name`, even with `src`: it is the image's `alt` text and the fallback
  when the image fails to load.
- Set `nameShown` when something already says the name: a name drawn beside the avatar, or a
  control labelled on its own, such as an account menu's trigger. The face stays drawn, the name
  is announced once, and the presence dot keeps its own name. `aria-hidden` on the host is not the
  same thing, because it silences the presence along with the face. Leave `nameShown` off when the
  avatar is a control's whole content, since then it is how the control is named.
- Don't use the presence dot as a status badge for anything but presence. The offline tone is a muted grey by design, and it reads as "not here" rather than as "disabled".
- The presence dot is filled in its status hue even though danger is outline everywhere else:
  presence is its own semantic family, not a danger surface.
- Don't put an avatar in place of an icon. The avatar represents a person or an entity. A role or an action is an icon.

**Three things products asked this component for, and what each one measured.** Each is recorded here because reading the code does not answer it. Every one of them was refused with a reason rather than deferred.

- **A size past `lg`.** A profile header several times `lg` is a consumer-product measurement. `lg` is already the largest step this scale names, the one a profile header in an application wears. The repertoire is four steps rather than a length. A product that wants a 150px portrait re-values the scale inside its own scope, which is one line and stays that product's.
- **A ring around it.** The ask is a story ring, whose two states are a gradient and a grey. A `ring` member taking a tone would hand that product two solid rings and lose the mark it was built for. An appearance selects the ring by its part, never by the value of a variant. A
  ring drawn as two padded circles around the avatar is markup the product owns, and it is
  exactly what the one product that wanted it wrote.
- **A group of them.** An assignee stack is negative margin over the sizes this component already
  ships, plus an overflow count, in about five lines. One product built it, and it is the one ask
  on this list a consumer composes out of what is already here.

**Words.** The presence dot is named by `avatarOnline`, `avatarBusy`, `avatarAway` or `avatarOffline`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
