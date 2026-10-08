import React from 'react';
import { linesToList, listToLines, optionFor } from './PlaygroundCodec.generated.ts';
import type { Knob, KnobField, KnobModel, Option } from './PlaygroundCodec.generated.ts';
import type { Playground as PlaygroundHandle } from './PlaygroundState.ts';

export type { Knob, KnobField, KnobModel, Option, PlaygroundState, LogEntry } from './PlaygroundCodec.generated.ts';
export type { Playground as PlaygroundHandle } from './PlaygroundState.ts';

export interface PlaygroundProps {
  model: KnobModel;
  play: PlaygroundHandle;
  children?: React.ReactNode;
}

function OptionList({ options }: { options: Option[] }) {
  return (
    <React.Fragment>
      {options.map((option) => (
        <option key={String(option)} value={String(option)}>{String(option)}</option>
      ))}
    </React.Fragment>
  );
}

function FieldRow({ knob, field, play }: { knob: Knob; field: KnobField; play: PlaygroundHandle }) {
  const held = (play.state.held[knob.member] ?? {}) as Record<string, unknown>;
  const write = (value: unknown) => play.setValue(knob.member, { ...held, [field.name]: value });
  const current = held[field.name];

  return (
    <label className="pg-check">
      <span className="pg-knob-form">{field.name}</span>
      {field.options
        ? (
          <select className="pg-field" value={String(current ?? '')}
            onChange={(e) => write(optionFor(field.options, e.target.value))}>
            <OptionList options={field.options} />
          </select>
        )
        : field.form === 'primitive' && field.type === 'boolean'
          ? <input type="checkbox" checked={Boolean(current)} onChange={(e) => write(e.target.checked)} />
          : field.form === 'primitive' && field.type === 'number'
            ? <input className="pg-field" type="number" value={String(current ?? 0)}
              onChange={(e) => write(Number(e.target.value))} />
            : <input className="pg-field" type="text" value={String(current ?? '')}
              onChange={(e) => write(e.target.value)} />}
    </label>
  );
}

function Control({ knob, play }: { knob: Knob; play: PlaygroundHandle }) {
  const value = play.state.held[knob.member];
  const disabled = !play.state.bound[knob.member];
  const id = `knob-${knob.member}`;

  if (knob.control === 'slotPresence') return null;

  if (knob.control === 'check') {
    return (
      <input id={id} type="checkbox" disabled={disabled} checked={Boolean(value)}
        onChange={(e) => play.setValue(knob.member, e.target.checked)} />
    );
  }

  if (knob.control === 'select') {
    return (
      <select id={id} className="pg-field" disabled={disabled} value={String(value ?? '')}
        onChange={(e) => play.setValue(knob.member, optionFor(knob.options, e.target.value))}>
        <OptionList options={knob.options ?? []} />
      </select>
    );
  }

  if (knob.control === 'number') {
    return (
      <input id={id} className="pg-field" type="number" disabled={disabled} value={String(value ?? 0)}
        onChange={(e) => play.setValue(knob.member, Number(e.target.value))} />
    );
  }

  if (knob.control === 'lines') {
    return (
      <textarea id={id} className="pg-field" disabled={disabled} value={listToLines(value)}
        onChange={(e) => play.setValue(knob.member, linesToList(e.target.value, knob.itemForm))} />
    );
  }

  if (knob.control === 'json') {
    return <JsonControl id={id} knob={knob} play={play} disabled={disabled} />;
  }

  if (knob.control === 'fields') {
    return (
      <div className="pg-knob">
        {(knob.fields ?? []).map((field) => <FieldRow key={field.name} knob={knob} field={field} play={play} />)}
      </div>
    );
  }

  return (
    <input id={id} className="pg-field" type="text" disabled={disabled} value={String(value ?? '')}
      onChange={(e) => play.setValue(knob.member, e.target.value)} />
  );
}

function JsonControl({ id, knob, play, disabled }: { id: string; knob: Knob; play: PlaygroundHandle; disabled: boolean }) {
  const [text, setText] = React.useState(() => JSON.stringify(play.state.held[knob.member] ?? null, null, 2));
  const [broken, setBroken] = React.useState(false);

  return (
    <textarea id={id} className={broken ? 'pg-field pg-field-invalid' : 'pg-field'} disabled={disabled} value={text}
      onChange={(e) => {
        setText(e.target.value);
        try {
          play.setValue(knob.member, JSON.parse(e.target.value));
          setBroken(false);
        } catch {
          setBroken(true);
        }
      }} />
  );
}

function KnobRow({ knob, play }: { knob: Knob; play: PlaygroundHandle }) {
  const bound = play.state.bound[knob.member];
  const pinned = knob.bind === 'pinned';

  return (
    <div className={pinned ? 'pg-knob pg-knob-pinned' : 'pg-knob'}>
      <div className="pg-knob-head">
        <label className="pg-knob-name" htmlFor={`knob-${knob.member}`}>{knob.member}</label>
        <span className="pg-knob-form">{knob.type ? `${knob.form} ${knob.type}` : knob.form}</span>
      </div>
      {pinned
        ? null
        : (
          <label className="pg-presence">
            <input type="checkbox" checked={bound} onChange={(e) => play.setBound(knob.member, e.target.checked)} />
            {bound ? 'bound' : 'unbound'}
          </label>
        )}
      <Control knob={knob} play={play} />
      <p className="pg-knob-doc">{knob.doc}</p>
    </div>
  );
}

function EventLog({ play }: { play: PlaygroundHandle }) {
  return (
    <div className="pg-log">
      <div className="pg-log-head">
        <span className="pg-panel-title">Events</span>
        <span className="pg-knob-form">{play.model.events.length} declared</span>
      </div>
      <ul className="pg-log-list">
        {play.entries.length === 0
          ? <li className="pg-log-empty">Nothing raised yet.</li>
          : play.entries.map((entry) => (
            <li key={entry.id} className="pg-log-row">
              <span className="pg-log-name">{entry.name}</span>
              {entry.payload ? ` ${entry.payload}` : ''}
            </li>
          ))}
      </ul>
    </div>
  );
}

export function Playground({ model, play, children }: PlaygroundProps) {
  return (
    <React.Fragment>
      <header className="pg-head">
        <p className="pg-eyebrow">Arena playground</p>
        <h1 className="pg-title">{model.component}</h1>
        <p className="pg-note">{model.note || model.description}</p>
      </header>

      <div className="pg-shell">
        <div className="pg-stage" style={model.vars as React.CSSProperties | undefined}>{children}</div>
        <aside className="pg-panel">
          <div className="pg-log-head">
            <span className="pg-panel-title">{model.knobs.length} members</span>
            <button className="pg-reset" type="button" onClick={play.reset}>Reset</button>
          </div>
          {model.knobs.map((knob) => <KnobRow key={knob.member} knob={knob} play={play} />)}
        </aside>
      </div>

      <EventLog play={play} />
    </React.Fragment>
  );
}
