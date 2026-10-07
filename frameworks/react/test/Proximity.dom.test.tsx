/* Each proximity case rendered in React and normalised to the tree the gate measures, held equal
 * to the fixture. A null tree is a case not yet recorded: the suite fails printing the tree it
 * rendered, which is read against the case's intent before it is pasted into the fixture. The
 * subject is the button each case measures. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from './Harness.tsx';
import { ArenaButton, ArenaIconButton, ArenaTooltip, ArenaMenu, ArenaCard, ArenaDialog, ArenaAppLogo, ArenaPeopleList, ArenaPersonRow, ArenaBadge, ArenaTag, ArenaSheet, ArenaGrid, ArenaScroller, ArenaScrollerItem, ArenaSkeleton, ArenaCalendar } from '../Index.generated.ts';
import { readProximity, normalize, vocabularyClasses } from '../../../scripts/lib/arena/proximity.ts';

afterEach(cleanup);

type NodeLike = Parameters<typeof normalize>[0];

const axis = { display: 'contents', '--arena-grid-min': '300px' } as React.CSSProperties;

const COMPOSITIONS: Record<string, () => React.ReactElement> = {
  'class-on-component-beats-ancestor': () => <ArenaButton className="arena-fill">Save</ArenaButton>,
  'nearer-fit-beats-ancestor-fill': () => <ArenaButton className="arena-fit">Save</ArenaButton>,
  'class-on-tooltip-reaches-its-trigger': () => <ArenaTooltip className="arena-fill" label="Copy"><ArenaButton>Save</ArenaButton></ArenaTooltip>,
  'class-on-menu-reaches-its-trigger': () => <ArenaMenu className="arena-fill" items={[]} trigger={<ArenaButton>Save</ArenaButton>} />,
  'ancestor-reaches-through-the-transparent-trigger': () => <ArenaTooltip label="Copy"><ArenaButton>Save</ArenaButton></ArenaTooltip>,
  'class-on-trigger-alone-fills-the-wrapper-box': () => <ArenaTooltip label="Copy"><ArenaButton className="arena-fill">Save</ArenaButton></ArenaTooltip>,
  'box-class-stops-at-a-boundary': () => <ArenaCard><ArenaButton>Save</ArenaButton></ArenaCard>,
  'context-class-crosses-a-boundary': () => <ArenaCard><ArenaButton>Save</ArenaButton></ArenaCard>,
  'box-channel-stays-out-of-content': () => <ArenaCard><ArenaButton>Save</ArenaButton></ArenaCard>,
  'option-not-answered-stays-out': () => <div className="arena-optwitness-b"><ArenaButton>Save</ArenaButton></div>,
  'size-reaches-the-toolbar': () => <>
    <ArenaButton>Save</ArenaButton>
    <ArenaButton>Cancel</ArenaButton>
    <ArenaIconButton icon="ph-bold ph-x" label="Close" />
    <ArenaDialog open onClose={() => {}} title="Discard" footer={<ArenaButton>Confirm</ArenaButton>}>{null}</ArenaDialog>
  </>,
  'nearer-size-wins': () => <>
    <ArenaButton>Save</ArenaButton>
    <ArenaButton className="arena-size-lg">Cancel</ArenaButton>
    <ArenaIconButton icon="ph-bold ph-x" label="Close" />
  </>,
  'size-option-not-answered': () => <div className="arena-size-xl"><ArenaButton>Save</ArenaButton><ArenaAppLogo mark={<svg />} name="Draven" /></div>,
  'size-re-densifies-in-compact': () => <ArenaButton className="arena-size-sm">Save</ArenaButton>,
  'size-re-densifies-in-compact-under-the-size': () => <div className="arena-compact"><ArenaButton>Save</ArenaButton></div>,
  'size-re-densifies-in-comfortable': () => <ArenaButton className="arena-size-sm">Save</ArenaButton>,
  'size-re-densifies-in-comfortable-under-the-size': () => <div className="arena-comfortable"><ArenaButton>Save</ArenaButton></div>,
  'people-list-face-follows-the-list': () => <ArenaPeopleList className="arena-size-lg" label="Standings"><ArenaPersonRow name="Ines Marchetti" /></ArenaPeopleList>,
  'meaning-follows-the-base': () => <><ArenaButton destructive>Delete</ArenaButton><ArenaButton>Save</ArenaButton></>,
  'meaning-wins-over-accent': () => <ArenaBadge className="arena-accent-gold" tone="success">Paid</ArenaBadge>,
  'accent-stops-at-the-card-body': () => <ArenaCard className="arena-accent-primary"><ArenaTag>Draft</ArenaTag></ArenaCard>,
  'placement-stops-at-the-sheet-body': () => <ArenaSheet open title="Outer"><ArenaSheet open title="Inner">{null}</ArenaSheet></ArenaSheet>,
  'grid-min-reaches-the-grid': () => <div style={axis}><ArenaGrid><ArenaCard title="A">{null}</ArenaCard></ArenaGrid></div>,
  'grid-min-stops-at-the-card-content': () => <div style={axis}><ArenaGrid><ArenaCard title="A"><ArenaGrid>{null}</ArenaGrid></ArenaCard></ArenaGrid></div>,
  'grid-min-stops-at-a-lone-card-body': () => <div style={axis}><ArenaCard title="A"><ArenaGrid>{null}</ArenaGrid></ArenaCard></div>,
  'grid-min-class-beats-the-property': () => <div style={axis}><ArenaGrid className="arena-grid-min-sm"><ArenaCard title="A">{null}</ArenaCard></ArenaGrid></div>,
  'scroller-class-reaches-its-items': () => <ArenaScroller className="arena-scroller-item-sm" label="Lots"><ArenaScrollerItem>{null}</ArenaScrollerItem></ArenaScroller>,
  'skeleton-circle-takes-its-width-as-diameter': () => <div style={{ '--arena-skeleton-width': '64px' } as React.CSSProperties}><ArenaSkeleton className="arena-skeleton-circle" /></div>,
  'skeleton-circle-height-wins': () => <div style={{ '--arena-skeleton-width': '40px', '--arena-skeleton-height': '64px' } as React.CSSProperties}><ArenaSkeleton className="arena-skeleton-circle" /></div>,
  'skeleton-radius-is-read-by-block-only': () => <div style={{ '--arena-skeleton-radius': '12px' } as React.CSSProperties}><ArenaSkeleton className="arena-skeleton-line" /></div>,
  'day-head-clears-the-comfortable-row': () => <ArenaCalendar view="week" anchorDate="2025-03-03" dayInteractive />,
};

const BARE = new Set(['meaning-wins-over-accent', 'accent-stops-at-the-card-body']);
const SUBJECT: Record<string, { part: string; at: number }> = {
  'people-list-face-follows-the-list': { part: 'avatar.box', at: -1 },
  'meaning-follows-the-base': { part: 'button', at: 0 },
  'meaning-wins-over-accent': { part: 'badge', at: 0 },
  'accent-stops-at-the-card-body': { part: 'card', at: 0 },
  'placement-stops-at-the-sheet-body': { part: 'sheet', at: 0 },
  'grid-min-reaches-the-grid': { part: 'grid', at: 0 },
  'grid-min-stops-at-the-card-content': { part: 'grid', at: -1 },
  'grid-min-stops-at-a-lone-card-body': { part: 'grid', at: 0 },
  'grid-min-class-beats-the-property': { part: 'grid', at: 0 },
  'scroller-class-reaches-its-items': { part: 'scroller-item', at: 0 },
  'skeleton-circle-takes-its-width-as-diameter': { part: 'skeleton', at: 0 },
  'skeleton-circle-height-wins': { part: 'skeleton', at: 0 },
  'skeleton-radius-is-read-by-block-only': { part: 'skeleton', at: 0 },
  'day-head-clears-the-comfortable-row': { part: 'calendar.day-head', at: 0 },
};

const { families, cases } = readProximity();
const vocabulary = vocabularyClasses(families);

test('every case has a React composition, and every composition a case', () => {
  assert.deepEqual(Object.keys(COMPOSITIONS).sort(), cases.map((one) => one.name).sort());
});

for (const kase of cases) {
  test(`${kase.name}: React renders the tree the gate measures`, () => {
    const root = BARE.has(kase.name)
      ? mount(COMPOSITIONS[kase.name]!())
      : mount(<div className={kase.container || undefined}>{COMPOSITIONS[kase.name]!()}</div>);
    const container = root.firstElementChild!;
    const { part: subjectPart, at } = SUBJECT[kase.name] ?? { part: 'button', at: -1 };
    const found = [...container.querySelectorAll(`[data-arena-part="${subjectPart}"]`)];
    const subject = (BARE.has(kase.name) && container.getAttribute('data-arena-part') === subjectPart ? container : found.at(at)) ?? null;
    const tree = normalize(container as unknown as NodeLike, vocabulary, subject as unknown as NodeLike);
    assert.deepEqual(tree, kase.react, `recorded tree for ${kase.name}:\n${JSON.stringify(tree)}`);
  });
}
