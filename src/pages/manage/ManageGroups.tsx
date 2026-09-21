import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, Group } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { activeCount, categoriesInGroup, habitsInCategory, sortedGroups, tasksInCategory } from '../../store/selectors';
import { useCollapsed } from '../../hooks/useCollapsed';
import { useFocusAfterRender } from '../../hooks/useFocusAfterRender';
import { whatGoesWith } from '../../lib/copy';
import { Icon } from '../../components/ui/Icon';
import { Menu, type MenuEntry } from '../../components/ui/Menu';
import { CATEGORY_PALETTE, GROUP_PALETTE, paint } from '../../lib/swatch';
import { useOutlook } from '../../integrations/outlook/OutlookProvider';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

type FocusLater = ReturnType<typeof useFocusAfterRender>;

interface DropTarget {
  groupId: string;
  index: number;
}

/**
 * Groups and the categories inside them, in one place and in the same shape as the
 * Tasks tab: a group heading, then its categories as cards. Everything is edited in
 * place; categories move by dragging the grip, by arrow keys, or from their menu.
 */
export function ManageGroups() {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const groups = sortedGroups(state);
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusLater = useFocusAfterRender();
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
    <section className={styles.panel} aria-labelledby="manage-structure-title">
      <h2 id="manage-structure-title" className="visually-hidden">
        Groups and categories
      </h2>
      <div className={styles.structure}>
        {groups.map((group, i) => (
          <GroupSection
            key={group.id}
            group={group}
            index={i}
            groups={groups}
            focusLater={focusLater}
            dragId={dragId}
            target={target}
            sectionRef={(el) => {
              if (el) sectionRefs.current.set(group.id, el);
              else sectionRefs.current.delete(group.id);
            }}
            onGripDown={startReorder}
          />
        ))}
      </div>

      {adding ? (
        <div id="add-group" className={styles.addInline}>
          <input
            ref={addRef}
            className="field"
            placeholder="New group name"
            aria-label="New group name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                e.currentTarget.value = '';
                setAdding(false);
                focusLater(() => addButtonRef.current);
              }
            }}
            onBlur={(e) => {
              const name = e.currentTarget.value.trim();
              if (name) {
                // A colour no other group wears yet, as new categories do.
                const used = new Set(groups.map((g) => g.color));
                const color = GROUP_PALETTE.find((c) => !used.has(c.value))?.value ?? GROUP_PALETTE[groups.length % GROUP_PALETTE.length].value;
                dispatch({ type: 'group/add', id: uid('g'), name, color });
                announce(`Group ${name} added`);
              }
              setAdding(false);
            }}
          />
        </div>
      ) : (
        <button
          ref={addButtonRef}
          id="add-group"
          type="button"
          className={`${ui.textButton} ${styles.addGroup}`}
          onClick={() => {
            setAdding(true);
            focusLater(() => addRef.current);
          }}
        >
          <Icon name="plus" size={16} />
          Add group
        </button>
      )}
    </section>
  );
}

interface GroupSectionProps {
  group: Group;
  index: number;
  groups: Group[];
  focusLater: FocusLater;
  dragId: string | null;
  target: DropTarget | null;
  sectionRef: (el: HTMLElement | null) => void;
  onGripDown: (e: ReactPointerEvent, cat: Category) => void;
}

function GroupSection({ group, index: i, groups, focusLater, dragId, target, sectionRef, onGripDown }: GroupSectionProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { isCollapsed, toggle } = useCollapsed();
  const cats = categoriesInGroup(state, group.id);
  const catIds = new Set(cats.map((c) => c.id));
  const active = activeCount(state.tasks.filter((t) => !!t.categoryId && catIds.has(t.categoryId)));
  const key = `manage-group:${group.id}`;
  const collapsed = isCollapsed(key);
  const bodyId = `group-body-${group.id}`;
  const others = groups.filter((g) => g.id !== group.id);
  const visible = cats.filter((c) => c.id !== dragId);
  const indicatorIndex = target?.groupId === group.id ? target.index : -1;

  /** Moving to the top or bottom disables the arrow you pressed, so keep focus on one that still works. */
  const move = (to: number) => {
    dispatch({ type: 'group/move', id: group.id, index: to });
    announce(`${group.name} moved ${to < i ? 'up' : 'down'}, to position ${to + 1} of ${groups.length}`);
    const edge = to === 0 || to === groups.length - 1;
    const dir = edge ? (to === 0 ? 'down' : 'up') : to < i ? 'up' : 'down';
    focusLater(() => document.getElementById(`group-${group.id}-${dir}`));
  };

  const remove = (moveTo: Group) => {
    const previous = state;
    dispatch({ type: 'group/delete', id: group.id, moveCategoriesTo: moveTo.id });
    notify(`${group.name} deleted${cats.length ? `, categories moved to ${moveTo.name}` : ''}`, previous);
    // Its section is gone, so land on the group that took its categories.
    focusLater(() => document.getElementById(`group-${moveTo.id}-name`));
  };

  const deleteItems: MenuEntry[] = cats.length
    ? [
        { kind: 'heading', label: 'Move its categories to' },
        ...others.map<MenuEntry>((g) => ({ label: `${g.name}, then delete`, icon: 'trash', danger: true, onSelect: () => remove(g) })),
      ]
    : [{ label: `Delete ${group.name}`, icon: 'trash', danger: true, onSelect: () => remove(others[0]) }];

  return (
    <section className={styles.groupSection} aria-label={group.name} ref={sectionRef}>
      <div className={styles.groupHead}>
        <button
          type="button"
          className={`${ui.iconButton} ${ui.iconButtonSm} ${styles.groupChevron}`}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={`${collapsed ? 'Show' : 'Hide'} the categories in ${group.name}`}
          onClick={() => toggle(key)}
        >
          <Icon name="chevronDown" size={16} style={{ transform: collapsed ? 'rotate(-90deg)' : undefined, transition: 'transform .2s' }} />
        </button>
        <Menu
          label={`Color for ${group.name}`}
          align="start"
          triggerClassName={styles.swatchButton}
          trigger={<span className={styles.groupSwatch} style={{ background: paint(group.color) }} />}
          items={[
            { kind: 'heading', label: 'Group color' },
            ...GROUP_PALETTE.map((c) => ({
              label: c.name,
              swatch: paint(c.value),
              checked: c.value === group.color,
              onSelect: () => dispatch({ type: 'group/update', id: group.id, patch: { color: c.value } }),
            })),
          ]}
        />
        <InlineName
          id={`group-${group.id}-name`}
          className={styles.groupName}
          value={group.name}
          label={`Name of group ${group.name}`}
          onRename={(name) => dispatch({ type: 'group/update', id: group.id, patch: { name } })}
        />
        <span className={styles.rowMeta}>
          {cats.length === 1 ? '1 category' : `${cats.length} categories`} · {active} active
          {group.calendar && ` · Outlook: ${group.calendar.name}`}
        </span>
        <div className={styles.groupActions}>
          <CalendarMenu group={group} />
          <button
            type="button"
            id={`group-${group.id}-up`}
            className={`${ui.iconButton} ${ui.iconButtonSm}`}
            aria-label={`Move ${group.name} up`}
            disabled={i === 0}
            onClick={() => move(i - 1)}
          >
            <Icon name="arrowUp" size={16} />
          </button>
          <button
            type="button"
            id={`group-${group.id}-down`}
            className={`${ui.iconButton} ${ui.iconButtonSm}`}
            aria-label={`Move ${group.name} down`}
            disabled={i === groups.length - 1}
            onClick={() => move(i + 1)}
          >
            <Icon name="arrowDown" size={16} />
          </button>
          {others.length > 0 && (
            <Menu label={`Delete ${group.name}`} icon="trash" items={deleteItems} triggerClassName={styles.danger} />
          )}
        </div>
      </div>

      {!collapsed && (
        <div id={bodyId} className={styles.groupBody}>
          {cats.length === 0 && <p className={styles.emptyLine}>No categories yet.</p>}
          <ul className={styles.catList} aria-label={`Categories in ${group.name}`}>
            {cats.map((cat) => {
              const visibleIndex = visible.indexOf(cat);
              return (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  groups={groups}
                  showIndicator={indicatorIndex !== -1 && visibleIndex === indicatorIndex}
                  dragging={dragId === cat.id}
                  focusLater={focusLater}
                  onGripDown={(e) => onGripDown(e, cat)}
                  onKeyMove={(dir) => {
                    const at = cats.indexOf(cat);
                    const next = at + dir;
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
        </div>
      )}
    </section>
  );
}

/** A name edited in place: Enter or leaving keeps it, Escape puts the old one back, blank is refused. */
function InlineName({
  id,
  className,
  value,
  label,
  onRename,
}: {
  id?: string;
  className?: string;
  value: string;
  label: string;
  onRename: (name: string) => void;
}) {
  return (
    <input
      key={value}
      id={id}
      className={`${styles.inlineName} ${className ?? ''}`}
      defaultValue={value}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const name = e.currentTarget.value.trim();
        if (!name) e.currentTarget.value = value;
        else if (name !== value) onRename(name);
      }}
    />
  );
}

interface CategoryRowProps {
  category: Category;
  groups: Group[];
  showIndicator: boolean;
  dragging: boolean;
  /** The row may unmount (deleted, or moved to another group), so its parent moves focus. */
  focusLater: FocusLater;
  onGripDown: (e: ReactPointerEvent) => void;
  onKeyMove: (dir: -1 | 1) => void;
}

function CategoryRow({ category, groups, showIndicator, dragging, focusLater, onGripDown, onKeyMove }: CategoryRowProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const rowRef = useRef<HTMLLIElement>(null);
  const tasks = tasksInCategory(state, category.id);
  const count = activeCount(tasks);
  const along = whatGoesWith(tasks.length, habitsInCategory(state, category.id).length);
  const elsewhere = groups.filter((g) => g.id !== category.groupId);

  const moveTo = (g: Group) => {
    dispatch({ type: 'category/move', id: category.id, groupId: g.id, index: Number.MAX_SAFE_INTEGER });
    announce(`${category.name} moved to ${g.name}`);
    // It now lives in another group, so follow it there.
    focusLater(() => document.querySelector<HTMLElement>(`[data-cat-row="${category.id}"] .${styles.rowOptions}`));
  };

  const remove = () => {
    // The row is about to go, so hand focus to its neighbour (or the add button) instead of the page.
    const li = rowRef.current;
    const rows = Array.from(li?.parentElement?.querySelectorAll<HTMLElement>('[data-cat-row]') ?? []);
    const at = li ? rows.indexOf(li) : -1;
    const neighbourId = (rows[at + 1] ?? rows[at - 1])?.dataset.catRow;
    const body = li?.closest('section');
    const previous = state;
    dispatch({ type: 'category/delete', id: category.id });
    notify(`${category.name} deleted${along ? `, with ${along}` : ''}`, previous);
    focusLater(() =>
      neighbourId
        ? document.querySelector<HTMLElement>(`[data-cat-row="${neighbourId}"] button`)
        : body?.querySelector<HTMLElement>('[data-add-category]'),
    );
  };

  const items: MenuEntry[] = [
    ...(elsewhere.length
      ? [
          { kind: 'heading', label: 'Move to' } as MenuEntry,
          ...elsewhere.map<MenuEntry>((g) => ({ label: g.name, swatch: paint(g.color), onSelect: () => moveTo(g) })),
          { kind: 'separator' } as MenuEntry,
        ]
      : []),
    // The label says what goes with it, so the choice is made knowing.
    { label: along ? `Delete, with ${along}` : 'Delete category', icon: 'trash', danger: true, onSelect: remove },
  ];

  return (
    <>
      {showIndicator && <li className={styles.dropIndicator} aria-hidden="true" />}
      <li ref={rowRef} className={`${styles.catRow} ${dragging ? styles.catRowDragging : ''}`} data-cat-row={category.id}>
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
          trigger={<span className={styles.swatch} style={{ background: paint(category.color) }} />}
          items={[
            { kind: 'heading', label: 'Category color' },
            ...CATEGORY_PALETTE.map((c) => ({
              label: c.name,
              swatch: paint(c.value),
              checked: c.value === category.color,
              onSelect: () => dispatch({ type: 'category/update', id: category.id, patch: { color: c.value } }),
            })),
          ]}
        />
        <InlineName
          value={category.name}
          label={`Name of category ${category.name}`}
          onRename={(name) => dispatch({ type: 'category/update', id: category.id, patch: { name } })}
        />
        <span className={styles.rowMeta}>{count} active</span>
        <Menu label={`Options for ${category.name}`} items={items} triggerClassName={styles.rowOptions} />
      </li>
    </>
  );
}

function AddCategory({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusLater = useFocusAfterRender();

  const add = (value: string) => {
    const name = value.trim();
    if (!name) return;
    const used = new Set(state.categories.map((c) => c.color));
    const color = CATEGORY_PALETTE.find((c) => !used.has(c.value))?.value ?? CATEGORY_PALETTE[state.categories.length % CATEGORY_PALETTE.length].value;
    dispatch({ type: 'category/add', id: uid('c'), groupId, name, color });
    announce(`${name} added to ${groupName}`);
  };

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        id={`add-category-${groupId}`}
        type="button"
        data-add-category
        className={`${ui.textButton} ${styles.addButton}`}
        onClick={() => {
          setEditing(true);
          focusLater(() => inputRef.current);
        }}
      >
        <Icon name="plus" size={16} />
        Add category
      </button>
    );
  }

  return (
    <div id={`add-category-${groupId}`} className={styles.addInline}>
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
          if (e.key === 'Escape') {
            // "Never mind": clear first so nothing is added, then go back to the button.
            e.currentTarget.value = '';
            setEditing(false);
            focusLater(() => buttonRef.current);
          }
        }}
        onBlur={(e) => {
          add(e.currentTarget.value);
          setEditing(false);
        }}
      />
    </div>
  );
}

/** Links a group to one Outlook calendar, or unlinks it. */
function CalendarMenu({ group }: { group: Group }) {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { access, calendars, allowAccess } = useOutlook();
  const navigate = useNavigate();

  const link = (calendar: Group['calendar']) => {
    const previous = state;
    dispatch({ type: 'group/update', id: group.id, patch: { calendar } });
    notify(
      calendar
        ? `${group.name} is linked to ${calendar.name}. Its events show here, and its time blocks from today on go there.`
        : `${group.name} is unlinked. The events Gaia added to ${group.calendar?.name ?? 'Outlook'} will be removed.`,
      previous,
    );
  };

  let items: MenuEntry[];
  if (access === 'ready') {
    const editable = (calendars ?? []).filter((c) => c.canEdit);
    items = [
      { kind: 'heading', label: 'Outlook calendar' },
      ...(calendars === null
        ? [{ label: 'Loading calendars…', disabled: true, onSelect: () => {} }]
        : editable.map<MenuEntry>((c) => ({
            label: c.name,
            icon: 'calendar',
            checked: group.calendar?.id === c.id,
            onSelect: () => group.calendar?.id !== c.id && link({ id: c.id, name: c.name }),
          }))),
      { kind: 'separator' },
      { label: 'Not linked', checked: !group.calendar, onSelect: () => group.calendar && link(undefined) },
    ];
  } else if (access === 'needs-consent') {
    items = [
      { kind: 'heading', label: 'Outlook calendar' },
      {
        label: 'Allow calendar access',
        icon: 'calendar',
        onSelect: () => {
          allowAccess().catch(() => notify('Calendar access was not granted.'));
        },
      },
    ];
  } else {
    items = [
      { kind: 'heading', label: 'Outlook calendar' },
      { label: 'Sign in to Microsoft', icon: 'settings', onSelect: () => navigate('/settings') },
    ];
  }

  return (
    <Menu
      label={group.calendar ? `${group.name}: linked to ${group.calendar.name}` : `Link ${group.name} to an Outlook calendar`}
      icon="calendar"
      items={items}
      triggerClassName={group.calendar ? styles.linked : undefined}
    />
  );
}
