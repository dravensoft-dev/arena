/* Fails on a scale utility standing where a role belongs, on a slot that declares no kind, on a
 * numeric padding, gap or margin step, and on a padding, gap or radius role its kind does not
 * spend. A role says WHICH air or corner is asked about, so a style plugin can answer it; the
 * kind of a slot says which roles it may ask. Scale utilities are banned by utility name, and a
 * border width, a duration and an easing by token name. SCALE_USES records the places that
 * genuinely mean the value, one entry per case with its reason, keyed by component, slot and
 * utility, and an entry no manifest carries any more fails as stale. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { manifestFiles } from '../../lib/tailwind/tailwind-compile.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { classStringsBySlot } from '../arena/check-manifest-states.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';
import { KINDS, KIND_AIR, KIND_FREE, kindProblems } from '../../lib/tailwind/slot-kinds.ts';
import type { SlotKind } from '../../lib/tailwind/slot-kinds.ts';
import { MANIFESTS } from '../../build/tailwind/build-tailwind.ts';

export const node = {
  name: 'check:roles',
  reads: [MANIFESTS],
  writes: [],
  feeds: [],
};

const COMPONENTS_DIR = join(repoRoot, 'frameworks/tailwind/components');

export const SCALE_UTILITIES = new Map<string, string>([
  ['rounded-lg', 'rounded-surface'],
  ['rounded-md', 'rounded-surface-floating'],
  ['rounded-sm', 'rounded-control or rounded-field'],
  ['rounded-xs', 'rounded-control-sm or rounded-marker'],
  ['shadow-1', 'a depth role'],
  ['shadow-2', 'shadow-surface-floating or shadow-control-raised'],
  ['shadow-3', 'shadow-surface-deep'],
  ['shadow-none', 'nothing at all, when the branch means the depth the slot already paints'],
  ['bg-base-200', 'bg-surface or bg-surface-floating, when the slot IS the surface'],
  ['bg-base-300', 'bg-track, when the slot is the ground a value or a segment sits in, or bg-edge-separator when it is a rule drawn as a filled strip'],
  ['p-5', 'p-surface, when the slot is the room a surface gives its own content'],
  ['px-5', 'px-surface, for the same reason'],
  ['font-extrabold', 'font-heading, when the slot IS a heading in the display face'],
  ['tracking-tight', 'tracking-heading, for the same reason'],
  ['leading-body', 'leading-prose, when the slot is text somebody reads'],
  ['ease-out', 'ease-hover or ease-state, whichever duration the same transition names'],
  ['text-base-content', 'text-ink-heading, text-ink-body or text-ink-muted, whichever text this is'],
  ['border-base-300', 'an edge role: border-edge-surface, -field, -separator or -control-quiet'],
  ['border-neutral', 'an edge role: border-edge-surface-floating, -control or -marker'],
  ['uppercase', 'case-eyebrow or case-label, so a style plugin can set the register in sentence case'],
  ['font-mono', 'font-face-eyebrow or font-face-label, when the slot is a register rather than a figure'],
  ['font-display', 'font-face-heading, when the slot is a heading rather than the brand itself'],
  ['text-h1', 'text-title-page, when the slot is the one heading that names the screen'],
  ['text-h2', 'text-title-page or text-title-section, whichever this title is titling'],
  ['text-h3', 'text-title-section, when the slot is the head of a region on a page'],
  ['text-h4', 'text-title-surface, when the slot is the head of a card, a panel or a tile'],
  ['text-ctl-2xs', 'text-label, when the slot is in the label register'],
  ['tracking-label', 'tracking-eyebrow, when the slot IS an eyebrow'],
  ['tracking-field-label', 'tracking-label-role, the tracking of the label register'],
  ['tracking-column-header', 'tracking-label-role, since a column header is the register\'s own text'],
  ['tracking-badge', 'tracking-label-role, when the slot is in the label register rather than a figure'],
  ['tracking-uppercase-status', 'tracking-label-role, when the slot names a thing rather than reports a state'],
  ['text-neutral', 'an ink role: text-ink-muted, text-ink-body or text-ink-heading, whichever text this is'],
  ['--bw', '--bw-surface, --bw-control, --bw-field, --bw-marker or --bw-separator'],
  ['--dur-fast', '--dur-hover'],
  ['--dur-mid', '--dur-state'],
  ['--ease-out', '--ease-hover or --ease-state, inside an arbitrary [transition:...] property'],
]);

export const SCALE_USES = new Map<string, string>([
  ['ArenaDialog:panel:shadow-none', 'the panel of a dialog filling a narrow screen, which is the screen and has no depth: the literal cancels the deep role the panel paints everywhere else rather than answering a role of its own'],
  ['ArenaSideNav:item:ps-[calc(var(--pad-row-x)*var(--dz-row-scale-x)+var(--pad-row-indent)*var(--arena-side-nav-depth,0))]', 'the inline start of a row that nests, at the row inset plus one indent step per level the component writes: it sizes the nesting depth, not the room around content, so it is this slot\'s own length'],
  ['ArenaSideNav:trigger:ps-[calc(var(--pad-row-x)*var(--dz-row-scale-x)+var(--pad-row-indent)*var(--arena-side-nav-depth,0))]', 'the inline start of the trigger of a collapsible section, at the row inset plus one indent step per level the component writes: it sizes the nesting depth, not the room around content, so it is this slot\'s own length'],
  ['ArenaSideNav:sectionLabel:ps-[calc(var(--pad-row-x)*var(--dz-row-scale-x)+var(--pad-row-indent)*var(--arena-side-nav-depth,0))]', 'the inline start of a section label, at the row inset plus one indent step per level the component writes: it sizes the nesting depth, not the room around content, so it is this slot\'s own length'],
  ['ArenaSideNav:badge:tracking-badge', 'a nav counter, which is a figure in the mono face carrying no case role: the label register\'s tracking would open a number that is read one glyph at a time'],
  ['ArenaBottomNav:badge:tracking-badge', 'the same counter on the other bar, for the same reason'],
  ['ArenaAlert:action:tracking-uppercase-status', 'the word a reader presses to answer an alert, which is status text rather than a label: it says what happens next instead of what kind of thing this is'],
  ['ArenaToast:action:tracking-uppercase-status', 'the same word on a toast'],
  ['ArenaOnboarding:text:tracking-uppercase-status', 'the step a coachmark reports, which is a reading of where somebody is in a sequence'],
  ['ArenaCalendar:hourLabel:tracking-uppercase-status', 'the hour down the side of a day, which is a clock being read rather than a column being named'],
  ['ArenaAlert:icon:text-neutral', 'one branch of a tone variant whose other branches are the status colours, so the value is the tone the caller asked for rather than a colour this slot chose'],
  ['ArenaAlert:action:text-neutral', 'the same tone on the word beside that glyph'],
  ['ArenaAvatar:box:rounded-md', 'the team branch of the kind variant, whose person branch is the pill, so the value is the shape that says a team rather than a surface tier'],
  ['ArenaSegmentedControl:segment:shadow-1', 'the lift that tells the selected segment from its track, and the one place a control carries depth at rest rather than under a pointer'],
  ['ArenaCalendar:chip:--bw', 'arithmetic rather than a border: the chip reserves room for the kebab beside it with calc(--dz-ctl-h-sm + --bw*2), so the token is a length being added up and not an edge this slot draws'],
  ['ArenaTabs:tab:shadow-none', 'cancels the inset rule the selected branch draws under a tab, and the slot paints no depth role for it to override. A tab has no resting depth to restore, so the literal is the whole answer here rather than a value written over a role'],
  ['ArenaBulkActionBar:action:bg-base-200', 'the hover fill of a control INSIDE a floating surface: a control the user presses rather than a region something is placed inside, which is why it must not follow that surface when a style plugin moves it'],
  ['ArenaInput:field:bg-base-200', 'the readonly state of a field, which says a control cannot be typed into by matching the surface it sits on. It is a state of a control, not the surface itself, and a style plugin that moved it would be re-answering readonly rather than re-answering grouping'],
  ['ArenaTextarea:field:bg-base-200', 'the same readonly state, for the same reason'],
  ['ArenaCheckbox:box:bg-base-300', 'the ground of a control that is not set yet, which is the fill of a thing the user presses rather than of a region something is placed inside. It is the reason ArenaButton:root:bg-base-200 carries one step over, and a style plugin re-answering its tracks has said nothing about whether an unchecked box reads as empty'],
  ['ArenaRadio:ring:bg-base-300', 'the same unset ground, one control over'],
  ['ArenaSideNav:badge:bg-base-300', 'the same marker ground, on the count beside a navigation row that is not current'],
  ['ArenaAvatar:box:bg-base-300', 'the ground a monogram or a missing photograph sits on, which is a marker ground for the reason above and is the same slot that keeps font-display and font-extrabold for standing in for a face'],

  ['ArenaAvatar:box:font-extrabold', 'a monogram rather than a heading: two letters standing in for a face, weighted to read at 12px inside a circle. A style plugin that lightened its headings has said nothing about initials'],
  ['ArenaAppLogo:name:tracking-tight', 'the wordmark, which is the brand set as artwork rather than a heading in the document outline. It tracks with the mark beside it and follows no style plugin'],
  ['ArenaTextarea:field:leading-body', 'the leading of text a user TYPES, which follows the control the caret sits in rather than the prose a page sets. Moving it with a reading style plugin would reflow a form field under somebody mid-sentence'],
  ['ArenaOnboarding:panel:p-5', 'a coachmark, which is pinned to its anchor and sized in JS against the viewport, at 20px on every side, where pad-floating-x answers 24px and pad-floating-y 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],

  ['ArenaActivityFeed:time:font-mono', 'a timestamp, read as a figure. This entry and the twenty-three under it are the mono face standing for FIGURES or CODE rather than for a register: a column of digits aligns by digit and a string read character by character has to be monospaced whatever the page sounds like, so a style plugin that sets its labels in the display face has said nothing about any of them. It is the half .arena-num ships for a figure a consumer draws themselves'],
  ['ArenaCalendar:dayNumber:font-mono', 'a day of the month, read as a figure'],
  ['ArenaCalendar:time:font-mono', 'a clock time, read as a figure'],
  ['ArenaTable:td:font-mono', 'the mono column of a table, which is what the face is for'],
  ['ArenaTable:cardValue:font-mono', 'the same column in the card layout the table falls back to'],
  ['ArenaBoard:count:font-mono', 'how many cards a column holds, read as a figure beside its name, and a row of columns whose counts do not align by digit reads as a jumble'],
  ['ArenaBoard:summary:font-mono', 'the total a column adds up to, read as a figure under its name rather than as a register'],
  ['ArenaPeopleList:rank:font-mono', 'a position in a standings list, read as a figure, and a column of them has to align by digit or the list stops reading as a ranking'],
  ['ArenaPeopleList:figure:font-mono', 'the quantity a row of people is sorted by, read as a figure beside the name rather than as a register'],
  ['ArenaProgressBar:value:font-mono', 'a percentage that must not jitter as it counts'],
  ['ArenaTextarea:counter:font-mono', 'a character count that must not jitter as it counts'],
  ['ArenaBulkActionBar:count:font-mono', 'a selection count that must not jitter as it counts'],
  ['ArenaPagination:page:font-mono', 'a page number, and the row of them has to align'],
  ['ArenaPagination:ellipsis:font-mono', 'the gap between two page numbers, which sits on their grid'],
  ['ArenaBottomNav:badge:font-mono', 'a count on a badge'],
  ['ArenaSideNav:badge:font-mono', 'the same count in the side navigation'],
  ['ArenaErrorState:code:font-mono', 'an error code, read character by character'],
  ['ArenaConfirmDialog:input:font-mono', 'the field a user retypes a name into, where every character has to be distinguishable from the one it looks like'],
  ['ArenaInput:prefix:font-mono', 'a unit or a currency sitting on the field\'s own baseline grid'],
  ['ArenaCommandPalette:shortcut:font-mono', 'a keyboard shortcut, which is a key cap rather than a label'],
  ['ArenaCommandPalette:esc:font-mono', 'the same, for the escape cap'],
  ['ArenaMenu:shortcut:font-mono', 'the same, in a menu'],
  ['ArenaTooltip:bubble:font-mono', 'a tooltip carries a shortcut or a value often enough that the bubble is set in mono outright'],
  ['ArenaActivityFeed:target:font-mono', 'the object an activity happened to, which is an identifier rather than a name'],
  ['ArenaKeyValue:value:font-mono', 'a figure in a summary, and a column of them has to align by digit or it jitters as the basket changes. It is the same claim .arena-num ships for a figure a consumer draws themselves, made once here for the figures this component draws'],

  ['ArenaAppLogo:name:font-display', 'the wordmark, which is the brand set as artwork rather than a heading in the document outline. It follows the mark beside it and no style plugin'],
  ['ArenaAvatar:box:font-display', 'a monogram: two letters standing in for a face, which is the same reason the slot keeps font-extrabold'],
  ['ArenaSheet:trigger:font-display', 'the trigger repeats the title of the sheet it opens, so it follows that title rather than the heading tier'],
  ['ArenaSheet:trigger:text-h3', 'the same trigger and the same reason one axis over: the size follows the title it repeats, not the register the title tier is pitched at. The two entries move together or the slot is half on the tier'],
  ['ArenaStatCard:value:text-h2', 'the figure a stat card exists to show, which is data set large and not a title of anything. A style plugin re-pitching the titles on a page has said nothing about how big a number is, and binding this would have moved every dashboard the first time one did'],


  ['ArenaSideNav:badge:text-ctl-2xs', 'a nav counter, which is at the smallest control step because it is the smallest control text and not because it is a label: it carries the mono face and no case role, so text-label would pitch a figure at whatever a product decided its column headers should be'],
  ['ArenaBottomNav:badge:text-ctl-2xs', 'the same counter on the other bar, for the same reason'],
  ['ArenaBottomNav:item:text-ctl-2xs', 'the words under a bar icon, which are the control\'s own label in the body face rather than the label register, and are held at the smallest step by the room the bar has'],
  ['ArenaCalendar:time:text-ctl-2xs', 'a timestamp on an event, set in mono as a figure'],
  ['ArenaCalendar:detail:text-ctl-2xs', 'a detail line under an event\'s time, set on the time label\'s step because the chip sheds it by that line box, which calendar-detail-line-h measures'],

  ['ArenaActivityFeed:item:py-[calc(var(--sp-1)*3.5*var(--dz-row-scale-y))]', 'an activity entry, a row at 14px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaAlert:action:mt-2.5', 'the word a reader presses to answer an alert, under its message: 10px of separation inside the component, which no role answers'],
  ['ArenaAlert:message:mt-1', 'the message of a titled alert, under its title: 4px of separation inside the component, which no role answers'],
  ['ArenaAppBar:band:py-3', 'the band that lays out an app bar\'s brand, navigation and actions, above and below them: 12px of padding inside the component, which no role answers'],
  ['ArenaBadge:root:px-2.5', 'a badge, at 10px on its sides, where pad-marker-x answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBoard:column:p-2', 'a column of a board, the sunken lane its cards sit in, at 8px on every side, where pad-surface answers 20px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBottomNav:badge:px-1', 'the count on a bottom nav glyph, at 4px on its sides, where pad-marker-x answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBottomNav:item:gap-1', 'an item of a bottom nav, between its glyph and the label stacked under it, at 4px, where gap-row answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBottomNav:item:px-[calc(var(--sp-1)*var(--dz-row-scale-x))]', 'an item of a bottom nav, on its sides, a row at 4px before density scales it, where pad-row-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBulkActionBar:actions:gap-1.5', 'the actions of a bulk action bar, between one action and the next: 6px of gap inside the component, which no role answers'],
  ['ArenaBulkActionBar:root:gap-3.5', 'a bulk action bar, between its count, its divider and its actions on one line, at 14px, where gap-inline answers 8px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBulkActionBar:root:pl-3', 'a bulk action bar stacked on a narrow screen, at 12px on its start side, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBulkActionBar:root:pl-4', 'a bulk action bar, at 16px before its count, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBulkActionBar:root:pr-3', 'a bulk action bar, at 12px after its last action, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBulkActionBar:root:py-2.5', 'a bulk action bar stacked on a narrow screen, at 10px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCalendar:chip:mx-0.5', 'an event chip in a day column, at 2px on each side: it sizes the clearance that holds the chip off the column\'s rules, not the room around content, so it is this slot\'s own length'],
  ['ArenaCalendar:chip:rounded-control', 'an event chip in a day column, whose corner is rounded-control rather than the marker tier'],
  ['ArenaCalendar:dayHead:pt-[calc(var(--sp-1)*1.5*var(--dz-row-scale-y))]', 'the head of a day column, naming its weekday and date, above its text, a row at 6px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCalendar:dayHead:px-[calc(var(--sp-1)*2*var(--dz-row-scale-x))]', 'the head of a day column, naming its weekday and date, on its sides, a row at 8px before density scales it, where pad-row-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCalendar:dayNumber:mt-0.5', 'the date under the weekday in a day head: 2px of separation inside the component, which no role answers'],
  ['ArenaCalendar:heading:ml-1', 'the heading of a calendar toolbar, after its navigation buttons: 4px of separation inside the component, which no role answers'],
  ['ArenaCalendar:hourLabel:-mt-1', 'the hour down the side of a day, lifted to centre on the rule it names: it pulls the label up by 4px, which no role answers'],
  ['ArenaCalendar:panel:gap-2', 'the action panel an event chip opens, between one action and the next on its line, at 8px, where gap-inline answers 8px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCalendar:panel:p-2', 'the action panel an event chip opens, at 8px on every side, where pad-surface answers 20px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCalendar:panel:rounded-control', 'the action panel an event chip opens, whose corner is rounded-control rather than the surface tier'],
  ['ArenaCalendar:scroll:py-2', 'the scrolling body of a calendar, above its first hour and below its last: 8px of padding inside the component, which no role answers'],
  ['ArenaCalendar:toolbar:mb-3', 'the toolbar of a calendar, above its day heads: 12px of separation inside the component, which no role answers'],
  ['ArenaCard:eyebrow:mb-1.5', 'the eyebrow above a card title: 6px of separation inside the component, which no role answers'],
  ['ArenaCheckbox:root:gap-2.5', 'a checkbox, between its box and its label: 10px of gap inside the component, which no role answers'],
  ['ArenaCommandPalette:empty:px-3', 'the line a command palette shows when nothing matches, at 12px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:empty:py-4.5', 'the line a command palette shows when nothing matches, at 18px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:esc:py-0.5', 'the esc key hint at the end of a command palette\'s search line, at 2px above and below, where pad-marker-y answers 4px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:groupLabel:pb-[calc(var(--sp-1)*1.5*var(--dz-row-scale-y))]', 'the label over a group of commands, under its text, a row at 6px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:groupLabel:pt-[calc(var(--sp-1)*3*var(--dz-row-scale-y))]', 'the label over a group of commands, above its text, a row at 12px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:list:p-1.5', 'the scrolling list of a command palette, around its rows, at 6px on every side, where pad-floating-x answers 24px and pad-floating-y 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:panel:rounded-surface', 'the panel of a command palette, whose corner is rounded-surface rather than the floating tier'],
  ['ArenaCommandPalette:search:gap-2.5', 'the search line of a command palette, between its icon, its input and its esc hint, at 10px, where gap-inline answers 8px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:search:px-4', 'the search line of a command palette, at 16px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaCommandPalette:search:py-3.5', 'the search line of a command palette, at 14px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaConfirmDialog:confirm:px-4.5', 'the confirm button of a confirm dialog, sized as a medium button, at 18px on its sides, where pad-control-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaConfirmDialog:eyebrow:mb-2', 'the eyebrow above a confirm dialog\'s title: 8px of separation inside the component, which no role answers'],
  ['ArenaConfirmDialog:foot:pb-5.5', 'the foot of a confirm dialog, at 22px from the panel\'s bottom edge, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaConfirmDialog:head:pt-5.5', 'the head of a confirm dialog, at 22px from the panel\'s top edge, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaConfirmDialog:panel:rounded-surface', 'the panel of a confirm dialog, whose corner is rounded-surface rather than the floating tier'],
  ['ArenaConfirmDialog:requireBlock:mt-3.5', 'the block that asks for a typed confirmation, under the dialog\'s message: 14px of separation inside the component, which no role answers'],
  ['ArenaConfirmDialog:requireLabel:mb-1.5', 'the label above the typed confirmation field: 6px of separation inside the component, which no role answers'],
  ['ArenaDialog:eyebrow:mb-2', 'the eyebrow above a dialog\'s title: 8px of separation inside the component, which no role answers'],
  ['ArenaDialog:foot:pb-5.5', 'the foot of a dialog, at 22px from the panel\'s bottom edge, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaDialog:foot:pb-[max(calc(var(--sp-1)*5.5),var(--pad-safe-bottom))]', 'the foot of a dialog filling a narrow screen, at 22px from the screen\'s bottom edge or the safe-area inset, whichever is larger, where pad-floating-y answers 16px: the length is this slot\'s own and the role does not move it'],
  ['ArenaDialog:head:pt-5.5', 'the head of a dialog, at 22px from the panel\'s top edge, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaDialog:head:pt-[calc(var(--sp-1)*5.5+var(--pad-safe-top))]', 'the head of a dialog filling a narrow screen, at 22px below the safe-area inset at the screen\'s top edge, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaDialog:panel:rounded-surface', 'the panel of a dialog, whose corner is rounded-surface rather than the floating tier'],
  ['ArenaEmptyState:action:mt-1.5', 'the action under an empty state\'s message: 6px of separation inside the component, which no role answers'],
  ['ArenaEmptyState:root:px-8', 'an empty state, the dashed panel standing in for content that is not there, at 32px on its sides, where pad-status-x answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaEmptyState:root:py-14', 'an empty state, the dashed panel standing in for content that is not there, at 56px above and below, where pad-status-y answers 14px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaEmptyState:root:rounded-surface', 'an empty state, the dashed panel standing in for content that is not there, whose corner is rounded-surface rather than the status tier'],
  ['ArenaErrorState:actions:gap-2.5', 'the actions of an error state, between one button and the next: 10px of gap inside the component, which no role answers'],
  ['ArenaErrorState:actions:mt-1.5', 'the actions of an error state, under its message: 6px of separation inside the component, which no role answers'],
  ['ArenaErrorState:code:px-2.5', 'the error code an error state prints, at 10px on its sides, where pad-marker-x answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaErrorState:root:px-8', 'an error state, the panel standing in for content that failed to load, at 32px on its sides, where pad-status-x answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaErrorState:root:py-14', 'an error state, the panel standing in for content that failed to load, at 56px above and below, where pad-status-y answers 14px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaErrorState:root:rounded-surface', 'an error state, the panel standing in for content that failed to load, whose corner is rounded-surface rather than the status tier'],
  ['ArenaIconButton:root:pl-3', 'an icon button showing its label, at 12px before its glyph: it sizes the glyph inset, not the room around content, so it is this slot\'s own length'],
  ['ArenaIconButton:root:pr-3.5', 'an icon button showing its label, at 14px after its label, where pad-control-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaInput:required:ml-1', 'the required mark after an input\'s label: 4px of separation inside the component, which no role answers'],
  ['ArenaInput:root:gap-1.5', 'an input, between its label, its field and its hint: 6px of gap inside the component, which no role answers'],
  ['ArenaKeyValue:total:pt-3', 'the total line under a key-value list, below its rule: 12px of padding inside the component, which no role answers'],
  ['ArenaMenu:divider:my-1', 'the rule between groups of menu items: 4px above and below of separation inside the component, which no role answers'],
  ['ArenaMenu:header:pb-[calc(var(--sp-1)*var(--dz-row-scale-y))]', 'the header over a group of menu items, under its text, a row at 4px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaMenu:header:pt-[calc(var(--sp-1)*2*var(--dz-row-scale-y))]', 'the header over a group of menu items, above its text, a row at 8px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaMenu:panel:mt-1.5', 'the panel of a menu that JS does not anchor, at 6px under its trigger: it sizes the offset that detaches the panel from its trigger, not the room around content, so it is this slot\'s own length'],
  ['ArenaMenu:panel:p-1.5', 'the panel of a menu, around its items, at 6px on every side, where pad-floating-x answers 24px and pad-floating-y 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaOnboarding:body:mt-2', 'the body of a coachmark, under its title: 8px of separation inside the component, which no role answers'],
  ['ArenaOnboarding:dots:gap-1.5', 'the step dots of a coachmark, between one dot and the next: 6px of gap inside the component, which no role answers'],
  ['ArenaOnboarding:eyebrow:mb-2', 'the eyebrow above a coachmark\'s title: 8px of separation inside the component, which no role answers'],
  ['ArenaOnboarding:foot:gap-1.5', 'the foot of a coachmark, between its dots and its buttons: 6px of gap inside the component, which no role answers'],
  ['ArenaOnboarding:foot:mt-4.5', 'the foot of a coachmark, under its body: 18px of separation inside the component, which no role answers'],
  ['ArenaOnboarding:next:px-4', 'the next button of a coachmark, at small control height, at 16px on its sides, where pad-control-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaOnboarding:panel:rounded-surface', 'a coachmark, whose corner is rounded-surface rather than the floating tier'],
  ['ArenaPageHead:root:gap-4', 'a page head, between its titles and its actions: 16px of gap inside the component, which no role answers'],
  ['ArenaPageHead:subtitle:mt-0.5', 'the subtitle under a page title: 2px of separation inside the component, which no role answers'],
  ['ArenaPagination:ellipsis:px-1', 'the ellipsis standing for skipped page numbers, on its sides: 4px of padding inside the component, which no role answers'],
  ['ArenaPagination:nav:px-2', 'the previous or next button of a pagination, at 8px on its sides, where pad-control-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaPagination:page:px-2', 'a page number button of a pagination, at 8px on its sides, where pad-control-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaPagination:root:gap-1.5', 'a pagination, between one button and the next: 6px of gap inside the component, which no role answers'],
  ['ArenaProgressBar:head:mb-2', 'the head of a progress bar, its label and value above the track: 8px of separation inside the component, which no role answers'],
  ['ArenaRadio:root:gap-2.5', 'a radio, between its ring and its text: 10px of gap inside the component, which no role answers'],
  ['ArenaRadio:text:gap-0.5', 'the text of a radio, between its label and its hint: 2px of gap inside the component, which no role answers'],
  ['ArenaScroller:root:pb-3', 'a horizontal scroller, at 12px under its items: it sizes the clearance of the scrollbar that runs there, not the room around content, so it is this slot\'s own length'],
  ['ArenaSection:description:mt-0.5', 'the description under a section title: 2px of separation inside the component, which no role answers'],
  ['ArenaSection:eyebrow:mb-1.5', 'the eyebrow above a section title: 6px of separation inside the component, which no role answers'],
  ['ArenaSegmentedControl:track:gap-0.5', 'the track of a segmented control, at 2px between one segment and the next: it sizes the seam between segments, not the room around content, so it is this slot\'s own length'],
  ['ArenaSegmentedControl:track:p-1', 'the track of a segmented control, at 4px on every side: it sizes the inset of its segments within the track, not the room around content, so it is this slot\'s own length'],
  ['ArenaSelect:field:pl-3', 'the field of a select, at 12px before its value: it sizes the value inset, not the room around content, so it is this slot\'s own length'],
  ['ArenaSelect:field:pl-9', 'the field of a select with a leading icon, at 36px before its value: it sizes the clearance of that icon, not the room around content, so it is this slot\'s own length'],
  ['ArenaSelect:field:pr-9', 'the field of a select, at 36px after its value: it sizes the clearance of its caret, not the room around content, so it is this slot\'s own length'],
  ['ArenaSelect:root:gap-1.5', 'a select, between its label, its field and its hint: 6px of gap inside the component, which no role answers'],
  ['ArenaSideNav:region:gap-1', 'the collapsible region under a side nav trigger, between one item and the next: 4px of gap inside the component, which no role answers'],
  ['ArenaSideNav:root:gap-1', 'a side nav, between one item or section and the next: 4px of gap inside the component, which no role answers'],
  ['ArenaSideNav:section:gap-1', 'a section of a side nav, between its label and its items and between one item and the next: 4px of gap inside the component, which no role answers'],
  ['ArenaSideNav:sectionLabel:py-[calc(var(--sp-1)*1.5*var(--dz-row-scale-y))]', 'the label over a section of a side nav, above and below, a row at 6px before density scales it, where pad-row-y answers 10px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaSideNav:separator:my-1', 'the rule between sections of a side nav: 4px above and below of separation inside the component, which no role answers'],
  ['ArenaSkeleton:stack:gap-2.5', 'a skeleton of text lines, between one line and the next: 10px of gap inside the component, which no role answers'],
  ['ArenaStatCard:delta:gap-1', 'the change a stat card reports under its value, between its arrow and its figure, at 4px, where gap-marker answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaStatCard:delta:px-2', 'the change a stat card reports under its value, at 8px on its sides, where pad-marker-x answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaStatCard:delta:py-0.5', 'the change a stat card reports under its value, at 2px above and below, where pad-marker-y answers 4px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaStatCard:root:gap-2', 'a stat card, between its head, its value, its change and its sub line, at 8px, where gap-items answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaSwitch:label:gap-1.5', 'the label of a switch, between its text and its guard glyph: 6px of gap inside the component, which no role answers'],
  ['ArenaSwitch:root:gap-2.5', 'a switch, between its track and its label: 10px of gap inside the component, which no role answers'],
  ['ArenaSwitch:track:p-0.5', 'the track of a switch, at 2px on every side: it sizes the inset the knob travels within, not the room around content, so it is this slot\'s own length'],
  ['ArenaTable:card:p-row-px', 'a row of a table set as a card on a narrow screen, which takes the row role p-row-px, answering 16px, because the card is the same row the wide table draws as cells, so it keeps the cell\'s padding and moves with the table\'s density'],
  ['ArenaTable:cardBlock:gap-2', 'a cell a table card sets as a block across its width, between one item and the next: 8px of gap inside the component, which no role answers'],
  ['ArenaTable:cardBlock:pt-2', 'a cell a table card sets as a block across its width, under its rule: 8px of padding inside the component, which no role answers'],
  ['ArenaTable:empty:px-4', 'the cell a table shows when it has no rows, at 16px on its sides, where pad-surface answers 20px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTable:empty:py-8', 'the cell a table shows when it has no rows, at 32px above and below, where pad-surface answers 20px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTable:root:gap-4', 'a table set as cards on a narrow screen, between one card and the next, at 16px, where gap-items answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTable:sortCaret:ms-1.5', 'the sort caret after a column header\'s text: 6px of separation inside the component, which no role answers'],
  ['ArenaTabs:panel:pt-[calc(var(--sp-1)*5.5)]', 'the panel under a row of tabs, above its content: 22px of padding inside the component, which no role answers'],
  ['ArenaTabs:root:gap-1', 'a row of tabs, between one tab and the next: 4px of gap inside the component, which no role answers'],
  ['ArenaTabs:tab:px-[calc(var(--sp-1)*4*var(--dz-row-scale-x))]', 'a tab, on its sides, a row at 16px before density scales it, where pad-row-x answers 12px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTag:root:px-2', 'a tag, at 8px on its sides, where pad-marker-x answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTag:root:py-0.5', 'a tag, at 2px above and below, where pad-marker-y answers 4px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTextarea:required:ml-1', 'the required mark after a textarea\'s label: 4px of separation inside the component, which no role answers'],
  ['ArenaTextarea:root:gap-1.5', 'a textarea, between its label, its field and its foot: 6px of gap inside the component, which no role answers'],
  ['ArenaToast:action:mt-2.5', 'the word a reader presses to answer a toast, under its message: 10px of separation inside the component, which no role answers'],
  ['ArenaToast:message:mt-0.5', 'the message of a toast, under its title: 2px of separation inside the component, which no role answers'],
  ['ArenaToast:pinned:px-1', 'the pinned marker beside a toast\'s title, at 4px on its sides, where pad-marker-x answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaToast:title:gap-control', 'the title of a toast, which takes the control role gap-control, answering 8px, because it sets its text beside the pinned marker the way a control sets its label beside its glyph, as one thing rather than several'],
  ['ArenaTooltip:bubble:px-2.5', 'a tooltip bubble, a short line of small mono text, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTooltip:bubble:py-1.5', 'a tooltip bubble, a short line of small mono text, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaTooltip:bubble:rounded-control', 'a tooltip bubble, a short line of small mono text, whose corner is rounded-control rather than the floating tier'],
  ['ArenaUnauthCard:body:p-4', 'the body of the signed-out card, at 16px on every side, where pad-surface answers 20px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaUnauthCard:brand:mb-7', 'the brand at the top of the signed-out card, above its eyebrow: 28px of separation inside the component, which no role answers'],
  ['ArenaUnauthCard:eyebrow:mb-1.5', 'the eyebrow above the signed-out card\'s title: 6px of separation inside the component, which no role answers'],
  ['ArenaUnauthCard:footer:mt-5', 'the footer line under the signed-out card\'s content: 20px of separation inside the component, which no role answers'],
  ['ArenaUnauthCard:title:mb-6', 'the title of the signed-out card, above its content: 24px of separation inside the component, which no role answers'],
  ['ArenaBarChart:legend:gap-4', 'the legend strip of a chart, between one legend item and the next, at 16px, where no gap role answers a strip of markers: the length is this slot\'s own and the role does not move it'],
  ['ArenaBarChart:legendSwatch:rounded-marker', 'the colour square of a chart legend item, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its item\'s row'],
  ['ArenaBarChart:tooltip:px-2.5', 'a chart tooltip, a short readout of a label and a value, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBarChart:tooltip:py-1.5', 'a chart tooltip, a short readout of a label and a value, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaBarChart:tooltip:rounded-control', 'a chart tooltip, a short readout of a label and a value, whose corner is rounded-control rather than the floating tier'],
  ['ArenaBarChart:tooltipValue:font-mono', 'a chart tooltip\'s value, a figure the chart read off the plot, set in mono outright'],
  ['ArenaHorizontalBarChart:legend:gap-4', 'the legend strip of a chart, between one legend item and the next, at 16px, where no gap role answers a strip of markers: the length is this slot\'s own and the role does not move it'],
  ['ArenaHorizontalBarChart:legendSwatch:rounded-marker', 'the colour square of a chart legend item, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its item\'s row'],
  ['ArenaHorizontalBarChart:tooltip:px-2.5', 'a chart tooltip, a short readout of a label and a value, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaHorizontalBarChart:tooltip:py-1.5', 'a chart tooltip, a short readout of a label and a value, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaHorizontalBarChart:tooltip:rounded-control', 'a chart tooltip, a short readout of a label and a value, whose corner is rounded-control rather than the floating tier'],
  ['ArenaHorizontalBarChart:tooltipValue:font-mono', 'a chart tooltip\'s value, a figure the chart read off the plot, set in mono outright'],
  ['ArenaLineChart:legend:gap-4', 'the legend strip of a chart, between one legend item and the next, at 16px, where no gap role answers a strip of markers: the length is this slot\'s own and the role does not move it'],
  ['ArenaLineChart:legendSwatch:rounded-marker', 'the colour square of a chart legend item, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its item\'s row'],
  ['ArenaLineChart:tooltip:px-2.5', 'a chart tooltip, a short readout of a label and a value, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaLineChart:tooltip:py-1.5', 'a chart tooltip, a short readout of a label and a value, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaLineChart:tooltip:rounded-control', 'a chart tooltip, a short readout of a label and a value, whose corner is rounded-control rather than the floating tier'],
  ['ArenaLineChart:tooltipValue:font-mono', 'a chart tooltip\'s value, a figure the chart read off the plot, set in mono outright'],
  ['ArenaPyramidChart:legend:gap-4', 'the legend strip of a chart, between one legend item and the next, at 16px, where no gap role answers a strip of markers: the length is this slot\'s own and the role does not move it'],
  ['ArenaPyramidChart:legendSwatch:rounded-marker', 'the colour square of a chart legend item, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its item\'s row'],
  ['ArenaPyramidChart:tooltip:px-2.5', 'a chart tooltip, a short readout of a label and a value, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaPyramidChart:tooltip:py-1.5', 'a chart tooltip, a short readout of a label and a value, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaPyramidChart:tooltip:rounded-control', 'a chart tooltip, a short readout of a label and a value, whose corner is rounded-control rather than the floating tier'],
  ['ArenaPyramidChart:tooltipValue:font-mono', 'a chart tooltip\'s value, a figure the chart read off the plot, set in mono outright'],
  ['ArenaRadarChart:legend:gap-4', 'the legend strip of a chart, between one legend item and the next, at 16px, where no gap role answers a strip of markers: the length is this slot\'s own and the role does not move it'],
  ['ArenaRadarChart:legendSwatch:rounded-marker', 'the colour square of a chart legend item, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its item\'s row'],
  ['ArenaRadarChart:tooltip:px-2.5', 'a chart tooltip, a short readout of a label and a value, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaRadarChart:tooltip:py-1.5', 'a chart tooltip, a short readout of a label and a value, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaRadarChart:tooltip:rounded-control', 'a chart tooltip, a short readout of a label and a value, whose corner is rounded-control rather than the floating tier'],
  ['ArenaRadarChart:tooltipValue:font-mono', 'a chart tooltip\'s value, a figure the chart read off the plot, set in mono outright'],
  ['ArenaScatterChart:legend:gap-4', 'the legend strip of a chart, between one legend item and the next, at 16px, where no gap role answers a strip of markers: the length is this slot\'s own and the role does not move it'],
  ['ArenaScatterChart:legendSwatch:rounded-marker', 'the colour square of a chart legend item, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its item\'s row'],
  ['ArenaScatterChart:tooltip:px-2.5', 'a chart tooltip, a short readout of a label and a value, at 10px on its sides, where pad-floating-x answers 24px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaScatterChart:tooltip:py-1.5', 'a chart tooltip, a short readout of a label and a value, at 6px above and below, where pad-floating-y answers 16px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaScatterChart:tooltip:rounded-control', 'a chart tooltip, a short readout of a label and a value, whose corner is rounded-control rather than the floating tier'],
  ['ArenaScatterChart:tooltipValue:font-mono', 'a chart tooltip\'s value, a figure the chart read off the plot, set in mono outright'],
  ['ArenaDoughnutChart:legend:gap-1.5', 'the legend column of a doughnut chart, between one row and the next, at 6px, which no role answers'],
  ['ArenaDoughnutChart:legendRow:gap-2', 'a doughnut legend row, between its swatch and its text, at 8px, where gap-marker answers 6px: air this slot spends at its own size, which no kind role asks, so a plugin cannot move it'],
  ['ArenaDoughnutChart:legendSwatch:rounded-marker', 'the colour square of a doughnut legend row, whose corner is rounded-marker because the square is a marker, though the slot itself is a part of its row'],
  ['ArenaDoughnutChart:legendText:gap-2', 'the text of a doughnut legend row, between its label and its figure, at 8px, which no role answers'],
  ['ArenaDoughnutChart:legendValue:font-mono', 'a doughnut legend row\'s figure, a value the chart read off the plot, set in mono outright'],
]);

export function scaleUseKey(component: string, slot: string, utility: string) {
  return `${component}:${slot}:${utility}`;
}

function literal(utility: string) {
  return utility.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scaleUsesIn(classString: string) {
  return [...SCALE_UTILITIES.keys()]
    .filter((utility) => new RegExp(`(?<![\\w-])${literal(utility)}(?![\\w-])`).test(classString));
}

export type Why = 'scale' | 'step' | 'kind' | 'missing-kind';
export type Finding = { component: string; slot: string; utility: string; role: string | undefined; kind: SlotKind; why: Why };

const PAD = '(?:p|px|py|pt|pb|pl|pr|ps|pe)';
const SPACE = '(?:p|px|py|pt|pb|pl|pr|ps|pe|gap|gap-x|gap-y|m|mx|my|mt|mb|ml|mr|ms|me)';
const STEP = new RegExp(`^-?${SPACE}-(\\d+(?:\\.\\d+)?)$`);
const PAD_ROLE = new RegExp(`^${PAD}-([a-z]+(?:-[a-z]+)*)$`);
const PAD_ARBITRARY = new RegExp(`^${PAD}-\\[(.*)\\]$`);
let derived: { pad: Set<string>; gap: Set<string> } | undefined;

function derivedSets() {
  if (derived) return derived;
  const names = Object.keys(readJson(join(repoRoot, 'contracts/design/roles.json')) as Record<string, unknown>);
  derived = {
    gap: new Set([...names.filter((n) => n.startsWith('gap-')), ...KINDS.flatMap((k) => KIND_AIR[k].gap)]),
    pad: new Set([...names.filter((n) => n.startsWith('pad-')).map((n) => n.slice(4)), ...KINDS.flatMap((k) => KIND_AIR[k].pad)]),
  };
  return derived;
}

export const padStems = () => derivedSets().pad;
export const gapRoles = () => derivedSets().gap;
const RADIUS_ROLES = new Set(KINDS.flatMap((k) => KIND_AIR[k].radius));
const STATE_PREFIX = /^(?:[^\s:[\]]+:|\[[^\]]*\]:)+/;

function utilitiesIn(classString: string) {
  return classString.split(/\s+/).filter(Boolean).map((token) => token.replace(STATE_PREFIX, ''));
}

function stepProblem(utility: string) {
  const numeric = STEP.exec(utility);
  if (numeric) return Number(numeric[1]) !== 0;
  const arbitrary = PAD_ARBITRARY.exec(utility);
  return Boolean(arbitrary && arbitrary[1]!.includes('--sp-'));
}

function kindProblem(utility: string, kind: SlotKind) {
  if (KIND_FREE.has(utility)) return false;
  const air = KIND_AIR[kind];
  const role = PAD_ROLE.exec(utility);
  if (role && padStems().has(role[1]!)) return !air.pad.includes(role[1]!);
  const arbitrary = PAD_ARBITRARY.exec(utility);
  const operand = arbitrary && /var\(--pad-([a-z]+(?:-[a-z]+)*)\)/.exec(arbitrary[1]!);
  if (operand && padStems().has(operand[1]!)) return true;
  if (gapRoles().has(utility.replace(/^gap-[xy]-/, 'gap-'))) return !air.gap.includes(utility.replace(/^gap-[xy]-/, 'gap-'));
  const radius = utility.replace(/^rounded-(?:tl|tr|bl|br|ss|se|es|ee|[trblse])-/, 'rounded-');
  if (RADIUS_ROLES.has(radius)) return !air.radius.includes(radius);
  return false;
}

function stepRole(utility: string) {
  return /^-?(?:gap|m)/.test(utility) ? 'a gap or margin role, or a rhythm key' : 'a padding role of the slot\'s kind';
}

export function evaluateManifest(manifest: ComponentManifest, allowed = SCALE_USES): Finding[] {
  const findings: Finding[] = [];
  for (const problem of kindProblems(manifest)) {
    const slot = /^[^:]+:(\S+) /.exec(problem)?.[1] ?? '';
    findings.push({ component: manifest.component, slot, utility: '', role: problem, kind: 'none', why: 'missing-kind' });
  }
  for (const [slot, classList] of classStringsBySlot(manifest) as Map<string, string[]>) {
    const declared = manifest.kind?.[slot] as string | undefined;
    const kind = declared && (KINDS as readonly string[]).includes(declared) ? declared as SlotKind : undefined;
    const reported = new Set<string>();
    const report = (utility: string, role: string | undefined, why: Why) => {
      if (reported.has(utility)) return;
      reported.add(utility);
      if (allowed.has(scaleUseKey(manifest.component, slot, utility))) return;
      findings.push({ component: manifest.component, slot, utility, role, kind: kind ?? 'none', why });
    };
    for (const utility of new Set(classList.flatMap(scaleUsesIn))) report(utility, SCALE_UTILITIES.get(utility), 'scale');
    for (const utility of new Set(classList.flatMap(utilitiesIn))) {
      if (KIND_FREE.has(utility)) continue;
      if (stepProblem(utility)) report(utility, stepRole(utility), 'step');
      else if (kind && kindProblem(utility, kind)) report(utility, `a role of the ${kind} kind`, 'kind');
    }
  }
  return findings;
}

export function seenKeys(manifest: ComponentManifest) {
  const keys = new Set<string>();
  for (const f of evaluateManifest(manifest, new Map()))
    if (f.why !== 'missing-kind') keys.add(scaleUseKey(f.component, f.slot, f.utility));
  return keys;
}

export function staleAllowances(seen: Set<string>, allowed = SCALE_USES) {
  return [...allowed.keys()]
    .filter((key) => !seen.has(key))
    .map((key) => `${key} is excused in SCALE_USES but no manifest carries it -- drop the entry`);
}

export function derivedSetsProblem(pad: ReadonlySet<string> = padStems(), gap: ReadonlySet<string> = gapRoles()) {
  return pad.size === 0 || gap.size === 0
    ? 'derived 0 pad stems or 0 gap roles from contracts/design/roles.json -- an empty set judges nothing; check the contract path'
    : null;
}

export function zeroManifestProblem(files: string[]) {
  return files.length === 0
    ? 'found 0 manifests -- an empty result set is a failure, not a clean pass; check the discovery path'
    : null;
}

export function collect(files = manifestFiles(COMPONENTS_DIR)) {
  const findings = [];
  const seen = new Set<string>();
  for (const p of files) {
    const manifest = readJson(p);
    findings.push(...evaluateManifest(manifest));
    for (const key of seenKeys(manifest)) seen.add(key);
  }
  return { findings, stale: staleAllowances(seen) };
}

function main() {
  const files = manifestFiles(COMPONENTS_DIR);
  const derived = derivedSetsProblem();
  if (derived) {
    console.error(`check-role-tokens: ${derived}`);
    process.exit(1);
  }
  const zero = zeroManifestProblem(files);
  if (zero) {
    console.error(`check-role-tokens: ${zero}`);
    process.exit(1);
  }
  const { findings, stale } = collect(files);
  if (findings.length || stale.length) {
    console.error(`check-role-tokens: ${findings.length} finding(s) in a role position, ${stale.length} stale allowance(s)\n`);
    for (const f of findings) {
      if (f.why === 'missing-kind') console.error(`  ${f.role} -- every slot declares a kind (${f.why})`);
      else console.error(`  ${f.component}:${f.slot} (${f.kind}) carries ${f.utility} where a role belongs (${f.why}) -- use ${f.role}, or record the case in SCALE_USES with the reason it means the length`);
    }
    for (const s of stale) console.error(`  ${s}`);
    process.exit(1);
  }
  console.log(`check-role-tokens: ${files.length} manifest(s) -- every slot declares a kind, every padding, gap, margin and radius names its kind's role or a recorded use, and every border, depth, duration, easing, ink, edge, face and case decision names a role, ${SCALE_USES.size} recorded scale use(s)`);
}

if (isMainModule(import.meta.url)) main();
