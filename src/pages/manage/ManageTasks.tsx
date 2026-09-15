import { useMemo } from 'react';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, categoryById, groupById, sortedGroups } from '../../store/selectors';
import { useParam, useSetParams } from '../../hooks/useDateParam';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { formatShortDate } from '../../lib/dates';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Select';
import { CompleteToggle } from '../../components/ui/CompleteToggle';
import { MonetAccent } from '../../components/art/MonetAccent';
import { InlineTitle } from '../../components/tasks/InlineTitle';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_LABEL = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' } as const;

export function ManageTasks() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { openTask } = useTaskEditor();
  const [q, setQ] = useParam('q');
  const [groupId] = useParam('group');
  const setParams = useSetParams();
  const [categoryId, setCategoryId] = useParam('category');
  const [status, setStatus] = useParam('status');
  const [sort, setSort] = useParam('sort');

  const groups = sortedGroups(state);
  const validGroup = groupId && groupById(state, groupId) ? groupId : null;
  const categoryOptions = validGroup
    ? categoriesInGroup(state, validGroup)
    : groups.flatMap((g) => categoriesInGroup(state, g.id));
  const validCategory = categoryId && categoryOptions.some((c) => c.id === categoryId) ? categoryId : null;

  const rows = useMemo(() => {
    const query = (q ?? '').trim().toLowerCase();
    return state.tasks
      .map((task) => {
        const cat = categoryById(state, task.categoryId);
        const group = cat ? groupById(state, cat.groupId) : undefined;
        return { task, cat, group };
      })
      .filter(({ task, cat, group }) => {
        if (query && !task.title.toLowerCase().includes(query) && !task.notes.toLowerCase().includes(query)) return false;
        if (validGroup && group?.id !== validGroup) return false;
        if (validCategory && cat?.id !== validCategory) return false;
        if (status === 'open' && task.status !== 'open') return false;
        if (status === 'done' && task.status !== 'done') return false;
        if (status === 'scheduled' && task.blocks.length === 0) return false;
        if (status === 'unscheduled' && (task.blocks.length > 0 || task.status === 'done')) return false;
        return true;
      })
      .sort((a, b) => {
        const done = Number(a.task.status === 'done') - Number(b.task.status === 'done');
        if (done) return done;
        switch (sort) {
          case 'title':
            return a.task.title.localeCompare(b.task.title);
          case 'category':
            return (
              (a.group?.order ?? 0) - (b.group?.order ?? 0) ||
              (a.cat?.order ?? 0) - (b.cat?.order ?? 0) ||
              a.task.title.localeCompare(b.task.title)
            );
          case 'priority':
            return PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority];
          default:
            return (a.task.due ?? '9999').localeCompare(b.task.due ?? '9999') || a.task.createdAt.localeCompare(b.task.createdAt);
        }
      });
  }, [state, q, validGroup, validCategory, status, sort]);

  return (
    <section className={styles.panel} aria-label="Tasks">
      <div className={styles.filters}>
        <label className={styles.search}>
          <Icon name="search" size={17} />
          <span className="visually-hidden">Search tasks</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search tasks…"
            value={q ?? ''}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <Select
          aria-label="Filter by group"
          value={validGroup ?? ''}
          onChange={(e) => setParams({ group: e.target.value || null, category: null })}
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by category" value={validCategory ?? ''} onChange={(e) => setCategoryId(e.target.value || null)}>
          <option value="">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by status" value={status ?? ''} onChange={(e) => setStatus(e.target.value || null)}>
          <option value="">All Status</option>
          <option value="open">Active</option>
          <option value="done">Completed</option>
          <option value="scheduled">Scheduled</option>
          <option value="unscheduled">Unscheduled</option>
        </Select>
        <Select aria-label="Sort tasks" value={sort ?? ''} onChange={(e) => setSort(e.target.value || null)}>
          <option value="">Sort: Due date</option>
          <option value="title">Sort: Title</option>
          <option value="category">Sort: Category</option>
          <option value="priority">Sort: Priority</option>
        </Select>
        <span className={styles.count} aria-live="polite">
          {rows.length} {rows.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <MonetAccent art="gardenCard" variant="card" phrase="nothing here. there is time." />
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map(({ task, cat, group }) => (
            <li key={task.id} className={`${styles.taskRow} ${task.status === 'done' ? styles.taskRowDone : ''}`}>
              <CompleteToggle
                done={task.status === 'done'}
                title={task.title}
                onToggle={() => dispatch({ type: 'task/toggle', id: task.id })}
              />
              <span className={styles.dot} style={{ background: cat?.color }} aria-hidden="true" />
              <InlineTitle task={task} className={styles.taskTitle} inputClassName={styles.titleInput} />
              <span className={styles.meta}>
                {group?.name} · {cat?.name}
              </span>
              <span className={styles.due}>{task.due ? formatShortDate(task.due) : ''}</span>
              <span
                className={styles.priority}
                data-priority={task.priority}
                role="img"
                aria-label={PRIORITY_LABEL[task.priority]}
                title={PRIORITY_LABEL[task.priority]}
              />
              <button type="button" className={`${ui.iconButton} ${ui.iconButtonSm}`} aria-label={`Edit ${task.title}`} onClick={() => openTask(task.id)}>
                <Icon name="pencil" size={17} />
              </button>
              <button
                type="button"
                className={`${ui.iconButton} ${ui.iconButtonSm} ${styles.danger}`}
                aria-label={`Delete ${task.title}`}
                onClick={() => {
                  const previous = state;
                  dispatch({ type: 'task/delete', id: task.id });
                  notify(`“${task.title}” deleted`, previous);
                }}
              >
                <Icon name="trash" size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
