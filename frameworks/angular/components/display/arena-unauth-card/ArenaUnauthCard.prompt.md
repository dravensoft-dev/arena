Arena's signed-out panel. A frame: the lock-up, an eyebrow, a title, whatever the screen
is actually for, and a footer. It knows nothing about credentials, so one component
serves sign-in, "check your inbox", "this link expired" and two-factor entry.

```html
<div style="display:flex;min-height:100vh;align-items:center;justify-content:center">
  <arena-unauth-card eyebrow="Delivery Console" title="Sign in">
    <arena-app-logo brand name="Draven" dim="soft" size="md">
      <img src="/assets/your-mark.svg" alt="" />
    </arena-app-logo>

    <arena-input label="Email" type="email" [value]="email()" (change)="email.set($event)" />
    <arena-button type="submit" full>Sign in</arena-button>

    <span footer>Trouble signing in? Contact your administrator.</span>
  </arena-unauth-card>
</div>
```

<!-- @api GENERATED from contracts/api/components/ArenaUnauthCard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `brand` | slot |  |  | The brand lock-up above the panel's content. An ArenaAppLogo, in practice. |
| `eyebrow` | primitive | `string` |  | Mono crimson microlabel: the product, not the task. |
| `title` | primitive | `string` |  | The task. "Welcome back", "Check your inbox". |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h2"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h2` because this title is drawn in the section register rather than the card one, so the outline follows the register the same way every other title on the ladder does. A signed-out screen whose only title is this one says `h1` and gets the page's one heading, which is the case the member exists for. `none` takes the title out of the outline entirely; with no title there is no heading either way. |
| `content` | slot |  |  | The fields, composed from ArenaInput and ArenaButton. |
| `footer` | slot |  |  | Centred muted line below the content: a recovery link, a legal note. |

<!-- @api end -->

Import `ArenaBrand` and `ArenaFooter` from `@dravensoft/arena-angular` alongside
`ArenaUnauthCard` in the host component's `imports`,
`brand` and `footer` are directives, not plain attributes, because they are how the panel
detects that something was actually projected into each slot. Both wrappers carry their
own margin, so a card that omits one ships no dead space for it.

**Do / Don't**
- Centre it yourself. The three-line wrapper above is the whole job, and keeping it out
  of the component is what lets the panel sit in a split layout or inside a dialog.
- Don't put auth logic here. Submit handlers, validation and provider buttons belong to
  the screen; this is the frame around them.
- Don't override the width. 454px is the figure this panel has always rendered at, and it
  is arithmetic, content, padding and both hairlines added back together.
- Don't forget to import `ArenaBrand` / `ArenaFooter` when projecting into `[brand]` /
  `[footer]`, without them, the attribute is inert and the content silently fails to
  render inside its wrapper.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
