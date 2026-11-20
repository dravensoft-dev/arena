/* Each proximity case rendered in Angular and normalised to the tree the gate measures, held equal
 * to the fixture. A null tree is a case not yet recorded: the suite fails printing the tree it
 * rendered, which is read against the case's intent before it is pasted into the fixture. The
 * subject is the last drawn button in each case. An opened combobox's CDK overlay panel moves
 * beside its field, so the normalised tree is the one both layers record. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import '@angular/compiler';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton';
import { ArenaTooltip } from '../components/feedback/arena-tooltip/ArenaTooltip';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';
import { ArenaPopover } from '../components/feedback/arena-popover/ArenaPopover';
import { ArenaIconButton } from '../components/forms/arena-icon-button/ArenaIconButton';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton';
import { ArenaCopyButton } from '../components/forms/arena-copy-button/ArenaCopyButton';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaAppLogo } from '../components/brand/arena-app-logo/ArenaAppLogo';
import { ArenaPeopleList } from '../components/display/arena-people-list/ArenaPeopleList';
import { ArenaPersonRow } from '../components/display/arena-person-row/ArenaPersonRow';
import { ArenaCard } from '../components/display/arena-card/ArenaCard';
import { ArenaBadge } from '../components/display/arena-badge/ArenaBadge';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaGrid } from '../components/layout/arena-grid/ArenaGrid';
import { ArenaScroller } from '../components/layout/arena-scroller/ArenaScroller';
import { ArenaScrollerItem } from '../components/layout/arena-scroller-item/ArenaScrollerItem';
import { ArenaSkeleton } from '../components/display/arena-skeleton/ArenaSkeleton';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar';
import { ArenaTag } from '../components/display/arena-tag/ArenaTag';
import { ArenaPinInput } from '../components/forms/arena-pin-input/ArenaPinInput';
import { ArenaTimeline } from '../components/display/arena-timeline/ArenaTimeline';
import { ArenaPaletteScope } from '../components/layout/arena-palette-scope/ArenaPaletteScope';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup';
import { ArenaRadio } from '../components/forms/arena-radio/ArenaRadio';
import { ArenaSwitch } from '../components/forms/arena-switch/ArenaSwitch';
import { ArenaSlider } from '../components/forms/arena-slider/ArenaSlider';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput';
import { ArenaSideNav } from '../components/navigation/arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem';
import { ArenaTabs } from '../components/navigation/arena-tabs/ArenaTabs';
import { ArenaTab } from '../components/navigation/arena-tab/ArenaTab';
import { ArenaTreeView } from '../components/navigation/arena-tree-view/ArenaTreeView';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination';
import { ArenaBottomNav } from '../components/navigation/arena-bottom-nav/ArenaBottomNav';
import { ArenaBottomNavItem } from '../components/navigation/arena-bottom-nav-item/ArenaBottomNavItem';
import { ArenaStepper } from '../components/navigation/arena-stepper/ArenaStepper';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaAlert } from '../components/feedback/arena-alert/ArenaAlert';
import { ArenaToast } from '../components/feedback/arena-toast/ArenaToast';
import { ArenaAvatar } from '../components/display/arena-avatar/ArenaAvatar';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed';
import { ArenaMeter } from '../components/feedback/arena-meter/ArenaMeter';
import { ArenaProgressBar } from '../components/feedback/arena-progress-bar/ArenaProgressBar';
import { ArenaSpinner } from '../components/feedback/arena-spinner/ArenaSpinner';
import { ArenaFooter } from '../ProjectionMarkers';
import { LIB } from './Compliance';

const root = document.documentElement;
before(() => {
  root.style.setProperty('--bp-md', '768px');
});
after(() => {
  root.style.removeProperty('--bp-md');
});

const proximity = await import(pathToFileURL(join(LIB, 'arena', 'proximity.ts')).href);

const TEMPLATES: Record<string, string> = {
  'class-on-component-beats-ancestor': '<arena-button class="arena-fill">Save</arena-button>',
  'nearer-fit-beats-ancestor-fill': '<arena-button class="arena-fit">Save</arena-button>',
  'class-on-tooltip-reaches-its-trigger': '<arena-tooltip class="arena-fill" label="Copy"><arena-button>Save</arena-button></arena-tooltip>',
  'class-on-menu-reaches-its-trigger': '<arena-menu class="arena-fill" [items]="[]"><arena-button trigger>Save</arena-button></arena-menu>',
  'class-on-popover-reaches-its-trigger': '<arena-popover class="arena-fill" label="Filters"><arena-button trigger>Save</arena-button></arena-popover>',
  'ancestor-reaches-through-the-transparent-trigger': '<arena-tooltip label="Copy"><arena-button>Save</arena-button></arena-tooltip>',
  'class-on-trigger-alone-fills-the-wrapper-box': '<arena-tooltip label="Copy"><arena-button class="arena-fill">Save</arena-button></arena-tooltip>',
  'box-class-stops-at-a-boundary': '<arena-card><arena-button>Save</arena-button></arena-card>',
  'context-class-crosses-a-boundary': '<arena-card><arena-button>Save</arena-button></arena-card>',
  'box-channel-stays-out-of-content': '<arena-card><arena-button>Save</arena-button></arena-card>',
  'option-not-answered-stays-out': '<div class="arena-optwitness-b"><arena-button>Save</arena-button></div>',
  'size-reaches-the-toolbar': '<arena-button>Save</arena-button><arena-button>Cancel</arena-button><arena-icon-button icon="ph-bold ph-plus" label="Add" />'
    + '<arena-dialog [open]="true" title="Discard"><arena-button footer>Confirm</arena-button></arena-dialog>',
  'nearer-size-wins': '<arena-button>Save</arena-button><arena-button class="arena-size-lg">Cancel</arena-button><arena-icon-button icon="ph-bold ph-plus" label="Add" />',
  'size-option-not-answered': '<div class="arena-size-xl"><arena-button>Save</arena-button><arena-app-logo name="Draven" /></div>',
  'size-re-densifies-in-compact': '<arena-button class="arena-size-sm">Save</arena-button>',
  'size-re-densifies-in-compact-under-the-size': '<div class="arena-compact"><arena-button>Save</arena-button></div>',
  'size-re-densifies-in-comfortable': '<arena-button class="arena-size-sm">Save</arena-button>',
  'size-re-densifies-in-comfortable-under-the-size': '<div class="arena-comfortable"><arena-button>Save</arena-button></div>',
  'people-list-face-follows-the-list': '<arena-people-list class="arena-size-lg" label="Standings"><arena-person-row name="Ines Marchetti" /></arena-people-list>',
  'meaning-follows-the-base': '<arena-button destructive>Delete</arena-button><arena-button>Save</arena-button>',
  'meaning-wins-over-accent': '<arena-badge class="arena-accent-gold" tone="success">Paid</arena-badge>',
  'solid-container-fills-its-badge': '<arena-badge tone="success">Live</arena-badge>',
  'soft-badge-stays-soft-in-a-solid-container': '<arena-badge class="arena-mark-soft" tone="success">Live</arena-badge>',
  'small-region-compacts-its-badge': '<arena-badge tone="danger" class="arena-mark-solid">Live</arena-badge>',
  'small-region-tightens-its-badge-block': '<arena-badge tone="danger" class="arena-mark-solid">Live</arena-badge>',
  'small-region-tightens-its-badge-ends': '<arena-badge tone="danger" class="arena-mark-solid">Live</arena-badge>',
  'small-badge-compacts-itself': '<arena-badge tone="danger" class="arena-mark-solid arena-size-sm">Live</arena-badge>',
  'small-badge-tightens-its-block': '<arena-badge tone="danger" class="arena-mark-solid arena-size-sm">Live</arena-badge>',
  'small-badge-tightens-its-ends': '<arena-badge tone="danger" class="arena-mark-solid arena-size-sm">Live</arena-badge>',
  'medium-badge-stays-medium-in-a-small-region': '<arena-badge tone="danger" class="arena-mark-solid arena-size-md">Live</arena-badge>',
  'accent-stops-at-the-card-body': '<arena-card class="arena-accent-primary"><arena-tag>Draft</arena-tag></arena-card>',
  'placement-stops-at-the-sheet-body': '<arena-sheet [open]="true" title="Outer"><arena-sheet [open]="true" title="Inner" /></arena-sheet>',
  'grid-min-reaches-the-grid': '<div style="display: contents; --arena-grid-min: 300px"><arena-grid><arena-card title="A" /></arena-grid></div>',
  'grid-min-stops-at-the-card-content': '<div style="display: contents; --arena-grid-min: 300px"><arena-grid><arena-card title="A"><arena-grid /></arena-card></arena-grid></div>',
  'grid-min-stops-at-a-lone-card-body': '<div style="display: contents; --arena-grid-min: 300px"><arena-card title="A"><arena-grid /></arena-card></div>',
  'grid-min-class-beats-the-property': '<div style="display: contents; --arena-grid-min: 300px"><arena-grid class="arena-grid-min-sm"><arena-card title="A" /></arena-grid></div>',
  'scroller-class-reaches-its-items': '<arena-scroller class="arena-scroller-item-sm" label="Lots"><arena-scroller-item /></arena-scroller>',
  'skeleton-circle-takes-its-width-as-diameter': '<div style="--arena-skeleton-width: 64px"><arena-skeleton class="arena-skeleton-circle" /></div>',
  'skeleton-circle-height-wins': '<div style="--arena-skeleton-width: 40px; --arena-skeleton-height: 64px"><arena-skeleton class="arena-skeleton-circle" /></div>',
  'skeleton-radius-is-read-by-block-only': '<div style="--arena-skeleton-radius: 12px"><arena-skeleton class="arena-skeleton-line" /></div>',
  'day-head-clears-the-comfortable-row': '<arena-calendar view="week" anchorDate="2025-03-03" dayInteractive />',
  'pin-input-root-shrinks': '<arena-pin-input label="Code" />',
  'tag-keeps-its-word-in-a-row': '<arena-tag>Draft</arena-tag>',
  'timeline-connector-reaches-next-dot': '<arena-timeline label="Order" [items]="[{ title: \'Placed\' }, { title: \'Shipped\' }]" />',
  'timeline-connector-reaches-next-dot-comfortable': '<arena-timeline label="Order" [items]="[{ title: \'Placed\' }, { title: \'Shipped\' }]" />',
  'timeline-connector-horizontal': '<arena-timeline label="Order" [items]="[{ title: \'Placed\' }, { title: \'Shipped\' }]" />',
  'timeline-connector-horizontal-keeps-block-margin': '<arena-timeline label="Order" [items]="[{ title: \'Placed\' }, { title: \'Shipped\' }]" />',
  'tag-breaks-a-label-wider-than-its-container': '<arena-tag>InternationalisationInternationalisationInternationalisationInternationalisationInternationalisationInternationalisation</arena-tag>',
  'palette-scope-takes-the-surface-radius': '<div arenaPalette="light"><span>Light</span></div>',
  'group-answer-moves-every-member': '<div style="--actions-primary-root-fill-rest: var(--fill-surface)"><arena-button>Save</arena-button>'
    + '<arena-split-button label="Deployment" menuLabel="More deploy options" [items]="[{ label: \'Deploy\' }]">Deploy</arena-split-button>'
    + '<arena-icon-button icon="ph-bold ph-x" label="Close" /></div>',
  'context-class-beats-the-default-block': '<div style="--actions-primary-root-fill-rest: var(--fill-surface-raised)"><arena-button>Save</arena-button></div>',
  'member-default-kept-while-the-group-is-silent': '<div><arena-icon-button icon="ph-bold ph-x" label="Close" /><arena-button class="arena-emphasis-ghost">Save</arena-button></div>',
  'secondary-answer-reaches-the-calendar-nav': '<div style="--actions-secondary-root-fill-rest: var(--fill-surface)"><arena-button class="arena-emphasis-secondary">Save</arena-button><arena-calendar view="week" anchorDate="2025-03-03" /></div>',
  'group-answer-replaces-the-member-default': '<div style="--actions-ghost-root-edge-rest: var(--hue-danger-edge)"><arena-icon-button icon="ph-bold ph-x" label="Close" /><arena-button class="arena-emphasis-ghost">Save</arena-button></div>',
  'answered-disabled-stops-the-fade': '<div style="--actions-primary-root-ink-disabled: var(--ink-muted); --actions-primary-root-fade-disabled: 1"><arena-button disabled>Save</arena-button></div>',
  'answered-disabled-draws-its-ink': '<div style="--actions-primary-root-ink-disabled: var(--ink-muted); --actions-primary-root-fade-disabled: 1"><arena-button disabled>Save</arena-button></div>',
  'answered-disabled-ink-reaches-the-glyph': '<div style="--actions-primary-root-ink-disabled: var(--ink-muted); --actions-primary-root-fade-disabled: 1"><arena-button disabled icon="ph-bold ph-x">Save</arena-button></div>',
  'choices-answer-moves-every-box': '<div style="--choices-box-fill-selected: var(--fill-surface)"><arena-checkbox checked label="Notify" />'
    + '<arena-radio-group ariaLabel="Cadence" value="daily"><arena-radio value="daily" label="Daily" /></arena-radio-group>'
    + '<arena-switch state label="Sync" /><arena-slider label="Volume" [value]="40" /></div>',
  'ink-answer-reaches-the-glyph': '<div style="--actions-primary-root-ink-rest: var(--fill-surface)"><arena-button icon="ph-bold ph-x">Save</arena-button></div>',
  'icon-rest-answer-keeps-the-level': '<div style="--actions-ghost-root-icon-rest: var(--hue-danger-ink)"><arena-button class="arena-emphasis-ghost" icon="ph-bold ph-x">Save</arena-button></div>',
  'class-on-copy-button-reaches-the-icon-button-it-draws': '<div style="--actions-solid-root-fill-rest: var(--fill-surface-raised)"><arena-copy-button class="arena-emphasis-solid" text="x" label="Copy" /></div>',
  'answered-disabled-keeps-the-rest-fill': '<div style="--actions-primary-root-ink-disabled: var(--ink-muted); --actions-primary-root-fade-disabled: 1"><arena-button disabled>Save</arena-button></div>',
  'selected-disabled-answer-stops-only-the-selected-fade': '<div style="--actions-ghost-root-ink-disabled: var(--ink-muted); --actions-ghost-root-fade-disabled: 1"><arena-icon-button icon="ph-bold ph-x" label="Close" [pressed]="true" disabled /></div>'
    + '<div style="--actions-ghost-root-ink-selected-disabled: var(--ink-muted); --actions-ghost-root-fade-selected-disabled: 1"><arena-icon-button icon="ph-bold ph-x" label="Close" [pressed]="true" disabled /></div>',
  'answered-disabled-choices-stops-the-fade': '<div><arena-checkbox disabled label="Notify" /></div>'
    + '<div style="--choices-box-fill-disabled: var(--fill-surface); --choices-box-fade-disabled: 1"><arena-checkbox disabled label="Notify" /></div>',
  'answered-disabled-radio-stops-the-fade': '<div><arena-radio-group ariaLabel="Cadence" value="daily"><arena-radio value="daily" label="Daily" disabled /></arena-radio-group></div>'
    + '<div style="--choices-box-fill-selected-disabled: var(--fill-surface); --choices-box-fade-selected-disabled: 1"><arena-radio-group ariaLabel="Cadence" value="daily"><arena-radio value="daily" label="Daily" disabled /></arena-radio-group></div>',
  'answered-disabled-switch-stops-the-fade': '<div><arena-switch label="Sync" disabled /></div>'
    + '<div style="--choices-box-fill-disabled: var(--fill-surface); --choices-box-fade-disabled: 1"><arena-switch label="Sync" disabled /></div>',
  'fields-edge-answer-moves-the-halo': '<div style="--fields-error-field-edge-rest: var(--hue-warning-edge)"><arena-input label="Email" error="Required" /></div>',
  'answered-disabled-field-stops-the-fade': '<div><arena-input label="Email" disabled /></div>'
    + '<div style="--fields-neutral-field-fill-disabled: var(--fill-surface); --fields-neutral-field-fade-disabled: 1"><arena-input label="Email" disabled /></div>',
  'fields-error-zone-keeps-its-edge-while-disabled': '<div style="--fields-error-field-edge-disabled: var(--hue-warning-edge)"><arena-file-input label="Upload" [droppable]="true" error="Too big" disabled /></div>',
  'fields-error-zone-keeps-its-edge-while-dragged': '<div style="--fields-error-field-edge-hover: var(--hue-warning-edge)"><arena-file-input label="Upload" [droppable]="true" error="Too big" /></div>',
  'fields-error-zone-draws-no-field-unless-droppable': '<arena-file-input label="Upload" error="Too big" />',
  'answered-disabled-field-keeps-its-answer-while-hovered': '<div style="--fields-neutral-field-fill-disabled: var(--fill-surface)"><arena-input label="Email" disabled /></div>',
  'hovered-enabled-field-takes-its-hover-answer': '<div style="--fields-neutral-field-fill-hover: var(--fill-surface)"><arena-input label="Email" /></div>',
  'hovered-readonly-field-keeps-its-readonly-fill': '<arena-input label="Email" readOnly />',
  'answered-disabled-dismiss-stops-the-fade': '<div><arena-tag removable disabled>europe-west</arena-tag></div>'
    + '<div style="--actions-dismiss-ink-disabled: var(--ink-body); --actions-dismiss-fade-disabled: 1"><arena-tag removable disabled>europe-west</arena-tag></div>',
  'menu-answer-moves-every-highlight': '<div style="--menus-plain-item-fill-selected: var(--fill-surface)">'
    + '<arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }]" [value]="[]" />'
    + '<arena-command-palette [open]="true" [commands]="[{ id: \'home\', label: \'Go home\' }]" /></div>',
  'blocked-option-fades-until-answered': '<div><arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }, { value: \'us-east\', label: \'US East\' }]" [value]="[]" [max]="0" /></div>'
    + '<div style="--menus-plain-item-fade-disabled: 1"><arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }, { value: \'us-east\', label: \'US East\' }]" [value]="[]" [max]="0" /></div>',
  'blocked-active-option-fades-until-answered': '<div><arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }]" [value]="[]" [max]="0" /></div>'
    + '<div style="--menus-plain-item-fade-selected-disabled: 1"><arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }]" [value]="[]" [max]="0" /></div>',
  'blocked-active-option-keeps-its-selected-wash': '<div><arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }]" [value]="[]" /></div>'
    + '<div><arena-multi-select label="Regions" [options]="[{ value: \'eu-west\', label: \'Europe West\' }]" [value]="[]" [max]="0" /></div>',
  'navigation-answer-moves-every-current-item': '<div style="--navigation-item-fill-selected: var(--fill-surface)">' + '<arena-side-nav ariaLabel="Primary" active="home"><arena-side-nav-item id="home" label="Home" /></arena-side-nav>' + '<arena-tree-view label="Files" [nodes]="[{ id: \'src\', label: \'src\' }]" [selection]="{ ids: [\'src\'] }" />' + '<arena-pagination ariaLabel="Deployments" [page]="1" [pageCount]="1" />' + '<arena-bottom-nav ariaLabel="Mobile" active="home"><arena-bottom-nav-item id="home" label="Home" icon="ph-bold ph-house" /></arena-bottom-nav></div>',
  'hovered-current-item-keeps-its-selected-look': '<arena-side-nav ariaLabel="Primary" active="home"><arena-side-nav-item id="home" label="Home" /></arena-side-nav>',
  'hovered-selected-tab-keeps-its-selected-ink': '<arena-tabs value="one"><arena-tab value="one" label="One">First</arena-tab></arena-tabs>',
  'selected-edge-answer-moves-the-tab-rule': '<div style="--navigation-item-edge-selected: var(--hue-info-edge)"><arena-tabs value="one"><arena-tab value="one" label="One">First</arena-tab></arena-tabs></div>',
  'selected-edge-answer-moves-the-current-page-border': '<div style="--navigation-item-edge-selected: var(--hue-info-edge)"><arena-pagination ariaLabel="Deployments" [page]="1" [pageCount]="1" /></div>',
  'aria-disabled-member-fades-until-answered': '<div><arena-bottom-nav ariaLabel="Mobile"><arena-bottom-nav-item id="locked" label="Locked" icon="ph-bold ph-lock" disabled /></arena-bottom-nav></div>' + '<div><arena-tree-view label="Files" [nodes]="[{ id: \'src\', label: \'src\', disabled: true }]" /></div>' + '<div style="--navigation-item-fade-disabled: 1"><arena-bottom-nav ariaLabel="Mobile"><arena-bottom-nav-item id="locked" label="Locked" icon="ph-bold ph-lock" disabled /></arena-bottom-nav></div>',
  'answered-disabled-tree-item-stops-the-fade': '<div><arena-tree-view label="Files" [nodes]="[{ id: \'src\', label: \'src\', disabled: true }]" /></div>' + '<div style="--navigation-item-fade-disabled: 1"><arena-tree-view label="Files" [nodes]="[{ id: \'src\', label: \'src\', disabled: true }]" /></div>',
  'answered-disabled-tree-item-keeps-its-answer-while-hovered': '<div style="--navigation-item-fill-disabled: var(--hue-info-fill-strong)"><arena-tree-view label="Files" [nodes]="[{ id: \'src\', label: \'src\', disabled: true }]" /></div>',
  'answered-selected-disabled-tree-item-keeps-its-answer-while-hovered': '<div style="--navigation-item-fill-selected-disabled: var(--hue-info-fill-strong)"><arena-tree-view label="Files" [nodes]="[{ id: \'src\', label: \'src\', disabled: true }]" [selection]="{ ids: [\'src\'] }" /></div>',
  'selected-edge-answer-draws-no-side-nav-line': '<div style="--navigation-item-edge-selected: var(--hue-info-edge)"><arena-side-nav ariaLabel="Primary" active="home"><arena-side-nav-item id="home" label="Home" /></arena-side-nav></div>',
  'error-step-reads-the-error-chain-while-current': '<arena-stepper ariaLabel="Checkout" [steps]="[{ label: \'Account\', error: true }]" [index]="0" />',
  'current-step-answer-moves-marker-and-dot': '<div style="--steps-current-marker-fill-rest: var(--fill-surface)"><arena-stepper ariaLabel="Checkout" [steps]="[{ label: \'Account\' }]" [index]="0" /><arena-onboarding [open]="true" [steps]="[{ body: \'One\' }]" [index]="0" /></div>',
  'banner-edge-answer-moves-alert-border-and-toast-stripe': '<div style="--feedback-success-banner-edge-rest: var(--hue-info-edge)"><arena-alert tone="success">Saved</arena-alert><arena-toast tone="success" title="Saved" message="Done"></arena-toast></div>',
  'banner-edge-answer-leaves-the-toast-quiet-sides': '<div style="--feedback-success-banner-edge-rest: var(--hue-info-edge)"><arena-alert tone="success">Saved</arena-alert><arena-toast tone="success" title="Saved" message="Done"></arena-toast></div>',
  'toast-tone-beats-its-accent': '<arena-toast class="arena-accent-gold" tone="success" title="Saved" message="Done"></arena-toast>',
  'muted-dot-answer-moves-only-offline': '<div style="--marks-muted-dot-ink-rest: var(--hue-info-ink)"><arena-avatar name="Ada Fernandez" status="offline" /><arena-activity-feed label="Activity" [items]="[{ actor: \'Ada\', action: \'opened\', target: \'INF-1\', time: \'now\' }]" /></div>',
  'accent-answer-reaches-only-its-class': '<div style="--meters-gold-track-ink-rest: var(--hue-info-ink)"><arena-meter class="arena-accent-gold" label="Disk" [value]="60" /><arena-progress-bar class="arena-accent-gold" label="Upload" [progressPercentage]="40" /><arena-spinner class="arena-accent-gold" /></div>',
  'accent-answer-leaves-the-default-accent-and-a-tone': '<div style="--meters-gold-track-ink-rest: var(--hue-info-ink)"><arena-meter label="Disk" [value]="60" /><arena-progress-bar tone="success" label="Upload" [progressPercentage]="40" /><arena-spinner /></div>',
  'ring-track-follows-the-track-fill': '<div style="--meters-primary-track-fill-rest: var(--hue-info-fill-strong)"><arena-progress-bar shape="radial" label="Upload" [progressPercentage]="40" /></div>',
  'linear-track-follows-the-track-fill': '<div style="--meters-primary-track-fill-rest: var(--hue-info-fill-strong)"><arena-progress-bar label="Upload" [progressPercentage]="40" /></div>',
  'hover-answer-is-not-derived-from-the-rest-answer': '<div style="--actions-primary-root-fill-rest: var(--fill-surface); --actions-primary-root-fill-hover: var(--fill-hover)"><arena-button>Save</arena-button></div>',
};

const BARE = new Set(['toast-tone-beats-its-accent', 'meaning-wins-over-accent', 'accent-stops-at-the-card-body', 'small-badge-compacts-itself', 'small-badge-tightens-its-block', 'small-badge-tightens-its-ends']);
const SUBJECT: Record<string, { part: string; index: number }> = {
  'people-list-face-follows-the-list': { part: 'avatar.box', index: -1 },
  'meaning-follows-the-base': { part: 'button', index: 0 },
  'meaning-wins-over-accent': { part: 'badge', index: -1 },
  'solid-container-fills-its-badge': { part: 'badge', index: -1 },
  'soft-badge-stays-soft-in-a-solid-container': { part: 'badge', index: -1 },
  'small-region-compacts-its-badge': { part: 'badge', index: -1 },
  'small-region-tightens-its-badge-block': { part: 'badge', index: -1 },
  'small-region-tightens-its-badge-ends': { part: 'badge', index: -1 },
  'small-badge-compacts-itself': { part: 'badge', index: -1 },
  'small-badge-tightens-its-block': { part: 'badge', index: -1 },
  'small-badge-tightens-its-ends': { part: 'badge', index: -1 },
  'medium-badge-stays-medium-in-a-small-region': { part: 'badge', index: -1 },
  'accent-stops-at-the-card-body': { part: 'card', index: -1 },
  'placement-stops-at-the-sheet-body': { part: 'sheet', index: 0 },
  'grid-min-reaches-the-grid': { part: 'grid', index: 0 },
  'grid-min-stops-at-the-card-content': { part: 'grid', index: -1 },
  'grid-min-stops-at-a-lone-card-body': { part: 'grid', index: 0 },
  'grid-min-class-beats-the-property': { part: 'grid', index: 0 },
  'scroller-class-reaches-its-items': { part: 'scroller-item', index: 0 },
  'skeleton-circle-takes-its-width-as-diameter': { part: 'skeleton', index: 0 },
  'skeleton-circle-height-wins': { part: 'skeleton', index: 0 },
  'skeleton-radius-is-read-by-block-only': { part: 'skeleton', index: 0 },
  'day-head-clears-the-comfortable-row': { part: 'calendar.day-head', index: 0 },
  'pin-input-root-shrinks': { part: 'pin-input', index: 0 },
  'tag-keeps-its-word-in-a-row': { part: 'tag', index: 0 },
  'timeline-connector-reaches-next-dot': { part: 'timeline.connector', index: 0 },
  'timeline-connector-reaches-next-dot-comfortable': { part: 'timeline.connector', index: 0 },
  'timeline-connector-horizontal': { part: 'timeline.connector', index: 0 },
  'timeline-connector-horizontal-keeps-block-margin': { part: 'timeline.connector', index: 0 },
  'tag-breaks-a-label-wider-than-its-container': { part: 'tag', index: 0 },
  'palette-scope-takes-the-surface-radius': { part: 'palette-scope', index: 0 },
  'member-default-kept-while-the-group-is-silent': { part: 'icon-button', index: 0 },
  'group-answer-replaces-the-member-default': { part: 'icon-button', index: 0 },
  'secondary-answer-reaches-the-calendar-nav': { part: 'button', index: 0 },
  'choices-answer-moves-every-box': { part: 'checkbox.box', index: 0 },
  'selected-disabled-answer-stops-only-the-selected-fade': { part: 'icon-button', index: -1 },
  'answered-disabled-choices-stops-the-fade': { part: 'checkbox.box', index: -1 },
  'answered-disabled-radio-stops-the-fade': { part: 'radio.ring', index: -1 },
  'answered-disabled-switch-stops-the-fade': { part: 'switch.track', index: -1 },
  'fields-edge-answer-moves-the-halo': { part: 'input.field', index: 0 },
  'answered-disabled-field-stops-the-fade': { part: 'input.field', index: -1 },
  'fields-error-zone-keeps-its-edge-while-disabled': { part: 'file-input.zone', index: 0 },
  'fields-error-zone-keeps-its-edge-while-dragged': { part: 'file-input.zone', index: 0 },
  'fields-error-zone-draws-no-field-unless-droppable': { part: 'file-input.zone', index: 0 },
  'answered-disabled-field-keeps-its-answer-while-hovered': { part: 'input.field', index: 0 },
  'hovered-enabled-field-takes-its-hover-answer': { part: 'input.field', index: 0 },
  'hovered-readonly-field-keeps-its-readonly-fill': { part: 'input.field', index: 0 },
  'answered-disabled-dismiss-stops-the-fade': { part: 'tag.close', index: -1 },
  'menu-answer-moves-every-highlight': { part: 'combobox.option', index: 0 },
  'blocked-option-fades-until-answered': { part: 'combobox.option', index: -1 },
  'blocked-active-option-keeps-its-selected-wash': { part: 'combobox.option', index: -1 },
  'blocked-active-option-fades-until-answered': { part: 'combobox.option', index: -1 },
  'answered-disabled-tree-item-keeps-its-answer-while-hovered': { part: 'tree-view.item', index: 0 },
  'answered-selected-disabled-tree-item-keeps-its-answer-while-hovered': { part: 'tree-view.item', index: 0 },
  'selected-edge-answer-draws-no-side-nav-line': { part: 'side-nav.item', index: 0 },
  'error-step-reads-the-error-chain-while-current': { part: 'stepper.marker', index: 0 },
  'navigation-answer-moves-every-current-item': { part: 'side-nav.item', index: 0 },
  'hovered-current-item-keeps-its-selected-look': { part: 'side-nav.item', index: 0 },
  'hovered-selected-tab-keeps-its-selected-ink': { part: 'tabs.tab', index: 0 },
  'selected-edge-answer-moves-the-tab-rule': { part: 'tabs.tab', index: 0 },
  'selected-edge-answer-moves-the-current-page-border': { part: 'pagination.page', index: 0 },
  'aria-disabled-member-fades-until-answered': { part: 'bottom-nav.item', index: -1 },
  'answered-disabled-tree-item-stops-the-fade': { part: 'tree-view.item', index: -1 },
  'current-step-answer-moves-marker-and-dot': { part: 'stepper.marker', index: 0 },
  'class-on-copy-button-reaches-the-icon-button-it-draws': { part: 'icon-button', index: 0 },
  'banner-edge-answer-moves-alert-border-and-toast-stripe': { part: 'alert', index: 0 },
  'banner-edge-answer-leaves-the-toast-quiet-sides': { part: 'toast', index: 0 },
  'toast-tone-beats-its-accent': { part: 'toast', index: 0 },
  'muted-dot-answer-moves-only-offline': { part: 'avatar.status', index: 0 },
  'accent-answer-reaches-only-its-class': { part: 'meter.track', index: 0 },
  'accent-answer-leaves-the-default-accent-and-a-tone': { part: 'meter.track', index: 0 },
  'ring-track-follows-the-track-fill': { part: 'progress-bar.ring-track', index: 0 },
  'linear-track-follows-the-track-fill': { part: 'progress-bar.track', index: 0 },
};

const OPENED = new Set(['menu-answer-moves-every-highlight', 'blocked-option-fades-until-answered', 'blocked-active-option-fades-until-answered', 'blocked-active-option-keeps-its-selected-wash']);
const { families, cases } = proximity.readProximity();
const vocabulary = proximity.vocabularyClasses(families);

test('every case has an Angular template, and every template a case', () => {
  assert.deepEqual(Object.keys(TEMPLATES).sort(), cases.map((one: { name: string }) => one.name).sort());
});

for (const kase of cases) {
  test(`${kase.name}: Angular renders the tree the gate measures`, () => {
    const Host = Component({
      selector: `proximity-${kase.name}-host`,
      standalone: true,
      imports: [ArenaStepper, ArenaOnboarding, ArenaSideNav, ArenaSideNavItem, ArenaTabs, ArenaTab, ArenaTreeView, ArenaPagination, ArenaBottomNav, ArenaBottomNavItem, ArenaButton, ArenaTooltip, ArenaMenu, ArenaPopover, ArenaCard, ArenaIconButton, ArenaDialog, ArenaAppLogo, ArenaPeopleList, ArenaPersonRow, ArenaFooter, ArenaBadge, ArenaTag, ArenaSheet, ArenaGrid, ArenaScroller, ArenaScrollerItem, ArenaSkeleton, ArenaCalendar, ArenaPinInput, ArenaTimeline, ArenaPaletteScope, ArenaSplitButton, ArenaCopyButton, ArenaCheckbox, ArenaRadioGroup, ArenaRadio, ArenaSwitch, ArenaSlider, ArenaInput, ArenaFileInput, ArenaMultiSelect, ArenaCommandPalette, ArenaAlert, ArenaToast, ArenaAvatar, ArenaActivityFeed, ArenaMeter, ArenaProgressBar, ArenaSpinner],
      template: BARE.has(kase.name) ? TEMPLATES[kase.name] : `<div class="${kase.container}">${TEMPLATES[kase.name]}</div>`,
    })(class {});
    const fixture = TestBed.createComponent(Host);
    try {
      fixture.detectChanges();
      fixture.detectChanges();
      const container = (fixture.nativeElement as Element).firstElementChild!;
      if (kase.name === 'fields-error-zone-keeps-its-edge-while-dragged') {
        const event = new Event('dragenter', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'] } });
        container.querySelector('[data-arena-part="file-input.zone"]')!.dispatchEvent(event);
        fixture.detectChanges();
      }
      if (OPENED.has(kase.name)) {
        for (const input of container.querySelectorAll('input[role="combobox"]')) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
          fixture.detectChanges();
          const panel = document.body.querySelector('.cdk-overlay-container [data-arena-part="combobox.panel"]');
          if (panel) input.closest('[data-arena-part="combobox"]')!.append(panel);
        }
        fixture.detectChanges();
      }
      const { part, index } = SUBJECT[kase.name] ?? { part: 'button', index: -1 };
      const drawn = [...(container.matches(`[data-arena-part="${part}"]`) ? [container] : []), ...container.querySelectorAll(`[data-arena-part="${part}"]`)];
      const subject = drawn.at(index) ?? null;
      const tree = proximity.normalize(container, vocabulary, subject);
      assert.deepEqual(tree, kase.angular, `recorded tree for ${kase.name}:\n${JSON.stringify(tree)}`);
    } finally {
      fixture.destroy();
    }
  });
}
