import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Group } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, sortedGroups } from '../../store/selectors';
import { useCollapsed } from '../../hooks/useCollapsed';
import { Icon } from '../../components/ui/Icon';
import { Menu, type MenuEntry } from '../../components/ui/Menu';
import { GROUP_PALETTE, paint } from '../../lib/swatch';
import { useOutlook } from '../../integrations/outlook/OutlookProvider';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

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
                  trigger={<span className={styles.groupAvatar} style={{ background: paint(group.color) }} />}
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
                  {group.calendar && ` · Outlook: ${group.calendar.name}`}
                </span>
                <div className={styles.groupActions}>
                  <CalendarMenu group={group} />
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
                      <span className={styles.dot} style={{ background: paint(c.color) }} aria-hidden="true" />
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
                dispatch({ type: 'group/add', id: uid('g'), name, color: GROUP_PALETTE[groups.length % GROUP_PALETTE.length].value });
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
