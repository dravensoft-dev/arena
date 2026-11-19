/* Each proximity case rendered in React and normalised to the tree the gate measures, held equal
 * to the fixture. A null tree is a case not yet recorded: the suite fails printing the tree it
 * rendered, which is read against the case's intent before it is pasted into the fixture. The
 * subject is the button each case measures. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ArenaButton, ArenaIconButton, ArenaSplitButton, ArenaCopyButton, ArenaTooltip, ArenaMenu, ArenaPopover, ArenaCard, ArenaDialog, ArenaAppLogo, ArenaPeopleList, ArenaPersonRow, ArenaBadge, ArenaTag, ArenaSheet, ArenaGrid, ArenaScroller, ArenaScrollerItem, ArenaSkeleton, ArenaCalendar, ArenaPinInput, ArenaTimeline, ArenaPaletteScope, ArenaCheckbox, ArenaRadioGroup, ArenaRadio, ArenaSwitch, ArenaSlider, ArenaInput, ArenaFileInput } from '../Index.generated.ts';
import { readProximity, normalize, vocabularyClasses } from '../../../scripts/lib/arena/proximity.ts';

afterEach(cleanup);

type NodeLike = Parameters<typeof normalize>[0];

const axis = { display: 'contents', '--arena-grid-min': '300px' } as React.CSSProperties;
const answered = (answers: Record<string, string>) => answers as React.CSSProperties;

const COMPOSITIONS: Record<string, () => React.ReactElement> = {
  'class-on-component-beats-ancestor': () => <ArenaButton className="arena-fill">Save</ArenaButton>,
  'nearer-fit-beats-ancestor-fill': () => <ArenaButton className="arena-fit">Save</ArenaButton>,
  'class-on-tooltip-reaches-its-trigger': () => <ArenaTooltip className="arena-fill" label="Copy"><ArenaButton>Save</ArenaButton></ArenaTooltip>,
  'class-on-menu-reaches-its-trigger': () => <ArenaMenu className="arena-fill" items={[]} trigger={<ArenaButton>Save</ArenaButton>} />,
  'class-on-popover-reaches-its-trigger': () => <ArenaPopover className="arena-fill" label="Filters" trigger={<ArenaButton>Save</ArenaButton>}><p>Only failing builds.</p></ArenaPopover>,
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
  'solid-container-fills-its-badge': () => <ArenaBadge tone="success">Live</ArenaBadge>,
  'soft-badge-stays-soft-in-a-solid-container': () => <ArenaBadge className="arena-mark-soft" tone="success">Live</ArenaBadge>,
  'small-region-compacts-its-badge': () => <ArenaBadge tone="danger" className="arena-mark-solid">Live</ArenaBadge>,
  'small-region-tightens-its-badge-block': () => <ArenaBadge tone="danger" className="arena-mark-solid">Live</ArenaBadge>,
  'small-region-tightens-its-badge-ends': () => <ArenaBadge tone="danger" className="arena-mark-solid">Live</ArenaBadge>,
  'small-badge-compacts-itself': () => <ArenaBadge tone="danger" className="arena-mark-solid arena-size-sm">Live</ArenaBadge>,
  'small-badge-tightens-its-block': () => <ArenaBadge tone="danger" className="arena-mark-solid arena-size-sm">Live</ArenaBadge>,
  'small-badge-tightens-its-ends': () => <ArenaBadge tone="danger" className="arena-mark-solid arena-size-sm">Live</ArenaBadge>,
  'medium-badge-stays-medium-in-a-small-region': () => <ArenaBadge tone="danger" className="arena-mark-solid arena-size-md">Live</ArenaBadge>,
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
  'pin-input-root-shrinks': () => <ArenaPinInput label="Code" />,
  'tag-keeps-its-word-in-a-row': () => <ArenaTag>Draft</ArenaTag>,
  'timeline-connector-reaches-next-dot': () => <ArenaTimeline label="Order" items={[{ title: 'Placed' }, { title: 'Shipped' }]} />,
  'timeline-connector-reaches-next-dot-comfortable': () => <ArenaTimeline label="Order" items={[{ title: 'Placed' }, { title: 'Shipped' }]} />,
  'timeline-connector-horizontal': () => <ArenaTimeline label="Order" items={[{ title: 'Placed' }, { title: 'Shipped' }]} />,
  'timeline-connector-horizontal-keeps-block-margin': () => <ArenaTimeline label="Order" items={[{ title: 'Placed' }, { title: 'Shipped' }]} />,
  'tag-breaks-a-label-wider-than-its-container': () => <ArenaTag>{'InternationalisationInternationalisationInternationalisationInternationalisationInternationalisationInternationalisation'}</ArenaTag>,
  'palette-scope-takes-the-surface-radius': () => <ArenaPaletteScope palette="light"><span>Light</span></ArenaPaletteScope>,
  'group-answer-moves-every-member': () => <div style={answered({ '--actions-primary-root-fill-rest': 'var(--fill-surface)' })}>
    <ArenaButton>Save</ArenaButton>
    <ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={[{ label: 'Deploy' }]}>Deploy</ArenaSplitButton>
    <ArenaIconButton icon="ph-bold ph-x" label="Close" />
  </div>,
  'context-class-beats-the-default-block': () => <div style={answered({ '--actions-primary-root-fill-rest': 'var(--fill-surface-raised)' })}><ArenaButton>Save</ArenaButton></div>,
  'member-default-kept-while-the-group-is-silent': () => <div><ArenaIconButton icon="ph-bold ph-x" label="Close" /><ArenaButton className="arena-emphasis-ghost">Save</ArenaButton></div>,
  'secondary-answer-reaches-the-calendar-nav': () => <div style={answered({ '--actions-secondary-root-fill-rest': 'var(--fill-surface)' })}><ArenaButton className="arena-emphasis-secondary">Save</ArenaButton><ArenaCalendar view="week" anchorDate="2025-03-03" /></div>,
  'group-answer-replaces-the-member-default': () => <div style={answered({ '--actions-ghost-root-edge-rest': 'var(--hue-danger-edge)' })}><ArenaIconButton icon="ph-bold ph-x" label="Close" /><ArenaButton className="arena-emphasis-ghost">Save</ArenaButton></div>,
  'answered-disabled-stops-the-fade': () => <div style={answered({ '--actions-primary-root-ink-disabled': 'var(--ink-muted)', '--actions-primary-root-fade-disabled': '1' })}><ArenaButton disabled>Save</ArenaButton></div>,
  'answered-disabled-draws-its-ink': () => <div style={answered({ '--actions-primary-root-ink-disabled': 'var(--ink-muted)', '--actions-primary-root-fade-disabled': '1' })}><ArenaButton disabled>Save</ArenaButton></div>,
  'answered-disabled-ink-reaches-the-glyph': () => <div style={answered({ '--actions-primary-root-ink-disabled': 'var(--ink-muted)', '--actions-primary-root-fade-disabled': '1' })}><ArenaButton disabled icon="ph-bold ph-x">Save</ArenaButton></div>,
  'choices-answer-moves-every-box': () => <div style={answered({ '--choices-box-fill-selected': 'var(--fill-surface)' })}>
    <ArenaCheckbox checked label="Notify" />
    <ArenaRadioGroup ariaLabel="Cadence" value="daily"><ArenaRadio value="daily" label="Daily" /></ArenaRadioGroup>
    <ArenaSwitch state label="Sync" />
    <ArenaSlider label="Volume" value={40} />
  </div>,
  'ink-answer-reaches-the-glyph': () => <div style={answered({ '--actions-primary-root-ink-rest': 'var(--fill-surface)' })}><ArenaButton icon="ph-bold ph-x">Save</ArenaButton></div>,
  'icon-rest-answer-keeps-the-level': () => <div style={answered({ '--actions-ghost-root-icon-rest': 'var(--hue-danger-ink)' })}><ArenaButton className="arena-emphasis-ghost" icon="ph-bold ph-x">Save</ArenaButton></div>,
  'class-on-copy-button-reaches-the-icon-button-it-draws': () => <div style={answered({ '--actions-solid-root-fill-rest': 'var(--fill-surface-raised)' })}><ArenaCopyButton className="arena-emphasis-solid" text="x" label="Copy" /></div>,
  'answered-disabled-keeps-the-rest-fill': () => <div style={answered({ '--actions-primary-root-ink-disabled': 'var(--ink-muted)', '--actions-primary-root-fade-disabled': '1' })}><ArenaButton disabled>Save</ArenaButton></div>,
  'selected-disabled-answer-stops-only-the-selected-fade': () => <>
    <div style={answered({ '--actions-ghost-root-ink-disabled': 'var(--ink-muted)', '--actions-ghost-root-fade-disabled': '1' })}><ArenaIconButton icon="ph-bold ph-x" label="Close" pressed disabled /></div>
    <div style={answered({ '--actions-ghost-root-ink-selected-disabled': 'var(--ink-muted)', '--actions-ghost-root-fade-selected-disabled': '1' })}><ArenaIconButton icon="ph-bold ph-x" label="Close" pressed disabled /></div>
  </>,
  'answered-disabled-choices-stops-the-fade': () => <>
    <div><ArenaCheckbox disabled label="Notify" /></div>
    <div style={answered({ '--choices-box-fill-disabled': 'var(--fill-surface)', '--choices-box-fade-disabled': '1' })}><ArenaCheckbox disabled label="Notify" /></div>
  </>,
  'answered-disabled-radio-stops-the-fade': () => <>
    <div><ArenaRadioGroup ariaLabel="Cadence" value="daily"><ArenaRadio value="daily" label="Daily" disabled /></ArenaRadioGroup></div>
    <div style={answered({ '--choices-box-fill-selected-disabled': 'var(--fill-surface)', '--choices-box-fade-selected-disabled': '1' })}><ArenaRadioGroup ariaLabel="Cadence" value="daily"><ArenaRadio value="daily" label="Daily" disabled /></ArenaRadioGroup></div>
  </>,
  'answered-disabled-switch-stops-the-fade': () => <>
    <div><ArenaSwitch label="Sync" disabled /></div>
    <div style={answered({ '--choices-box-fill-disabled': 'var(--fill-surface)', '--choices-box-fade-disabled': '1' })}><ArenaSwitch label="Sync" disabled /></div>
  </>,
  'fields-edge-answer-moves-the-halo': () => <div style={answered({ '--fields-error-field-edge-rest': 'var(--hue-warning-edge)' })}><ArenaInput label="Email" error="Required" /></div>,
  'answered-disabled-field-stops-the-fade': () => <>
    <div><ArenaInput label="Email" disabled /></div>
    <div style={answered({ '--fields-neutral-field-fill-disabled': 'var(--fill-surface)', '--fields-neutral-field-fade-disabled': '1' })}><ArenaInput label="Email" disabled /></div>
  </>,
  'fields-error-zone-keeps-its-edge-while-disabled': () => <div style={answered({ '--fields-error-field-edge-disabled': 'var(--hue-warning-edge)' })}><ArenaFileInput label="Upload" droppable error="Too big" disabled /></div>,
  'fields-error-zone-keeps-its-edge-while-dragged': () => <div style={answered({ '--fields-error-field-edge-hover': 'var(--hue-warning-edge)' })}><ArenaFileInput label="Upload" droppable error="Too big" /></div>,
  'fields-error-zone-draws-no-field-unless-droppable': () => <ArenaFileInput label="Upload" error="Too big" />,
  'answered-disabled-field-keeps-its-answer-while-hovered': () => <div style={answered({ '--fields-neutral-field-fill-disabled': 'var(--fill-surface)' })}><ArenaInput label="Email" disabled /></div>,
  'hovered-enabled-field-takes-its-hover-answer': () => <div style={answered({ '--fields-neutral-field-fill-hover': 'var(--fill-surface)' })}><ArenaInput label="Email" /></div>,
  'hover-answer-is-not-derived-from-the-rest-answer': () => <div style={answered({ '--actions-primary-root-fill-rest': 'var(--fill-surface)', '--actions-primary-root-fill-hover': 'var(--fill-hover)' })}><ArenaButton>Save</ArenaButton></div>,
};

const DRAGGED = new Set(['fields-error-zone-keeps-its-edge-while-dragged']);
const BARE = new Set(['meaning-wins-over-accent', 'accent-stops-at-the-card-body', 'small-badge-compacts-itself', 'small-badge-tightens-its-block', 'small-badge-tightens-its-ends']);
const SUBJECT: Record<string, { part: string; at: number }> = {
  'people-list-face-follows-the-list': { part: 'avatar.box', at: -1 },
  'meaning-follows-the-base': { part: 'button', at: 0 },
  'meaning-wins-over-accent': { part: 'badge', at: 0 },
  'solid-container-fills-its-badge': { part: 'badge', at: 0 },
  'soft-badge-stays-soft-in-a-solid-container': { part: 'badge', at: 0 },
  'small-region-compacts-its-badge': { part: 'badge', at: 0 },
  'small-region-tightens-its-badge-block': { part: 'badge', at: 0 },
  'small-region-tightens-its-badge-ends': { part: 'badge', at: 0 },
  'small-badge-compacts-itself': { part: 'badge', at: 0 },
  'small-badge-tightens-its-block': { part: 'badge', at: 0 },
  'small-badge-tightens-its-ends': { part: 'badge', at: 0 },
  'medium-badge-stays-medium-in-a-small-region': { part: 'badge', at: 0 },
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
  'pin-input-root-shrinks': { part: 'pin-input', at: 0 },
  'tag-keeps-its-word-in-a-row': { part: 'tag', at: 0 },
  'timeline-connector-reaches-next-dot': { part: 'timeline.connector', at: 0 },
  'timeline-connector-reaches-next-dot-comfortable': { part: 'timeline.connector', at: 0 },
  'timeline-connector-horizontal': { part: 'timeline.connector', at: 0 },
  'timeline-connector-horizontal-keeps-block-margin': { part: 'timeline.connector', at: 0 },
  'tag-breaks-a-label-wider-than-its-container': { part: 'tag', at: 0 },
  'palette-scope-takes-the-surface-radius': { part: 'palette-scope', at: 0 },
  'member-default-kept-while-the-group-is-silent': { part: 'icon-button', at: 0 },
  'group-answer-replaces-the-member-default': { part: 'icon-button', at: 0 },
  'secondary-answer-reaches-the-calendar-nav': { part: 'button', at: 0 },
  'choices-answer-moves-every-box': { part: 'checkbox.box', at: 0 },
  'selected-disabled-answer-stops-only-the-selected-fade': { part: 'icon-button', at: -1 },
  'answered-disabled-choices-stops-the-fade': { part: 'checkbox.box', at: -1 },
  'answered-disabled-radio-stops-the-fade': { part: 'radio.ring', at: -1 },
  'answered-disabled-switch-stops-the-fade': { part: 'switch.track', at: -1 },
  'fields-edge-answer-moves-the-halo': { part: 'input.field', at: 0 },
  'answered-disabled-field-stops-the-fade': { part: 'input.field', at: -1 },
  'fields-error-zone-keeps-its-edge-while-disabled': { part: 'file-input.zone', at: 0 },
  'fields-error-zone-keeps-its-edge-while-dragged': { part: 'file-input.zone', at: 0 },
  'fields-error-zone-draws-no-field-unless-droppable': { part: 'file-input.zone', at: 0 },
  'answered-disabled-field-keeps-its-answer-while-hovered': { part: 'input.field', at: 0 },
  'hovered-enabled-field-takes-its-hover-answer': { part: 'input.field', at: 0 },
  'class-on-copy-button-reaches-the-icon-button-it-draws': { part: 'icon-button', at: 0 },
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
    if (DRAGGED.has(kase.name)) {
      const zone = container.querySelector('[data-arena-part="file-input.zone"]')!;
      const event = new Event('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'] } });
      act(() => { zone.dispatchEvent(event); });
    }
    const { part: subjectPart, at } = SUBJECT[kase.name] ?? { part: 'button', at: -1 };
    const found = [...container.querySelectorAll(`[data-arena-part="${subjectPart}"]`)];
    const subject = (BARE.has(kase.name) && container.getAttribute('data-arena-part') === subjectPart ? container : found.at(at)) ?? null;
    const tree = normalize(container as unknown as NodeLike, vocabulary, subject as unknown as NodeLike);
    assert.deepEqual(tree, kase.react, `recorded tree for ${kase.name}:\n${JSON.stringify(tree)}`);
  });
}
