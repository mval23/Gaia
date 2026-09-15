import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Category } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, sortedGroups } from '../../store/selectors';
import { CATEGORY_PALETTE } from '../../data/seed';
import { Icon } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { Select } from '../../components/ui/Select';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

interface DropTarget {
  groupId: string;
  index: number;
}

export function ManageCategories() {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const groups = sortedGroups(state);
  const [dragId, setDragId] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  const computeTarget = (y: number, movingId: string): DropTarget | null => {
    let best: { groupId: string; el: HTMLElement; dist: number } | null = null;
    for (const [groupId, el] of sectionRefs.current) {
      const r = el.getBoundingClientRect();
      const dist = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (!best || dist < best.dist) best = { groupId, el, dist };
    }
    if (!best) return null;
    const rows = Array.from(best.el.querySelectorAll<HTMLElement>('[data-cat-row]')).filter(
      (r) => r.dataset.catRow !== movingId,
    );
    const index = rows.filter((r) => {
      const rect = r.getBoundingClientRect();
      return rect.top + rect.height / 2 < y;
    }).length;
    return { groupId: best.groupId, index };
  };

  const startReorder = (e: ReactPointerEvent, cat: Category) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pointerId = e.pointerId;
    let latest: DropTarget | null = null;
    setDragId(cat.id);
    document.body.classList.add('is-dragging');

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      latest = computeTarget(ev.clientY, cat.id);
      setTarget(latest);
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.body.classList.remove('is-dragging');
      if (latest && ev.type === 'pointerup') {
        dispatch({ type: 'category/move', id: cat.id, groupId: latest.groupId, index: latest.index });
        const g = groups.find((x) => x.id === latest!.groupId);
        announce(`${cat.name} moved to position ${latest.index + 1} in ${g?.name}`);
      }
      setDragId(null);
      setTarget(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return (
    <section className={styles.panel} aria-label="Categories">
      {groups.map((group) => {
        const cats = categoriesInGroup(state, group.id);
        const visible = cats.filter((c) => c.id !== dragId);
        const indicatorIndex = target?.groupId === group.id ? target.index : -1;
        return (
          <section
            key={group.id}
            className={styles.catSection}
            aria-labelledby={`cat-group-${group.id}`}
            ref={(el) => {
              if (el) sectionRefs.current.set(group.id, el);
              else sectionRefs.current.delete(group.id);
            }}
          >
            <h2 id={`cat-group-${group.id}`} className={styles.sectionHeading}>
              <span className={styles.groupDot} style={{ background: group.color }} aria-hidden="true" />
              <span className={styles.sectionName}>{group.name}</span>
              <span className={styles.sectionCount}>· {cats.length}</span>
            </h2>
            <ul className={styles.catList}>
              {cats.map((cat) => {
                const visibleIndex = visible.indexOf(cat);
                return (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    showIndicator={indicatorIndex !== -1 && visibleIndex === indicatorIndex}
                    dragging={dragId === cat.id}
                    onGripDown={(e) => startReorder(e, cat)}
                    onKeyMove={(dir) => {
                      const i = cats.indexOf(cat);
                      const next = i + dir;
                      if (next < 0 || next >= cats.length) return;
                      dispatch({ type: 'category/move', id: cat.id, groupId: group.id, index: next });
                      announce(`${cat.name} moved to position ${next + 1}`);
                    }}
                  />
                );
              })}
              {indicatorIndex !== -1 && indicatorIndex >= visible.length && (
                <li className={styles.dropIndicator} aria-hidden="true" />
              )}
            </ul>
            <AddCategory groupId={group.id} groupName={group.name} />
          </section>
        );
      })}
    </section>
  );
}

interface CategoryRowProps {
  category: Category;
  showIndicator: boolean;
  dragging: boolean;
  onGripDown: (e: ReactPointerEvent) => void;
  onKeyMove: (dir: -1 | 1) => void;
}

function CategoryRow({ category, showIndicator, dragging, onGripDown, onKeyMove }: CategoryRowProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const count = state.tasks.filter((t) => t.categoryId === category.id && t.status === 'open').length;
  const groups = sortedGroups(state);

  return (
    <>
      {showIndicator && <li className={styles.dropIndicator} aria-hidden="true" />}
      <li className={`${styles.catRow} ${dragging ? styles.catRowDragging : ''}`} data-cat-row={category.id}>
        <button
          type="button"
          className={styles.grip}
          aria-label={`Reorder ${category.name}. Use the up and down arrow keys to move.`}
          onPointerDown={onGripDown}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              onKeyMove(e.key === 'ArrowUp' ? -1 : 1);
            }
          }}
        >
          <Icon name="grip" size={16} />
        </button>
        <Menu
          label={`Color for ${category.name}`}
          align="start"
          triggerClassName={styles.swatchButton}
          trigger={<span className={styles.swatch} style={{ background: category.color }} />}
          items={[
            { kind: 'heading', label: 'Category color' },
            ...CATEGORY_PALETTE.map((c) => ({
              label: c.name,
              swatch: c.value,
              checked: c.value === category.color,
              onSelect: () => dispatch({ type: 'category/update', id: category.id, patch: { color: c.value } }),
            })),
          ]}
        />
        <input
          className={styles.inlineName}
          defaultValue={category.name}
          key={category.name}
          aria-label="Category name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.currentTarget.value = category.name;
              e.currentTarget.blur();
            }
          }}
          onBlur={(e) => {
            const name = e.currentTarget.value.trim();
            if (!name) e.currentTarget.value = category.name;
            else if (name !== category.name) dispatch({ type: 'category/update', id: category.id, patch: { name } });
          }}
        />
        <span className={styles.rowMeta}>
          {count} {count === 1 ? 'task' : 'tasks'}
        </span>
        <Select
          aria-label={`Group for ${category.name}`}
          value={category.groupId}
          className={styles.groupSelect}
          onChange={(e) => {
            const groupId = e.target.value;
            const g = groups.find((x) => x.id === groupId);
            dispatch({ type: 'category/move', id: category.id, groupId, index: Number.MAX_SAFE_INTEGER });
            announce(`${category.name} moved to ${g?.name}`);
          }}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <button
          type="button"
          className={`${ui.iconButton} ${ui.iconButtonSm} ${styles.danger}`}
          aria-label={`Delete ${category.name}`}
          onClick={() => {
            const previous = state;
            const total = state.tasks.filter((t) => t.categoryId === category.id).length;
            dispatch({ type: 'category/delete', id: category.id });
            notify(`${category.name} deleted${total ? ` with ${total} task${total === 1 ? '' : 's'}` : ''}`, previous);
          }}
        >
          <Icon name="trash" size={17} />
        </button>
      </li>
    </>
  );
}

function AddCategory({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { state, dispatch } = useGaia();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (value: string) => {
    const name = value.trim();
    if (!name) return;
    const used = new Set(state.categories.map((c) => c.color));
    const color = CATEGORY_PALETTE.find((c) => !used.has(c.value))?.value ?? CATEGORY_PALETTE[state.categories.length % CATEGORY_PALETTE.length].value;
    dispatch({ type: 'category/add', id: uid('c'), groupId, name, color });
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={`${ui.textButton} ${styles.addButton}`}
        onClick={() => {
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Icon name="plus" size={16} />
        Add category
      </button>
    );
  }

  return (
    <div className={styles.addInline}>
      <input
        ref={inputRef}
        className="field"
        placeholder={`New category in ${groupName}`}
        aria-label={`New category in ${groupName}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            add(e.currentTarget.value);
            e.currentTarget.value = '';
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        onBlur={(e) => {
          add(e.currentTarget.value);
          setEditing(false);
        }}
      />
    </div>
  );
}
