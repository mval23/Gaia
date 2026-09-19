import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import styles from './CapturePalette.module.css';

/**
 * One line, then back to what you were doing. Nothing is asked: no category,
 * no date, no goal. Everything kept goes to the Inbox at the top of Later.
 */
export function CapturePalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const [text, setText] = useState('');
  const [kept, setKept] = useState<{ id: string; text: string }[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setText('');
      setKept([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const keep = () => {
    const line = text.trim();
    if (!line) return;
    const id = uid('cap');
    dispatch({ type: 'capture/add', id, text: line });
    setKept((k) => [{ id, text: line }, ...k].slice(0, 4));
    setText('');
    announce(COPY.captureKept);
  };

  return createPortal(
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Capture" className={styles.dialog}>
        <div className={styles.inputRow}>
          <Icon name="capture" size={19} className={styles.pen} />
          <label htmlFor="capture-input" className="visually-hidden">
            {COPY.captureHint}
          </label>
          <input
            id="capture-input"
            ref={inputRef}
            className={styles.input}
            placeholder={COPY.captureHint}
            value={text}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                keep();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <button type="button" className={styles.keep} onClick={keep} disabled={!text.trim()}>
            Keep
          </button>
        </div>
        <div className={styles.foot}>
          {kept.length > 0 ? (
            <ul className={styles.kept} aria-label="Kept just now">
              {kept.map((k) => (
                <li key={k.id}>
                  <Icon name="check" size={14} />
                  {k.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>
              <kbd>Enter</kbd> keeps it · <kbd>Esc</kbd> closes · it goes to the Inbox under Later
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
