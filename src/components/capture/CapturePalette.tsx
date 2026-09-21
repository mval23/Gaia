import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import styles from './CapturePalette.module.css';

/**
 * One line, then back to what you were doing: keeping it closes the window. Nothing is asked: no category,
 * no date, no goal. Each line becomes a task with no category yet, which waits
 * in the Inbox at the top of Later until it is sorted (or simply done).
 */
export function CapturePalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const [text, setText] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setText('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const keep = () => {
    const line = text.trim();
    if (!line) return;
    const previous = state;
    dispatch({ type: 'task/add', id: uid('t'), title: line });
    onClose();
    notify(`“${line}” ${COPY.captureKept}`, previous);
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
          <p className={styles.hint}>
            <kbd>Enter</kbd> keeps it as a task · <kbd>Esc</kbd> closes · sort it later from the Inbox
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
