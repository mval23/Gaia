import { useState } from 'react';
import type { Evidence, EvidenceKind } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { evidenceOf } from '../../store/selectors';
import { formatShortDate, toISODate } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import help from '../../pages/HelpPage.module.css';
import styles from './evidence.module.css';

type Filter = 'all' | 'research' | 'yours';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'research', label: 'Research' },
  { value: 'yours', label: 'Yours' },
];

const KIND_WORD: Record<EvidenceKind, string> = {
  source: 'Research',
  observation: 'Yours',
  pattern: 'Yours · from a pattern',
};

/**
 * Three kinds of knowing, drawn so they can't be mistaken for one another:
 * what someone studied, what the person noticed, and what Gaia spotted in
 * their own rows and asked about. A study never overrules the last two.
 */
export function WhyItWorks() {
  const { state } = useGaia();
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState<EvidenceKind | null>(null);

  const rows = evidenceOf(state).filter((e) =>
    filter === 'all' ? true : filter === 'research' ? e.kind === 'source' : e.kind !== 'source',
  );

  return (
    <section id="help-works" className={help.section}>
      <div className={help.eyebrow}>What it rests on</div>
      <h2>Why Gaia works this way</h2>
      <p className={help.intro}>{COPY.evidenceIntro}</p>

      <div className={styles.filters} role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={styles.filter}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.shelf}>
        {rows.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}

        <div className={styles.aside}>
          <h3 className={styles.asideTitle}>How they rank</h3>
          <p>{COPY.evidenceRank}</p>
          <p className={styles.meta}>Anything here can be edited or let go, the research included.</p>
        </div>

        <div className={styles.aside}>
          <h3 className={styles.asideTitle}>Add something</h3>
          <p>
            A link you read, or a thing you noticed. A source stays marked <b>not yet read</b> until someone opens it.
          </p>
          <div className={styles.addActions}>
            <button
              type="button"
              className={styles.filter}
              onClick={() => setAdding(adding === 'source' ? null : 'source')}
            >
              Add a source
            </button>
            <button
              type="button"
              className={styles.filter}
              onClick={() => setAdding(adding === 'observation' ? null : 'observation')}
            >
              Add what you noticed
            </button>
          </div>
          {adding && <AddForm kind={adding} onDone={() => setAdding(null)} />}
        </div>

        <div className={`${styles.aside} ${styles.stops}`}>
          <h3 className={styles.asideTitle}>
            <Icon name="heart" size={16} /> Where this stops
          </h3>
          <p>{COPY.evidenceStops}</p>
        </div>
      </div>
    </section>
  );
}

function EntryCard({ entry }: { entry: Evidence }) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const mine = entry.kind !== 'source';

  const letGo = () => {
    const previous = state;
    dispatch({ type: 'evidence/remove', id: entry.id });
    notify('Let go. It stays out of the way unless you add it again.', previous);
  };

  return (
    <article className={styles.entry} data-kind={entry.kind}>
      <div className={styles.entryHead}>
        <span className={styles.kind}>
          <Icon name={entry.kind === 'source' ? 'note' : entry.kind === 'pattern' ? 'compass' : 'star'} size={13} />
          {KIND_WORD[entry.kind]}
          {entry.kind === 'source' ? (entry.verified ? ' · read' : ' · not yet read') : ''}
        </span>
        {mine && (
          <button
            type="button"
            className={styles.quiet}
            aria-label={`Edit “${entry.title}”`}
            onClick={() => setEditing(!editing)}
          >
            <Icon name="pencil" size={14} />
          </button>
        )}
        <button type="button" className={styles.quiet} aria-label={`Let go of “${entry.title}”`} onClick={letGo}>
          <Icon name="close" size={14} />
        </button>
      </div>

      {editing ? (
        <textarea
          className={`field ${styles.editField}`}
          autoFocus
          rows={3}
          defaultValue={entry.title}
          onBlur={(e) => {
            dispatch({ type: 'evidence/update', id: entry.id, patch: { title: e.target.value } });
            setEditing(false);
          }}
        />
      ) : (
        <p className={styles.claim}>{entry.title}</p>
      )}

      {entry.note && <p className={styles.meta}>{entry.note}</p>}
      {entry.kind === 'source' && !entry.verified && <p className={styles.meta}>{COPY.evidenceUnread}</p>}
      {entry.url && (
        <p className={styles.meta}>
          <a href={entry.url} target="_blank" rel="noopener noreferrer">
            the source
          </a>
        </p>
      )}
      {entry.shapes && (
        <p className={styles.shapes}>
          Shapes: <b>{entry.shapes}</b>
        </p>
      )}
      {!mine && (
        <button
          type="button"
          className={styles.quietText}
          onClick={() => {
            dispatch({ type: 'evidence/update', id: entry.id, patch: { verified: !entry.verified } });
            announce(entry.verified ? 'Marked as not yet read' : 'Marked as read');
          }}
        >
          {entry.verified ? 'Mark as not yet read' : 'I’ve read the source'}
        </button>
      )}
      {mine && <p className={styles.meta}>Noted {formatShortDate(toISODate(new Date(entry.createdAt)))}</p>}
    </article>
  );
}

function AddForm({ kind, onDone }: { kind: EvidenceKind; onDone: () => void }) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');

  const keep = () => {
    if (!title.trim()) return;
    dispatch({
      type: 'evidence/add',
      id: uid('ev'),
      kind,
      title,
      note: kind === 'source' ? note : note || 'Noted by you.',
      url: kind === 'source' ? url : undefined,
      verified: false,
    });
    announce(kind === 'source' ? 'Added, marked not yet read' : 'Kept as your observation');
    onDone();
  };

  return (
    <div className={styles.form}>
      <label className={styles.formField}>
        <span>{kind === 'source' ? 'What it says, in one sentence' : 'What you noticed'}</span>
        <textarea className="field" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label className={styles.formField}>
        <span>{kind === 'source' ? 'Who said it' : 'Where it came from'}</span>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {kind === 'source' && (
        <label className={styles.formField}>
          <span>A link, if you have one</span>
          <input className="field" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
      )}
      <div className={styles.addActions}>
        <button type="button" className={styles.filter} aria-pressed onClick={keep} disabled={!title.trim()}>
          Keep it
        </button>
        <button type="button" className={styles.quietText} onClick={onDone}>
          Not now
        </button>
      </div>
    </div>
  );
}
