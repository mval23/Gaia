import { useRef, useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, sortedGroups } from '../../store/selectors';
import { useCollapsed } from '../../hooks/useCollapsed';
import { Icon } from '../../components/ui/Icon';
import { Menu, type MenuEntry } from '../../components/ui/Menu';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

const GROUP_COLORS = ['#A7B6CC', '#CDB4C3', '#C3C9BE', '#C9BBA9', '#B4C8C4', '#BDB3D2'];

export function ManageGroups() {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { isCollapsed, toggle } = useCollapsed();
  const groups = sortedGroups(state);
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  return (
    <section className={styles.panel} aria-label="Groups">
      <ul className={styles.groupList}>
        {groups.map((group, i) => {
          const cats = categoriesInGroup(state, group.id);
          const catIds = new Set(cats.map((c) => c.id));
          const active = state.tasks.filter((t) => catIds.has(t.categoryId) && t.status === 'open').length;
          const key = `manage-group:${group.id}`;
          const collapsed = isCollapsed(key);
          const others = groups.filter((g) => g.id !== group.id);
          const deleteItems: MenuEntry[] = [
            { kind: 'heading', label: cats.length ? 'Move its categories to' : 'Delete group' },
            ...others.map<MenuEntry>((g) => ({
              label: cats.length ? `${g.name}, then delete` : `Delete ${group.name}`,
              icon: 'trash',
              danger: true,
              onSelect: () => {
                const previous = state;
                dispatch({ type: 'group/delete', id: group.id, moveCategoriesTo: g.id });
                notify(`${group.name} deleted${cats.length ? `, categories moved to ${g.name}` : ''}`, previous);
              },
            })),
          ];
          const uniqueDelete = cats.length ? deleteItems : deleteItems.slice(0, 2);

          return (
            <li key={group.id} className={styles.groupCard}>
              <div className={styles.groupHead}>
                <button
                  type="button"
                  className={`${ui.iconButton} ${ui.iconButtonSm}`}
                  aria-expanded={!collapsed}
                  aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${group.name}`}
                  onClick={() => toggle(key)}
                >
                  <Icon name="chevronDown" size={17} style={{ transform: collapsed ? 'rotate(-90deg)' : undefined, transition: 'transform .2s' }} />
                </button>
                <Menu
                  label={`Color for ${group.name}`}
                  align="start"
                  triggerClassName={styles.groupAvatarButton}
                  trigger={<span className={styles.groupAvatar} style={{ background: group.color }} />}
                  items={[
                    { kind: 'heading', label: 'Group color' },
                    ...GROUP_COLORS.map((c, ci) => ({
                      label: `Tone ${ci + 1}`,
                      swatch: c,
                      checked: c === group.color,
                      onSelect: () => dispatch({ type: 'group/update', id: group.id, patch: { color: c } }),
                    })),
                  ]}
                />
                <input
                  key={group.name}
                  className={`${styles.inlineName} ${styles.groupName}`}
                  defaultValue={group.name}
                  aria-label="Group name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                      e.currentTarget.value = group.name;
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => {
                    const name = e.currentTarget.value.trim();
                    if (!name) e.currentTarget.value = group.name;
                    else if (name !== group.name) dispatch({ type: 'group/update', id: group.id, patch: { name } });
                  }}
                />
                <span className={styles.rowMeta}>
                  {cats.length} {cats.length === 1 ? 'category' : 'categories'} · {active} active
                </span>
                <div className={styles.groupActions}>
                  <button
                    type="button"
                    className={`${ui.iconButton} ${ui.iconButtonSm}`}
                    aria-label={`Move ${group.name} up`}
                    disabled={i === 0}
                    onClick={() => {
                      dispatch({ type: 'group/move', id: group.id, index: i - 1 });
                      announce(`${group.name} moved up`);
                    }}
                  >
                    <Icon name="arrowUp" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${ui.iconButton} ${ui.iconButtonSm}`}
                    aria-label={`Move ${group.name} down`}
                    disabled={i === groups.length - 1}
                    onClick={() => {
                      dispatch({ type: 'group/move', id: group.id, index: i + 1 });
                      announce(`${group.name} moved down`);
                    }}
                  >
                    <Icon name="arrowDown" size={16} />
                  </button>
                  {others.length > 0 && (
                    <Menu label={`Delete ${group.name}`} icon="trash" items={uniqueDelete} triggerClassName={styles.danger} />
                  )}
                </div>
              </div>
              {!collapsed && (
                <ul className={styles.chips} aria-label={`Categories in ${group.name}`}>
                  {cats.length === 0 && <li className={styles.chipEmpty}>No categories yet</li>}
                  {cats.map((c) => (
                    <li key={c.id} className={styles.chip}>
                      <span className={styles.dot} style={{ background: c.color }} aria-hidden="true" />
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className={styles.addInline}>
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
              }
            }}
            onBlur={(e) => {
              const name = e.currentTarget.value.trim();
              if (name) {
                dispatch({ type: 'group/add', id: uid('g'), name, color: GROUP_COLORS[groups.length % GROUP_COLORS.length] });
                announce(`Group ${name} added`);
              }
              setAdding(false);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className={`${ui.textButton} ${styles.addButton}`}
          onClick={() => {
            setAdding(true);
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        >
          <Icon name="plus" size={16} />
          Add group
        </button>
      )}
    </section>
  );
}
