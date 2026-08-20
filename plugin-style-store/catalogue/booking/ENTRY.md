# A booking flow

The register of one page a stranger fills in once: who they are meeting, a month to pick a day
from, a column of times, and a short form that ends in a single irreversible button. It is measured
on a commercial scheduling product, and what is written down here is what the measurement found.

Take this entry when the product is a form somebody outside the organisation completes, when they
will see it once, and when the whole screen is a question and its answer.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-surface`, `r-control`, `r-field`, `r-marker` | the large step for a surface, the middle for a control and a field, the pill for a marker | softly rounded rather than square, because every object on the page is something to press and a hard corner reads as a panel |
| **How hard a field is drawn** | `bw-field`, `bw-control`, `edge-field`, `edge-control` | **the strong border width on both**, the muted text colour on a field and the accent on a control | this is the entry's whole identity. A field somebody has never seen before has to look like a place to type before it is focused, and a hairline on a white card does not |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | bold for a heading and semibold for the other two, the heaviest of the entries | one page, one question at a time, and nothing else competing for the eye |
| Which face small text takes | `ff-eyebrow`, `ff-label`, `tt-label` | the body face, no transform | a stranger is not a user of this product, so a label in capitals or in mono reads as a system rather than as a person asking |
| How tight it is to the hand | `pad-control-*`, `gap-*`, `pad-surface` | generous control padding and the widest surface padding of the entries | the page is tapped as often as it is clicked |
| Which density it assumes | the comfortable class rather than a role | `.arena-comfortable` on the document | the only entry that opts into the touch target rather than the desk default, and the register where a mis-tap costs the booking |
| How wide it breathes | `container-max`, `grid-min`, `gutter`, `measure-prose` | a narrow container, a slot minimum, an ordinary gutter, and the narrowest prose measure | the product is a card on a page rather than a page, so the container is the card |
| **Whether depth is real** | `shadow-surface-rest`, `shadow-control-raised`, `lift-control` | **a real shadow at rest**, a small one on a raised control, and a one pixel rise | the only entry that answers the resting shadow with anything. The card has to stand off the page, because the page behind it belongs to the host and the card is the thing being filled in |
| How it answers a hand | `press-scale`, `dur-*`, `ease-*` | a small shrink, the fast duration on hover and the middle one on a state change | a state change here is a step of the flow, and a step that happens instantly leaves the reader wondering whether they pressed it |
| What shape a picture is | `aspect-media`, `fit-media` | square, filled | the only picture on the page is the host, and a face is square or it is a circle, never a landscape |
| **Which colours a surface takes** | `fill-page`, `fill-surface` | **the page takes the second step and the card takes the first**, which is the reverse of every entry but the console, and the reverse of the console's reason | the card is the product and the page is what it stands on |

**The drawn field edge and the resting shadow are the pair that carries this register.** Both say
the same thing in two places: this is a thing to fill in, and it is standing on something else.

## The page it assumes

One card, centred at `container-max`, split into a column that says what the meeting is and a
column that asks. The asking column is a month grid beside a column of times, and then the same
column becomes the form once a time is picked. Under the medium breakpoint the card becomes one
column and the split becomes a stack.

Air is the component step between fields and the group step inside one. Density is the comfortable
class, declared on the document.

## The components it leans on

The input, the textarea, the select, the radio and its group, the checkbox, the button, the icon
button, the avatar and the key value list. `frameworks/react/INDEX.md` names each under its category.

One thing falls outside the component list and it is the one a booking product needs most:

- **The month picker.** `ArenaCalendar` is a week or day schedule on a time grid, which is what a
  calendar shows and not what a booking page asks. A month of days is markup of your own, built
  from `r-control`, `bw-control` and the fill roles the rest of the flow already answers, and it is
  about forty lines.

**Two decisions are painted by hand**, in `plugin.css` beside this page: a field label read at the
size and strength of an answer rather than held back to a caption, and the hint under it kept
quieter without being smaller than the answer. A level is not a colour, so no colour role could have
carried either. That sheet says why.

## What it does not bring

The palette and the fonts are the consumer's. This register spends its accent in three places at
once, the selected day, the control edge and the one button, so a replacement accent changes it more
than a replacement face does.

The copy, the brand mark, the availability rules and the question of being found from outside are
still open, and this is the register that almost always answers the last of those yes: a booking page
is reached from outside or it is reached by nobody.
