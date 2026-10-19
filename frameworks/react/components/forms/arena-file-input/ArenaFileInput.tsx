import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaFileInput.classes.generated.ts';

import type { ArenaFileRejection, ArenaFileSelection } from '../../../Api.generated';
import type { ArenaFileInputClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { ArenaTag } from '../../display/arena-tag/ArenaTag.tsx';
import {
  arenaFileAnnouncement, arenaFileInputIds, arenaFileRejection, arenaFileSelection, arenaFileSize,
  arenaMergeFiles, arenaRejectionLines, arenaWriteInputFiles,
} from './FileRules.ts';

export interface ArenaFileInputProps {
  className?: ArenaFileInputClass;

  /** Names what is being attached, such as "Passport scan". The text labels the field and, followed by the trigger's own text, names the trigger, so a screen reader hears "Passport scan, Choose file". Required, and guarded at runtime: a blank one throws, because nothing can derive what a file is for. */
  label: string;

  /** The trigger's id, and what the label's `for` points at. Generated from `label` when omitted, as `fi-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose. Identical markup must get the same id in every layer, and two controls sharing a label must not collide. The label and the trigger's text take this id followed by `-label` and `-text`. The hint or the error takes it followed by `-note`, and the required word takes `-required`. */
  id?: string;

  /** A line of help under the field, and the trigger's description. An error replaces it while one shows. */
  hint?: string;

  /** Controlled error message, such as a count rule or a refusal from the server. Wins over the hint and turns the zone's edge to the danger hue. The message describes the trigger, and a changed message is announced once. */
  error?: string;

  /** Marks the label and makes the hidden file input required. A native submission then refuses an empty selection, the browser's message is anchored at the trigger and focus returns to the trigger. The trigger's name then carries the required word, as in "Passport scan, required, Choose file". */
  required?: boolean;

  /** Blocks the trigger, the drop zone and every chip's remove, and dims the field. */
  disabled?: boolean;

  /** The name the files are submitted under. The hidden file input carries it and always holds exactly the files shown, so a native submission and `new FormData(form)` carry the real files. */
  name?: string;

  /** The native `accept` syntax, such as `.pdf,image/*`: extensions, exact types and wildcard types. The syntax narrows the picker and is enforced on every pick and every drop, because a drop is not filtered by the browser. */
  accept?: string;

  /** Whether more than one file may be held. With it a pick or a drop appends, and a file already held, the same name, size and modified time, is held once. Without it a pick replaces the selection, and every accepted file after the first in one drop is refused as surplus. */
  multiple?: boolean;

  /** The largest file held, in bytes; a file of exactly this size is held. A bigger one is refused and never held. */
  maxSize?: number;

  /** Whether the field is a drop zone with a dashed frame. Without it the field cancels no drag and a file dropped on it is the browser's. The trigger is the keyboard route either way. */
  droppable?: boolean;

  /** The selection changed through a pick, a drop or a chip's remove; carries the whole selection as metadata, in held order. A clear the host asks for, and a form reset, fire nothing. */
  onChange?: (selection: ArenaFileSelection) => void;

  /** Files in the last pick or drop were refused; carries their names by reason. Never fires empty. */
  onReject?: (rejection: ArenaFileRejection) => void;
}

const arenaFileInputStyles = arenaStyles(manifest);

export interface ArenaFileInputHandle {
  files(): File[];
  clear(): void;
}

interface Shown {
  files: File[];
  rejection: ArenaFileRejection | null;
}

const NOTHING: Shown = { files: [], rejection: null };

const carriesFiles = (event: React.DragEvent) => Boolean(event.dataTransfer?.types?.includes('Files'));

export const ArenaFileInput = forwardRef<ArenaFileInputHandle, ArenaFileInputProps>(function ArenaFileInput({
  className, label, id, hint, error, required = false, disabled = false, name, accept, multiple = false,
  maxSize, droppable = false, onChange, onReject,
}: ArenaFileInputProps, handle) {
  if (!label?.trim()) throw new Error('ArenaFileInput: `label` is required, and names what is being attached');
  const locale = useArenaLocale();
  const control = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const held = useRef<File[]>([]);
  const [shown, setShown] = useState<Shown>(NOTHING);
  const [dragging, setDragging] = useState(false);
  const [said, setSaid] = useState<{ error: string | undefined; text: string }>({ error, text: '' });
  if (said.error !== error) setSaid({ error, text: error ?? '' });

  const hold = (files: File[], rejection: ArenaFileRejection | null) => {
    held.current = files;
    if (control.current) arenaWriteInputFiles(control.current, files);
    setShown({ files, rejection });
    setSaid((was) => ({ ...was, text: '' }));
  };

  useImperativeHandle(handle, () => ({
    files: () => [...held.current],
    clear: () => hold([], null),
  }), []);

  useEffect(() => {
    const form = control.current?.form;
    if (!form) return undefined;
    const reset = () => hold([], null);
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, []);

  const take = (incoming: File[]) => {
    if (incoming.length === 0) {
      if (control.current) arenaWriteInputFiles(control.current, held.current);
      return;
    }
    const merge = arenaMergeFiles(held.current, incoming, { accept, maxSize, multiple });
    const rejection = arenaFileRejection(merge);
    hold(merge.held, rejection);
    if (merge.changed) onChange?.(arenaFileSelection(merge.held));
    if (rejection) onReject?.(rejection);
  };

  const remove = (index: number) => {
    const files = held.current.filter((_, at) => at !== index);
    hold(files, shown.rejection);
    trigger.current?.focus();
    onChange?.(arenaFileSelection(files));
  };

  const zoneEvents = droppable ? {
    onDragEnter: (event: React.DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (disabled && event.dataTransfer) event.dataTransfer.dropEffect = 'none';
    },
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (event: React.DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setDragging(false);
      if (!disabled) take(Array.from(event.dataTransfer?.files ?? []));
    },
  } : {};

  const ids = arenaFileInputIds(id, label);
  const noteId = `${ids.trigger}-note`;
  const requiredId = `${ids.trigger}-required`;
  const lines = arenaRejectionLines(locale, shown.rejection, maxSize);
  const announcement = [arenaFileAnnouncement(locale, shown.files.length, lines), said.text].filter(Boolean).join(' ');
  const styles = arenaFileInputStyles({ droppable, dragging, state: error ? 'error' : 'neutral', disabled });

  return (
    <div className={arenaClassName('ArenaFileInput', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <label id={ids.label} htmlFor={ids.trigger} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>
        {label}{required && <span className={styles.required()} data-arena-part={manifest.parts.required} {...styles.$data.required()} aria-hidden="true">*</span>}
      </label>
      {required && <span id={requiredId} className={styles.requiredLabel()} data-arena-part={manifest.parts.requiredLabel} {...styles.$data.requiredLabel()}>{locale.fileInputRequired}</span>}
      <div className={styles.zone()} data-arena-part={manifest.parts.zone} {...styles.$data.zone()} {...zoneEvents}>
        <button ref={trigger} type="button" id={ids.trigger} aria-labelledby={required ? `${ids.label} ${requiredId} ${ids.text}` : `${ids.label} ${ids.text}`}
          aria-describedby={error || hint ? noteId : undefined} disabled={disabled}
          className={styles.trigger()} data-arena-part={manifest.parts.trigger} {...styles.$data.trigger()}
          onClick={() => control.current?.click()}>
          <i className={`ph-bold ph-upload-simple ${styles.icon()}`} data-arena-part={manifest.parts.icon} {...styles.$data.icon()} aria-hidden="true" />
          <span id={ids.text}>{multiple ? locale.fileInputChooseMultiple : locale.fileInputChoose}</span>
        </button>
        {droppable && <span className={styles.prompt()} data-arena-part={manifest.parts.prompt} {...styles.$data.prompt()}>{locale.fileInputDrop}</span>}
        <input ref={control} type="file" tabIndex={-1} aria-hidden="true" name={name} accept={accept} multiple={multiple}
          required={required} disabled={disabled} className={styles.input()} data-arena-part={manifest.parts.input} {...styles.$data.input()}
          onChange={(event) => take(Array.from(event.currentTarget.files ?? []))}
          onInvalid={() => trigger.current?.focus()} onFocus={() => trigger.current?.focus()} />
      </div>
      {shown.files.length > 0 && (
        <ul role="list" className={styles.files()} data-arena-part={manifest.parts.files} {...styles.$data.files()}>
          {shown.files.map((file, index) => (
            <li key={`${file.name}:${file.size}:${file.lastModified}`} className={styles.file()} data-arena-part={manifest.parts.file} {...styles.$data.file()}>
              <ArenaTag removable disabled={disabled} onRemove={() => remove(index)}>{file.name}</ArenaTag>
              <span className={styles.size()} data-arena-part={manifest.parts.size} {...styles.$data.size()}>{arenaFileSize(file.size, locale.locale)}</span>
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <ul role="list" className={styles.rejected()} data-arena-part={manifest.parts.rejected} {...styles.$data.rejected()}>
          {lines.map((line, index) => <li key={index} className={styles.rejection()} data-arena-part={manifest.parts.rejection} {...styles.$data.rejection()}>{line}</li>)}
        </ul>
      )}
      <span role="status" className={styles.status()} data-arena-part={manifest.parts.status} {...styles.$data.status()}>{announcement}</span>
      {error ? <span id={noteId} className={styles.error()} data-arena-part={manifest.parts.error} {...styles.$data.error()}>{error}</span>
        : hint && <span id={noteId} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
    </div>
  );
});
