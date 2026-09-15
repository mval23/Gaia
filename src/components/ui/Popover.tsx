import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import styles from './ui.module.css';

interface PopoverProps {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  onClose: (reason: 'escape' | 'outside') => void;
  children: ReactNode;
  align?: 'start' | 'end';
  width?: number;
  role?: string;
  label?: string;
  id?: string;
  className?: string;
}

/**
 * Anchored floating panel rendered in a portal so scroll containers never clip it.
 * Flips above the anchor when there is not enough room below.
 */
export function Popover({
  anchorRef,
  open,
  onClose,
  children,
  align = 'end',
  width,
  role = 'dialog',
  label,
  id,
  className,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const a = anchor.getBoundingClientRect();
      const pw = panel.offsetWidth;
      const ph = panel.scrollHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;
      let left = align === 'end' ? a.right - pw : a.left;
      left = Math.max(margin, Math.min(left, vw - pw - margin));
      const below = vh - a.bottom - margin * 2;
      const above = a.top - margin * 2;
      const openUp = ph > below && above > below;
      const maxHeight = Math.max(160, openUp ? above : below);
      const top = openUp ? Math.max(margin, a.top - Math.min(ph, maxHeight) - 6) : a.bottom + 6;
      setPos({ top, left, maxHeight });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, anchorRef, children]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose('escape');
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose('outside');
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={label}
      className={`${styles.popover} ${className ?? ''}`}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        maxHeight: pos?.maxHeight,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
