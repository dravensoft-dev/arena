import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { linesToList, listToLines, optionFor } from './PlaygroundCodec.generated';
import type { Knob, KnobField, KnobModel } from './PlaygroundCodec.generated';
import { PlaygroundStore } from './PlaygroundState';

@Component({
  selector: 'demo-playground',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pg-head">
      <p class="pg-eyebrow">Arena playground</p>
      <h1 class="pg-title">{{ model().component }}</h1>
      <p class="pg-note">{{ model().note || model().description }}</p>
    </header>

    <div class="pg-shell">
      <div class="pg-stage"><ng-content /></div>
      <aside class="pg-panel">
        <div class="pg-log-head">
          <span class="pg-panel-title">{{ model().knobs.length }} members</span>
          <button class="pg-reset" type="button" (click)="play().reset()">Reset</button>
        </div>

        @for (knob of model().knobs; track knob.member) {
          <div [class]="knob.bind === 'pinned' ? 'pg-knob pg-knob-pinned' : 'pg-knob'">
            <div class="pg-knob-head">
              <label class="pg-knob-name" [attr.for]="'knob-' + knob.member">{{ knob.member }}</label>
              <span class="pg-knob-form">{{ knob.type ? knob.form + ' ' + knob.type : knob.form }}</span>
            </div>

            @if (knob.bind !== 'pinned') {
              <label class="pg-presence">
                <input type="checkbox" [checked]="bound(knob)"
                  (change)="play().setBound(knob.member, checked($event))" />
                {{ bound(knob) ? 'bound' : 'unbound' }}
              </label>
            }

            @switch (knob.control) {
              @case ('slotPresence') {}
              @case ('check') {
                <input [id]="'knob-' + knob.member" type="checkbox" [disabled]="!bound(knob)"
                  [checked]="!!held(knob)" (change)="play().setValue(knob.member, checked($event))" />
              }
              @case ('select') {
                <select [id]="'knob-' + knob.member" class="pg-field" [disabled]="!bound(knob)"
                  (change)="pick(knob, value($event))">
                  @for (option of knob.options ?? []; track option) {
                    <option [value]="option" [selected]="text(held(knob)) === text(option)">{{ option }}</option>
                  }
                </select>
              }
              @case ('number') {
                <input [id]="'knob-' + knob.member" class="pg-field" type="number" [disabled]="!bound(knob)"
                  [value]="text(held(knob))" (input)="play().setValue(knob.member, +value($event))" />
              }
              @case ('lines') {
                <textarea [id]="'knob-' + knob.member" class="pg-field" [disabled]="!bound(knob)"
                  [value]="lines(held(knob))"
                  (input)="play().setValue(knob.member, linesToList(value($event), knob.itemForm))"></textarea>
              }
              @case ('json') {
                <textarea [id]="'knob-' + knob.member" class="pg-field" [disabled]="!bound(knob)"
                  [value]="json(held(knob))" (input)="writeJson(knob, value($event))"></textarea>
              }
              @case ('fields') {
                <div class="pg-knob">
                  @for (field of knob.fields ?? []; track field.name) {
                    <label class="pg-check">
                      <span class="pg-knob-form">{{ field.name }}</span>
                      @if (field.options) {
                        <select class="pg-field"
                          (change)="writeField(knob, field, optionFor(field.options, value($event)))">
                          @for (option of field.options; track option) {
                            <option [value]="option"
                              [selected]="text(fieldOf(knob, field)) === text(option)">{{ option }}</option>
                          }
                        </select>
                      } @else if (field.type === 'boolean') {
                        <input type="checkbox" [checked]="!!fieldOf(knob, field)"
                          (change)="writeField(knob, field, checked($event))" />
                      } @else if (field.type === 'number') {
                        <input class="pg-field" type="number" [value]="text(fieldOf(knob, field))"
                          (input)="writeField(knob, field, +value($event))" />
                      } @else {
                        <input class="pg-field" type="text" [value]="text(fieldOf(knob, field))"
                          (input)="writeField(knob, field, value($event))" />
                      }
                    </label>
                  }
                </div>
              }
              @default {
                <input [id]="'knob-' + knob.member" class="pg-field" type="text" [disabled]="!bound(knob)"
                  [value]="text(held(knob))" (input)="play().setValue(knob.member, value($event))" />
              }
            }

            <p class="pg-knob-doc">{{ knob.doc }}</p>
          </div>
        }
      </aside>
    </div>

    <div class="pg-log">
      <div class="pg-log-head">
        <span class="pg-panel-title">Events</span>
        <span class="pg-knob-form">{{ model().events.length }} declared</span>
      </div>
      <ul class="pg-log-list">
        @if (play().entries().length === 0) {
          <li class="pg-log-empty">Nothing raised yet.</li>
        } @else {
          @for (entry of play().entries(); track entry.id) {
            <li class="pg-log-row">
              <span class="pg-log-name">{{ entry.name }}</span>{{ entry.payload ? ' ' + entry.payload : '' }}
            </li>
          }
        }
      </ul>
    </div>
  `,
})
export class Playground {
  readonly play = input.required<PlaygroundStore>();

  protected readonly linesToList = linesToList;
  protected readonly optionFor = optionFor;

  protected model(): KnobModel {
    return this.play().model;
  }

  protected held(knob: Knob): unknown {
    return this.play().state().held[knob.member];
  }

  protected bound(knob: Knob): boolean {
    return Boolean(this.play().state().bound[knob.member]);
  }

  protected fieldOf(knob: Knob, field: KnobField): unknown {
    return (this.held(knob) as Record<string, unknown> | undefined)?.[field.name];
  }

  protected text(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
  }

  protected lines(value: unknown): string {
    return listToLines(value);
  }

  protected json(value: unknown): string {
    return JSON.stringify(value ?? null, null, 2);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected pick(knob: Knob, raw: string): void {
    this.play().setValue(knob.member, optionFor(knob.options, raw));
  }

  protected writeField(knob: Knob, field: KnobField, value: unknown): void {
    const held = (this.held(knob) ?? {}) as Record<string, unknown>;
    this.play().setValue(knob.member, { ...held, [field.name]: value });
  }

  protected writeJson(knob: Knob, raw: string): void {
    try {
      this.play().setValue(knob.member, JSON.parse(raw));
    } catch {
      return;
    }
  }
}
