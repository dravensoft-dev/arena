A framed piece of media with an optional caption. The frame is a shape and a corner a style plugin
answers, and it clips whatever you put in it, so a wall of figures reads as a wall.

```tsx
<ArenaFigure
  media={<img src={lot.image} alt={`${lot.farm}, ${lot.region}`} />}
  fallback={<i className="ph-bold ph-coffee-bean" aria-hidden="true" />}
  caption={`${lot.farm}, ${lot.altitude} m`} />
```

<!-- @api GENERATED from contracts/api/components/ArenaFigure.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `media` | slot |  |  | The picture itself, as the element you wrote: an img, a video, a canvas. It is clipped to the frame and meets its edges the way the style plugin says, which is why nothing here takes a source or an alternative text. Those belong to your element, and an image's alternative is editorial in a way nothing can derive. |
| `fallback` | slot |  |  | What the frame shows when there is no media, drawn centred and at rest rather than as an error: an icon standing for a category, a monogram, a shape. Absent along with media, the frame is an empty box of the right shape, which is what a loading wall wants. |
| `overlay` | slot |  |  | Content laid over the media, on the wash the overlay role paints, so a mark or a line of text stays readable against a picture nobody chose. It is inside the frame and the caption is under it, which is the whole difference between the two. |
| `caption` | primitive | `string` |  | A line under the frame, rendered as a real figcaption inside a real figure, so the association is the platform's rather than a class name's. Absent, the figure renders no caption element at all rather than an empty one. |
| `ratio` | primitive | `string` | `"var(--aspect-media)"` | The shape of the frame, as a CSS aspect ratio. The default is the role, so a style plugin answers it for every figure at once and a shop crops portrait where a gallery tiles square. Give it a value outright for the figure whose shape is not the plugin's to decide: a video is sixteen by nine whatever the page sounds like. |

<!-- @api end -->

**Nothing here takes a source or an alternative text**, and that is the point. The picture is the
element you wrote, so `src`, `srcset`, `loading` and `alt` stay where the platform already asks for
them. An image's alternative is editorial: it says what the picture means on this page, which
nothing can derive from a file name.

**`ratio` defaults to the role.** A style plugin answers the shape of every figure at once, so a shop
crops portrait where a gallery tiles square, and the same markup follows. Pass a value outright
only for the figure whose shape is not the plugin's to decide, such as a video.

**`fallback` is a state and not an error.** It draws centred and at rest when there is no media,
which is what a category icon or a monogram is for. With neither media nor fallback the frame is
an empty box of the right shape, which is what a loading wall wants.

**`overlay` sits inside the frame and `caption` sits under it.** The overlay is drawn on the wash
the overlay role paints, so a mark stays readable against a picture nobody chose; the caption is a
real `<figcaption>` in a real `<figure>`, so the association is the platform's.

**Do / Don't**
- **Do** put the alternative text on your own `<img>`, and leave it empty when the figure is
  decorative and the caption already says everything.
- **Do** let the frame crop. That is what `fit-media` is, and a style plugin that would rather letterbox
  re-answers it for the whole page at once.
- **Don't** wrap it in a box of your own to size it. It fills the column it is in and takes its
  shape from `ratio`.
- **Don't** put a control in the overlay and expect it to be reachable before the caption. It is
  in the frame, which comes first in the reading order.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
