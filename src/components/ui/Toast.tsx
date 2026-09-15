import { useEffect } from 'react';
import { Icon } from './Icon';
import styles from './ui.module.css';

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
}

export function Toast({ message, onUndo, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, onUndo ? 7000 : 3500);
    return () => window.clearTimeout(t);
  }, [onDismiss, onUndo]);

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span>{message}</span>
      {onUndo && (
        <button type="button" className={styles.toastAction} onClick={onUndo}>
          Undo
        </button>
      )}
      <button type="button" className={styles.toastClose} onClick={onDismiss} aria-label="Dismiss notification">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
