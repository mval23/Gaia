import { useRef, useState } from 'react';
import type { Category, Group, Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { useCollapsed } from '../../hooks/useCollapsed';
import { CATEGORY_PALETTE, paint } from '../../lib/swatch';
import { whatGoesWith } from '../../lib/copy';
import { habitsInCategory } from '../../store/selectors';
import { Icon } from '../ui/Icon';
import { Menu, type MenuEntry } from '../ui/Menu';
import { TaskRow } from './TaskRow';
import { InlineAddTask } from './InlineAddTask';
import styles from './tasks.module.css';

interface CategoryCardProps {
  category: Category;
  group: Group;
  tasks: Task[];
  date?: string;
  onScheduleNext?: (task: Task) => void;
}

export function CategoryCard({ category, group, tasks, date, onScheduleNext }: CategoryCardProps) {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { isCollapsed, toggle } = useCollapsed();
  const [menuView, setMenuView] = useState<'main' | 'color'>('main');
  const [renaming, setRenaming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const key = `cat:${category.id}`;
  const collapsed = isCollapsed(key);
  const active = tasks.filter((t) => t.status === 'open').length;
  const bodyId = `cat-body-${category.id}`;
  const along = whatGoesWith(
    state.tasks.filter((t) => t.categoryId === category.id).length,
    habitsInCategory(state, category.id).length,
  );

  const items: MenuEntry[] =
    menuView === 'main'
      ? [
          {
            label: 'Rename',
            icon: 'pencil',
            onSelect: () => {
              setRenaming(true);
              requestAnimationFrame(() => nameRef.current?.select());
            },
          },
          { label: 'Change color…', icon: 'palette', keepOpen: true, onSelect: () => setMenuView('color') },
          { label: collapsed ? 'Expand' : 'Collapse', icon: 'chevronDown', onSelect: () => toggle(key) },
          { kind: 'separator' },
          {
            label: along ? `Delete, with ${along}` : 'Delete category',
            icon: 'trash',
            danger: true,
            onSelect: () => {
              const previous = state;
              dispatch({ type: 'category/delete', id: category.id });
              notify(`${category.name} deleted${along ? `, with ${along}` : ''}`, previous);
            },
          },
        ]
      : [
          { label: 'Back', icon: 'chevronLeft', keepOpen: true, onSelect: () => setMenuView('main') },
          { kind: 'heading', label: 'Category color' },
          ...CATEGORY_PALETTE.map<MenuEntry>((c) => ({
            label: c.name,
            swatch: paint(c.value),
            checked: c.value === category.color,
            onSelect: () => dispatch({ type: 'category/update', id: category.id, patch: { color: c.value } }),
          })),
        ];

  return (
    <section className={styles.card} aria-label={`${group.name} · ${category.name}`}>
      <div className={styles.cardHeader}>
        {renaming ? (
          <div className={styles.cardToggle}>
            <Icon name="chevronDown" size={16} className={styles.chevron} />
            <span className={styles.dot} style={{ background: paint(category.color) }} aria-hidden="true" />
            <input
              ref={nameRef}
              className={styles.renameInput}
              defaultValue={category.name}
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
                if (name && name !== category.name) {
                  dispatch({ type: 'category/update', id: category.id, patch: { name } });
                }
                setRenaming(false);
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className={styles.cardToggle}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => toggle(key)}
          >
            <Icon name="chevronDown" size={16} className={`${styles.chevron} ${collapsed ? styles.chevronClosed : ''}`} />
            <span className={styles.dot} style={{ background: paint(category.color) }} aria-hidden="true" />
            <span className={styles.cardName}>{category.name}</span>
            <span className={styles.count} aria-label={`${active} active`}>
              {active}
            </span>
          </button>
        )}
        <Menu
          label={`Options for ${category.name}`}
          items={items}
          onOpenChange={(open) => !open && setMenuView('main')}
        />
      </div>
      {!collapsed && (
        <div id={bodyId} className={styles.cardBody}>
          {tasks.length > 0 && (
            <ul className={styles.taskList}>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} date={date} onScheduleNext={onScheduleNext} />
              ))}
            </ul>
          )}
          <InlineAddTask categoryId={category.id} categoryName={category.name} />
        </div>
      )}
    </section>
  );
}
