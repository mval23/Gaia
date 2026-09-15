import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Popover } from './Popover';
import styles from './ui.module.css';

export type MenuEntry =
  | {
      kind?: 'item';
      label: string;
      icon?: IconName;
      swatch?: string;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      /** Keep the menu open after selecting (e.g. to drill into a sub-list). */
      keepOpen?: boolean;
      checked?: boolean;
    }
  | { kind: 'heading'; label: string }
  | { kind: 'separator' };

interface MenuProps {
  label: string;
  items: MenuEntry[];
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
  icon?: IconName;
  /** Custom trigger content (replaces the icon). */
  trigger?: ReactNode;
  align?: 'start' | 'end';
}

export function Menu({ label, items, onOpenChange, triggerClassName, icon = 'more', trigger, align = 'end' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const setOpenState = useCallback(
    (next: boolean, restoreFocus = true) => {
      setOpen(next);
      onOpenChange?.(next);
      if (!next && restoreFocus) triggerRef.current?.focus();
    },
    [onOpenChange],
  );

  const focusItem = (index: number) => {
    const els = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    if (!els?.length) return;
    const i = ((index % els.length) + els.length) % els.length;
    els[i].focus();
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => focusItem(0));
  }, [open, items]);

  const onListKey = (e: KeyboardEvent) => {
    const els = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    const current = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(current + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(els.length - 1);
    } else if (e.key === 'Tab') {
      setOpenState(false, false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.iconButton} ${styles.iconButtonSm} ${triggerClassName ?? ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpenState(!open, false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpenState(true, false);
          }
        }}
      >
        {trigger ?? <Icon name={icon} size={18} />}
      </button>
      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={(reason) => setOpenState(false, reason === 'escape')}
        role="presentation"
        align={align}
        width={236}
      >
        <div ref={listRef} id={menuId} role="menu" aria-label={label} className={styles.menu} onKeyDown={onListKey}>
          {items.map((item, i) => {
            if (item.kind === 'separator') return <div key={`s${i}`} role="separator" className={styles.menuSeparator} />;
            if (item.kind === 'heading')
              return (
                <div key={`h${i}`} className={styles.menuHeading} role="presentation">
                  {item.label}
                </div>
              );
            return (
              <button
                key={`${item.label}${i}`}
                type="button"
                role="menuitem"
                aria-current={item.checked ? 'true' : undefined}
                disabled={item.disabled}
                className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onSelect();
                  if (!item.keepOpen) setOpenState(false);
                }}
              >
                {item.swatch ? (
                  <span className={styles.menuSwatch} style={{ background: item.swatch }} aria-hidden="true" />
                ) : item.icon ? (
                  <Icon name={item.icon} size={16} />
                ) : (
                  <span className={styles.menuIconSpacer} aria-hidden="true" />
                )}
                <span className={styles.menuLabel}>{item.label}</span>
                {item.checked && <Icon name="check" size={15} />}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
