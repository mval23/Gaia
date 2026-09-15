import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { Popover } from './Popover';
import ui from './ui.module.css';

interface DatePickerButtonProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

export function DatePickerButton({ value, onChange, className }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`${ui.roundButton} ${className ?? ''}`}
        aria-label="Choose a date"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="calendar" size={17} />
      </button>
      <Popover
        anchorRef={ref}
        open={open}
        onClose={(reason) => {
          setOpen(false);
          if (reason === 'escape') ref.current?.focus();
        }}
        label="Choose a date"
        align="end"
        width={236}
      >
        <label style={{ display: 'grid', gap: 8, padding: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Go to date
          <input
            type="date"
            className="field"
            value={value}
            autoFocus
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setOpen(false);
                ref.current?.focus();
              }
            }}
          />
        </label>
      </Popover>
    </>
  );
}
