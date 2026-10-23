import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, inject, input, viewChild,
} from '@angular/core';
import { arenaFieldsetStyles } from './ArenaFieldset.variants';
import manifest from './ArenaFieldset.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

@Component({
  selector: 'arena-fieldset',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents', '[attr.disabled]': 'null' },
  template: `
    <fieldset [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root"
              [disabled]="disabled()" [attr.aria-describedby]="describedBy()">
      <legend [class]="styles().legend()" [attr.data-arena-part]="parts.legend">{{ name() }}</legend>
      <div [class]="styles().stack()" [attr.data-arena-part]="parts.stack">
        <div #body [class]="styles().body()" [attr.data-arena-part]="parts.body" data-arena-boundary><ng-content /></div>
        @if (error(); as message) {
          <span [class]="styles().error()" [arenaSlotData]="styles().$data.error()" [attr.data-arena-part]="parts.error" [attr.id]="noteId"><span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-warning-circle" /></span>{{ message }}</span>
        } @else if (hint(); as text) {
          <span [class]="styles().hint()" [attr.data-arena-part]="parts.hint" [attr.id]="noteId">{{ text }}</span>
        }
      </div>
    </fieldset>
  `,
})
export class ArenaFieldset {
  protected readonly parts = manifest.parts;

  /** Names the set, on screen and to assistive technology, which announces it on entering the set. Required, and guarded at runtime after trimming: a set with no name announces only that a group began. Say what the set is ("Billing address"), not that it is a group. Plain text. */
  readonly legend = input.required<string>();
  /** A line of help for the whole set, under the fields, and part of the set's description. */
  readonly hint = input<string>();
  /** A message about the set rather than about one field ("Choose at least one"), under the fields with a warning glyph. Wins over `hint`, and is part of the set's description while it shows. */
  readonly error = input<string>();
  /** Whether the whole set is unavailable. Every native control inside it is disabled by the platform, and the set dims. A control that only reflects an unavailable state, and stays focusable, does not inherit it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly noteId = `${inject(ArenaIdGenerator).next('arena-fieldset')}-note`;
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly name = computed(() => {
    const text = this.legend();
    if (text.trim() === '') {
      throw new Error('ArenaFieldset: `legend` is required, and names the set of fields it draws');
    }
    return text;
  });

  protected readonly describedBy = computed(() => (this.error() || this.hint() ? this.noteId : null));

  protected readonly styles = computed(() => arenaFieldsetStyles({
    state: this.error() ? 'error' : 'neutral', disabled: this.disabled(),
  }));


  protected ngAfterContentInit(): void {
    if (this.projected().length === 0) {
      throw new Error('ArenaFieldset: a fieldset with no children is not a legal shape, because its legend would name nothing');
    }
  }

  private projected(): ChildNode[] {
    const element = this.body().nativeElement;
    return [...element.childNodes].filter(
      (node) => node.nodeType === node.ELEMENT_NODE
        || (node.nodeType === node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
    );
  }
}
