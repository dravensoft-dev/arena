Arena's link for running text such as a sentence in an empty state, a help line or a card body. The anchor is a real `<a href>` in the link ink, underlined at all times.

```html
<p>
  Read <arena-link href="/release-notes" (navigate)="router.navigateByUrl('/release-notes')">the release notes</arena-link> before you upgrade.
</p>
<p>
  The <arena-link href="https://status.example.com" external>status page</arena-link> lists every incident.
</p>
```

**The host draws no box.** `<arena-link>` is `display: contents` around the real `<a>`, the carve-out a focusable element takes, so the anchor sits inline in the sentence. An attribute written on the host lands on the inert element and never on the anchor.

<!-- @api GENERATED from contracts/api/components/ArenaLink.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content*` | slot |  |  | The link text. Required, and guarded at runtime: a link with no text has no name, so an empty one, or one holding only spaces, throws. |
| `href*` | primitive | `string` |  | Where the link goes. Required, and guarded at runtime after trimming: an <a> without an address is not a link and takes no focus. |
| `external` | primitive | `boolean` | `false` | Opens the address in a new tab. Arena writes target="_blank", adds noopener and noreferrer to rel, and says the locale's linkExternal word after the text without drawing it. The member is the one route to a new tab, and nothing is cancelled: a router cannot own a tab it did not open, so navigate does not fire. |
| `download` | primitive | `boolean` | `false` | Saves the address instead of navigating to it, under the name the browser chooses. Nothing is cancelled and navigate does not fire, because a router cannot own a download. |
| `rel` | array | `readonly string[]` |  | Link types the consumer adds to rel, such as nofollow or ugc. Arena merges them with its own: it adds noopener whenever the link opens another browsing context, through external or a target that names one. Arena drops an opener token, so no list written here hands the new page this one. |
| `target` | primitive | `string` |  | A named browsing context the link opens in, such as a help window reused across links, or a keyword such as _top. _blank is not taken here: a new tab is external, so a _blank target is ignored and warned once. A target it writes other than _self cancels nothing and fires no navigate. The navigation happens in a context a router does not own. |
| `navigate` | event |  |  | The link was activated by the one activation a router owns, a primary click with no modifier, or Enter on the focused link. Arena has already cancelled the anchor's own navigation by the time the event fires. A modified click, a middle click and a context menu are the browser's and fire nothing, and so does a link that is external, a download or targeted elsewhere. No payload, because the consumer wrote this element and already holds what it is about. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**A router owns the plain click, and the browser keeps the rest.** A primary click with no modifier is cancelled and reported through `navigate`, so route from there. A ctrl, meta, shift or alt click, a middle click and the context menu are the browser's and report nothing. A link that opens a tab, a download or another context is never cancelled. A router cannot own a tab, a file or a window it did not open.

**The underline is the signal, so the colour can stay quiet.** The link takes the link ink, which a style plugin answers, and an underline that never goes away. A reader tells it from the prose by the underline as well as by colour, which is what WCAG 1.4.1 asks.

**A new tab is `external`, and nothing else.** The member writes `target="_blank"` with `noopener` and `noreferrer`, and a reader hears the locale word `linkExternal` after the text. A `target` of `_blank` is ignored with a warning. Add your own link types through `rel`, such as `nofollow` or `ugc`; an `opener` token is dropped.

**Some anchor attributes are deliberately not members.** `hreflang`, `type`, `ping` and `referrerpolicy` are the element's too, and this component does not take them: the claim here is narrower than what an anchor can do. Global and ARIA attributes are not members either.

**Do**
- Put it inside a sentence. In a paragraph the link is the inline target WCAG 2.5.8 exempts from the target-size floor.
- Say where it goes in the text itself: "the release notes", never "click here".

**Don't**
- Don't paint a link in an accent. Crimson and gold fall under AA as text on some surfaces.
- Don't wrap an Arena component in `ArenaLink`, and don't wrap `ArenaLink` in your router's link. A whole card is `ArenaCard` with `href`.
- Don't ask for a `disabled` link. A link that goes nowhere is text, so render the text.
- Don't add an icon for `external`. The hidden hint carries it for a reader, and the underline for the eye.
- Don't expect the DOM event in `navigate`. The output carries nothing, because you wrote the element.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-link/ArenaLink.demo.generated.html`:
- A link that wraps across two lines underlines both, and the focus ring follows each line.
- The link reads in both themes and under forced high contrast.
- With `external` on, a screen reader says the hint after the text.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
