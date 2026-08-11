# The chart family

> **For whoever changes a chart.** This page sits at the `frameworks/` root, beside
> [`AGENTS.md`](./AGENTS.md), for the reason that page gives for sitting there: a fact about the
> layers belongs to none of them, and a copy per layer is a copy that can disagree. Every rule
> here binds both layers, because the arithmetic behind a chart is authored once and held byte for
> byte identical between them.

It is a page of its own rather than a section of the roof because a chart is one category of one
kind of component, and the roof is read by whoever changes any component at all. What binds every
layer is there; what binds the eight charts is here, and the route to it is one link.

`components/charts/` carries the worked example, and the rule that goes with it. Three modules
sit there rather than inside a chart or at the layer root, because bar, line and doughnut all
read them and nothing outside the category does: `ChartScales.ts` maps a datum to a number,
`ChartAxis.ts` lays out the plot frame, `ChartMarks.ts` turns numbers into an SVG path string.

Two shapes inside them are decisions rather than taste. **A scale is plain data and the mapping
is a free function**, never a closure factory: `check-shared-arithmetic.ts` compares function
bodies, and a factory hides its arithmetic inside a returned lambda the gate never reads, while
an Angular template cannot call a closure held in a `computed()` without rebuilding it every
cycle. So `arenaLinearScale(min, max, from, to)` returns a record and `arenaScaleValue(scale,
value)` reads it. A y axis passes an inverted pixel range, bottom first, which is why "up is
more" needs no minus sign and `arenaScaleZero(scale)` falls out of the same arithmetic.
**A `role="img"` subtree is presentational, and that one fact splits the chart's keyboard story
in two.** Nothing focusable inside the graphic reaches a screen reader however correct its ARIA,
so the reader of a screen reader gets the hidden table, which is already there, and a sighted
keyboard user gets a data cursor. **One tab stop for the whole plot, always**: the rail carries
it whether it overflows or not, and the cursor moves inside the region rather than adding stops,
which is what `focus.roving` means in `contracts/behaviour/figure-with-data-table.json`. Arrows
clamp and never wrap, because an axis has ends and wrapping loses the reader's place.

**Tap to read, drag to scroll.** `arenaPointerUpdates(pointerType, phase)` is the whole rule: a
`pointerdown` always reads, and a `pointermove` reads for every pointer except touch, because a
touch move is a scroll and hijacking it is how a chart eats the page. Nothing calls
`setPointerCapture` and nothing calls `preventDefault` on `pointerdown`, both of which would
take the scroll away. **No `touch-action` is set**, deliberately: `pan-x` would block vertical
page scroll over a 280px-tall element, and the browser already pans the rail natively because
the component never intercepts it. A lifted finger has no leave, so a touch reading persists
until the next tap or Escape, while mouse and pen clear on `pointerleave`.

**A chart takes series, and a series names itself.** `ArenaSeries` is one member where five loose
ones would each describe ONE series, which is a shape that leaves a chart drawing two with
nowhere to put the second. Its label is not decoration: it heads that series' own column in the accessible table,
so a reader of the table never has to work out which number belongs to which line. The
component's own `label` is the chart's name and a different thing, and both are required and
guarded for the reason `contracts/api/MemberForms.md` gives. A series with no identity of its
own takes the ramp slot its POSITION gives it, so two series are never the same colour by
accident, and the ramp still clamps rather than cycling. **A missing number is not a zero**: a
series shorter than the others stops there, leaves an empty cell in the table, and draws no
mark, because inventing the difference is the one thing a chart may not do.

**A domain carries its own step, and that is what puts zero on a tick.** An axis that has to
hold a negative value cannot take its step from the count alone, because the two sides of zero
are not the same size: `arenaNiceDomain(min, max)` rounds ONE step to a nice number and then
rounds each end out to a whole number of steps, so zero lands exactly where a tick does and the
strong rule has something to sit on. `arenaDomainTicks` reads the count back out of the domain
rather than assuming four, and it has to: the step is what is nice, so the count is what gives.

**The nice number is the STEP and never the ceiling, and getting that backwards costs half the
plot.** `arenaNiceStep` snaps a rough step up to 1, 2, 2.5, 5 or 10 times its magnitude, and it
is handed the range divided by the tick count. Handing it the range itself, whose nice value is
then quartered, is what costs the plot: a maximum of 510 snaps to 1000 before anything is
divided, so forty-nine percent of the plot draws nothing, and a maximum of 22 produces ticks at
6.25. As it stands, across every whole-number maximum to two thousand, the worst axis spends a
third of itself on nothing rather than a half, and four of them draw a fractional step where
ninety would. Its own suite asserts those two as sweeps rather than pinning a table of values,
because a table of values is what lets a wrong shape sit unquestioned. The name says `Step` for
the same reason: `arenaNiceMax`, on something used as a maximum, is the name a mistake of this
exact shape hides behind. **`arenaScaleValue` does not clamp**: a scale maps, and where a value may not go is
the caller's rule. The doughnut keeps its own floor, because a negative share of a whole is
meaningless, and the bar and line charts keep none.

**A shared appearance module is a manifest, and these charts have none by charter**, so the
tooltip's arithmetic and its appearance part company. `ChartTooltip.ts` is paired and holds
`arenaTooltipAnchor(x, y)`, which is where the hovered datum meets `--chart-tooltip-offset`; the
style objects stay where each layer already kept them. Angular's were module-level constants
duplicated across two components and now sit once in `ChartTooltipStyles.ts`, which is
deliberately **not** in `PAIRED` because its members are constants rather than functions, and
`check-shared-arithmetic.ts` compares only functions. React has no counterpart on purpose:
`check-appearance.ts` excuses a chart that draws geometry but not a loose module beside it, so
lifting the same literals out of the JSX would ask for the manifest the charter refuses. **Do
not add one.** `ChartLegendStyles.ts` is the second file that rule produced, on the same reading
and the same asymmetry: Angular's cartesian legend constants were about to be duplicated across
the bar and line charts, so they sit once, unpaired; React's stay in the JSX that draws them.

**A cartesian legend is a key and not a control, so it takes no focus.** It renders
`aria-hidden="true"`, and that is the honest reading of the pattern rather than an omission:
`contracts/behaviour/figure-with-data-table.json` already refused a hidden listbox mirroring the
marks, because it is "a second copy of the same numbers in the same DOM", and a focusable list of
series names is that copy, since the accessible table already heads each column with the series'
own label. So the plot keeps its one tab stop and no chart binding gains an exception or an
addition. The doughnut's rows are the deliberate opposite and stay `<button>`: activating one
emits `sliceActivate`, and a ring has no sequence for a data cursor to walk, both of which its own
binding records.

**A curve is monotone cubic and never Catmull-Rom, and that is the rule rather than a
preference.** Catmull-Rom is shorter and is what most libraries reach for, and it overshoots:
between two measured points it draws a peak or a trough nobody measured. On an axis that holds
negatives it will dip a line under zero on data that never went there. Arena already refuses to
invent the difference when a series is short, on the ground that a missing number is not a zero;
fabricating the values BETWEEN two numbers is the same lie with better manners. So
`arenaCurveTangents` uses Fritsch-Carlson with a turning point forced flat, and its suite asserts
the PROPERTIES by sampling the cubic rather than pinning the path string: inside the band its own
two points define, no valley beside a spike, no zero crossing the data did not make.

**A stack's radius belongs to the outermost segment of each DIRECTION, not of each bar.** A
category holding both signs ends two runs and each gets its corner; every joint between segments
stays square, because a rounded joint reads as the end of something. `ChartMarks.ts` needed
nothing for this: `arenaBarPath` already takes a value end and a base end and rounds only the
value end, so a stack segment is that function with the base moved off the zero line and an
interior segment is the same call with a radius of nothing. The forked piece is the domain:
`arenaStackDomain` sums the two directions separately per category and takes the extremes of those
sums, where `arenaSeriesDomain` takes the extremes of the individual values.

**Which arrow pair moves a data cursor is a property of the chart, so the cursor functions take
the axis and a chart answers one pair only.** `contracts/behaviour/figure-with-data-table.json`
names both pairs and every chart excepts the one it does not use, which is verbose and is what the
flat `requires` map is for: one exception cannot quietly excuse three. A chart must not consume
the pair it has no sequence for, because `preventDefault` on `ArrowUp` takes the page scroll away
from a keyboard reader who only wanted to pass through, which is the reasoning that already keeps
`touch-action` off the rail. Both render suites press the idle pair and assert the cursor did not
move.

**A chart whose categories run down the plot carries no scrolling rail, and that is a decision
rather than a gap.** `ArenaBarChart` overflows sideways when the points stop fitting, and sideways
is a direction a page does not use. Down is the direction a page already scrolls, so a rail there
would nest one scroller inside another and eat the gesture a reader was making to leave.
`ArenaHorizontalBarChart` and `ArenaPyramidChart` take the room through `height` instead, which on
that axis is what the data grows along. `chart.pad-category` is its own token rather than a wider
`chart.pad-left` because the two gutters hold different things, and sizing every chart's value
gutter for the longest category name anybody might write would spend it on every vertical chart in
the library.

**A scatter takes a different series TYPE, and that type carries two parallel arrays rather than
an array of pairs.** `ArenaPointSeries` is not a variant of `ArenaSeries`: the two disagree about
what a mark is, since an `ArenaSeries` value takes its place on the axis from its index and a pair
carries both coordinates. Folding them together would hand every chart in the library a member
most cannot use. The two arrays are not a workaround either: R1 in `contracts/api/MemberForms.md`
says a predefined object may hold an array of primitives and may not hold an array of objects, on
the recorded ground that an array of objects reopens a nesting depth the reader has no bottom for.
So the pairing is by index, which is the pairing `labels` and `values` already make on every other
chart, with the same rule when the two do not line up: a mark is drawn only where both arrays have
a value, because a pair with half a coordinate is not a point.

**A bubble maps its value onto AREA and never onto the radius.** A reader compares the blot, and
doubling a radius quadruples it, so a value four times larger drawn at four times the radius shows
as sixteen times the ink. `arenaRadiusAt` interpolates the squared radius between
`chart.bubble-r-min` and `chart.bubble-r-max`, and its suite asserts the ratio rather than a table
of radii, because a table of radii is what would have let the linear version pass. It is the same
class of lie the monotone curve refuses and the mirrored pyramid axis refuses: a drawing that
says something the numbers do not.

**A member required only sometimes is guarded at render and not declared in the contract.**
`sizeLabel` becomes required the moment any series carries `r`, and a contract has no way to say
that. The guard throws with the reason, the way `label` does, rather than falling back to a
heading that satisfies the table mechanically and names the quantity to nobody.

**A cursor over marks with no sequence walks them in the order the table lists them.** A scatter
has no order of its own, so the cursor goes series by series and within a series in the order
given, which is exactly what `arenaPointTable` emits. Sorting by x was weighed and refused: it
jumps between series and reads as one sequence where there are several, and it would put the two
readings of the chart into an order the table does not have.

**A polar grid keeps its own floor at the centre, and its labels ride outside it.** A radius
cannot be negative, so a value below zero is drawn at the centre rather than on the opposite axis,
where it would land as a different datum entirely. That floor is the chart's, not the scale's,
which is the same division `arenaScaleValue` already states and the doughnut already uses. The
label ring is `arenaRadarRadius` plus one label gap, and the grid is inset by `chart.pad-bottom`
to leave room for it: a grid that reached the edge of its box put every axis label under the
vertex of a full-value polygon, which is what a screenshot showed and no gate could. The labels
anchor by the side they point to, `start` on the right half and `end` on the left, because a
centred label on a horizontal axis reaches back over the shape it names. `ChartPolar.ts` starts at
12 o'clock and runs clockwise, the same as `arenaDoughnutSlices`, so two radial charts on one page
never begin in different places.

**A pyramid negates its first series when it DRAWS it and nowhere else.** Both sides carry counts,
the accessible table reads the numbers that were passed, and the axis is written in magnitudes,
because a tick reading a minus would say one side is a debt rather than a count. A negative value
is not corrected: it crosses the centre and draws on the other side, which is what the number says
and what the table says too. Taking the magnitude quietly would make this the one place in Arena
where the picture and the table can disagree. `arenaMirrorDomain` measures the larger side and
reaches the same distance on both, because two halves scaled to their own maxima look balanced
whatever the data said.

**It appears at two series and not at one, and that is a consequence rather than a member.** One
series is already named by the chart's `label` and by the only value column in its table, so a
one-row legend restates the chart's name and buys nothing with the plot height it spends. The
count is the whole rule, which is why the charts that shipped before it draw the same bytes they
drew: `arenaLegendShows(count)` is the only place it is written. The strip comes OUT of the plot,
so `--chart-height` stays the height of the whole component, the same trade the doughnut makes on
the other axis when its legend column takes width from the ring.

**`ArenaPlotBox` spells its size `w` and `h` rather than `width` and `height`**, because
`check-dimension-literals.ts` reads a property named `width` as a CSS dimension and follows the
local it was assigned from, so a plot box would report its `Math.max(1, ...)` floor as a raw px
forever. The floor is a guard against dividing by a collapsed container, not a dimension anybody
chose, and there is no token that could stand in for it. Renaming the field says what the record
is; four exemptions would only say that the gate was wrong four times.
**That is a rule and not one record's quirk**: any geometry a chart hands to a `height` or a
`width` attribute comes back inside a record, so the site reads `strip.plotH` rather than a bare
local. The gate follows an identifier used bare and stops at a member access, which is the whole
difference between a floor it reports forever and a floor it never sees. `arenaLegendStrip`
returns `{ plotH, stripH }` for that reason and for no other; a pair of numbers would have been
shorter and would have cost an exemption per call site.
Each is named by `PAIRED` in `scripts/check/arena/check-shared-arithmetic.ts`, which compares
every function two copies export under one name, so **the two copies are authored byte for byte
identical and add no `DIVERGENT` entry**. That is only reachable while they hold no layer type:
arithmetic and path strings go in the paired module, and every style object stays in the
component that draws it. They also carry no comment, because `allowsHeader()` in
`scripts/check/arena/check-docs.ts` grants one only under `scripts/` or a test path, which is
why the reasoning is here instead. `DataVisuals.ts` stays at the layer root beside them and
keeps the colour contract and the number writer, since `arena-calendar-event` reads
`arenaCatColor(slot)` too and a module a schedule grid consumes is not chart internals.
