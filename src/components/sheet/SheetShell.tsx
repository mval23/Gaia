import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Icon } from '../ui/Icon';
import ui from '../ui/ui.module.css';
import styles from './sheet.module.css';

interface Props {
  label: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

/**
 * The side sheet used by the goal and habit editors: a glass panel in a portal,
 * with a focus trap and Escape to close. Like the task editor, it has no form
 * and no save button — every control writes as it changes.
 */
export function SheetShell({ label, eyebrow, title, children, footer, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.layer}>
      <div className={styles.scrim} onPointerDown={onClose} aria-hidden="true" />
      <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-label={label}>
        <div className={styles.head}>
          <div className={styles.headText}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h2 className={styles.title}>{title}</h2>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={styles.scroll}>{children}</div>
        {footer && <div className={styles.foot}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Label and control on one line, matching the task editor's rows. */
export function SheetRow({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
      </span>
      <div className={styles.rowControl}>
        {children}
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
    </div>
  );
}
