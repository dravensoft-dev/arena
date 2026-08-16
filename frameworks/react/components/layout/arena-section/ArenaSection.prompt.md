A named region of a page: a heading, what sits around it, and the group it names. It is the
middle rung of the title ladder, under a page head and over a card.

```tsx
<ArenaSection eyebrow="This week" title="Landed recently"
  description="Everything that cleared customs since Monday."
  action={<ArenaButton variant="ghost" iconRight="ph-bold ph-arrow-right">See all</ArenaButton>}>
  <ArenaGrid>{lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}</ArenaGrid>
</ArenaSection>
```

<!-- @api GENERATED from contracts/api/components/ArenaSection.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title*` | primitive | `string` |  | Names the region, both on screen and to assistive technology. Required, and guarded at runtime after trimming: a section is a heading over a group, and one with no heading is a stack, which css/rhythm.css already ships as a class. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. |
| `children*` | slot |  |  | What the region holds. Required, and guarded at runtime: a section renders a heading naming a group, so a childless one renders a label for nothing. The guard counts the way the render path counts, so a child that is a false conditional counts as absent rather than as one. |
| `eyebrow` | primitive | `string` |  | A line above the title saying which part of the page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. |
| `description` | primitive | `string` |  | A line under the title, in the muted ink. It sits below the head row rather than beside the title, because a sentence and an action competing for the same row is what makes a head wrap on a narrow screen. |
| `action` | slot |  |  | Trailing content in the head row, aligned to the end and to the title's own baseline. Arena draws the row; the consumer draws what sits in it. A link that leads to the whole of what the section shows a slice of is the ordinary case. |
| `rhythm` | enum | `ArenaSectionRhythm` | `"md"` | How far the head stands from the body. The steps are the page rhythm scale itself, so sm reads as one unit, md as a head over its own content and lg as a head over a region of the page, and none closes the distance entirely for a section whose body carries its own top edge. Nothing here is a number this component chose. |

<!-- @api end -->

**`title` and `children` are both required, and both are guarded at runtime.** A section is a
heading over a group: with no heading it is a stack, which `css/rhythm.css` already ships as
`.arena-stack`, and with no children the heading names nothing. The title guard trims first,
because the value it exists to catch is a present and useless one rather than an absent one.

**It renders a plain `<section>` and claims no landmark.** A `<section>` becomes a `region` in the
accessibility tree only once it has an accessible name, and a page where every section announced
itself would bury the two or three landmarks that matter. The `<h2>` is the structure a reader
navigates by, and it is the platform's own.

`rhythm` is the distance from the head to the body, in the same three named steps the page rhythm
scale carries, plus `none`. It is not the air between one section and the next: Arena draws no
outer margin on anything, so that stays yours to place with `.arena-stack--section`.

**Do / Don't**
- **Do** let the description carry the sentence. Putting it in the action slot puts prose in a row
  sized for controls, and that row is what wraps first on a narrow screen.
- **Do** nest a section inside a page that already has an `ArenaPageHead`. The two registers are a
  step apart on purpose, and a style plugin moves them together.
- **Don't** reach for it when there is no title. That is `.arena-stack`, and the guard says so.
- **Don't** put a second `<h2>` of your own inside the body. The section already opened one, and a
  reader walking headings will read two peers where there is one region.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
