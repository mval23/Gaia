import { useRef, useState } from 'react';
import { todayISO } from '../../lib/dates';
import { MiniMonth } from '../plan/MiniMonth';
import { Icon } from './Icon';
import { Popover } from './Popover';
import ui from './ui.module.css';

interface DatePickerButtonProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

export function DatePickerButton({ value, onChange, className }: DatePickerButtonProps) {
  const today = todayISO();
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
        width={252}
      >
        <MiniMonth
          value={value}
          today={today}
          onPick={(picked) => {
            onChange(picked);
            setOpen(false);
            ref.current?.focus();
          }}
        />
      </Popover>
    </>
  );
}
