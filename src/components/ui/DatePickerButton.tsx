import { useRef, useState, type SyntheticEvent } from 'react';
import { todayISO } from '../../lib/dates';
import { MiniMonth } from '../plan/MiniMonth';
import { Icon } from './Icon';
import { Popover } from './Popover';
import ui from './ui.module.css';

interface DatePickerButtonProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  /** Names the button and its calendar, e.g. "Plan “Water the plants” for a day". */
  label?: string;
  /** A small borderless button, for use inside a task row. */
  compact?: boolean;
  /** Shown as a tooltip on the button. */
  title?: string;
}

// Inside a draggable row, a press on the button or the calendar must not start a
// drag or open the row's own menu. The calendar is portalled, but React events
// still bubble through the portal to the row.
const contain = (e: SyntheticEvent) => e.stopPropagation();

export function DatePickerButton({ value, onChange, className, label = 'Choose a date', compact, title }: DatePickerButtonProps) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`${compact ? `${ui.iconButton} ${ui.iconButtonSm}` : ui.roundButton} ${className ?? ''}`}
        aria-label={label}
        title={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerDown={contain}
        onContextMenu={contain}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Icon name="calendar" size={compact ? 15 : 17} />
      </button>
      <Popover
        anchorRef={ref}
        open={open}
        onClose={(reason) => {
          setOpen(false);
          if (reason === 'escape') ref.current?.focus();
        }}
        label={label}
        align="end"
        width={252}
      >
        <div onPointerDown={contain} onClick={contain} onContextMenu={contain}>
          <MiniMonth
            value={value}
            today={today}
            onPick={(picked) => {
              onChange(picked);
              setOpen(false);
              ref.current?.focus();
            }}
          />
        </div>
      </Popover>
    </>
  );
}
