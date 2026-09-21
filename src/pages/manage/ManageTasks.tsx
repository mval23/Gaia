import { useMemo } from 'react';
import type { Task } from '../../types';
import { useGaia } from '../../store/GaiaProvider';
import {
  categoriesInGroup,
  filterTasks,
  groupById,
  isUncategorized,
  sortedGroups,
  type TaskSort,
  type TaskStatusFilter,
} from '../../store/selectors';
import { useParam, useSetParams } from '../../hooks/useDateParam';
import { countOf } from '../../lib/copy';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Select';
import { MonetAccent } from '../../components/art/MonetAccent';
import { GroupSection } from '../../components/tasks/GroupSection';
import { CategoryCard } from '../../components/tasks/CategoryCard';
import { InboxCard } from '../../components/tasks/InboxCard';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

const STATUSES: TaskStatusFilter[] = ['open', 'done', 'scheduled', 'unscheduled', 'let-go'];
const SORTS: TaskSort[] = ['due', 'title'];
const NO_TASKS: Task[] = [];

/**
 * The same tree the Plan page shows — Group → Category → Task, with the inline
 * add inside each category — narrowed by the filters above it. Anything the
 * filters exclude is hidden, so what is left is only what you asked for.
 */
export function ManageTasks() {
  const { state } = useGaia();
  const [q, setQ] = useParam('q');
  const [groupId] = useParam('group');
  const setParams = useSetParams();
  const [categoryId, setCategoryId] = useParam('category');
  const [rawStatus, setStatus] = useParam('status');
  const [rawSort, setSort] = useParam('sort');

  const groups = sortedGroups(state);
  const validGroup = groupId && groupById(state, groupId) ? groupId : null;
  const categoryOptions = validGroup ? categoriesInGroup(state, validGroup) : state.categories;
  const validCategory = categoryId && categoryOptions.some((c) => c.id === categoryId) ? categoryId : null;
  const status = STATUSES.find((s) => s === rawStatus) ?? null;
  const sort = SORTS.find((s) => s === rawSort) ?? null;
  const query = (q ?? '').trim();
  const narrowed = !!(query || status || validCategory || validGroup);

  const matching = useMemo(
    () => filterTasks(state, { query, groupId: validGroup, categoryId: validCategory, status, sort }),
    [state, query, validGroup, validCategory, status, sort],
  );
  // Built once, so each category reads its own list instead of re-filtering everything.
  const byCategory = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of matching) if (t.categoryId) map.set(t.categoryId, [...(map.get(t.categoryId) ?? []), t]);
    return map;
  }, [matching]);
  const inCategory = (id: string) => byCategory.get(id) ?? NO_TASKS;
  // Tasks with no category have no group either, so a group or category filter hides them.
  const inbox = useMemo(
    () => (validGroup || validCategory ? NO_TASKS : matching.filter((t) => isUncategorized(state, t))),
    [state, matching, validGroup, validCategory],
  );
  const showInbox = !validGroup && !validCategory && (!narrowed || inbox.length > 0);
  const total = state.tasks.filter((t) => t.status !== 'let-go').length;

  const clearFilters = () => setParams({ q: null, group: null, category: null, status: null });

  const visibleGroups = groups
    .filter((g) => !validGroup || g.id === validGroup)
    .map((group) => {
      const cats = categoriesInGroup(state, group.id)
        .filter((c) => !validCategory || c.id === validCategory)
        // With filters on, an empty category is noise; with none, it is a place to add.
        .filter((c) => !narrowed || inCategory(c.id).length > 0);
      return { group, cats };
    })
    .filter(({ cats }) => cats.length > 0);

  return (
    <section className={styles.panel} aria-labelledby="manage-tasks-title">
      {/* Keeps the outline whole: h1 for the page, h2 here, h3 for each group below. */}
      <h2 id="manage-tasks-title" className="visually-hidden">
        Tasks
      </h2>
      <div className={styles.filters} role="search" aria-label="Find tasks">
        <label className={styles.search}>
          <Icon name="search" size={17} />
          <span className="visually-hidden">Search tasks</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search titles and notes…"
            value={q ?? ''}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <Select
          aria-label="Filter by group"
          value={validGroup ?? ''}
          onChange={(e) => setParams({ group: e.target.value || null, category: null })}
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          value={validCategory ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by status" value={status ?? ''} onChange={(e) => setStatus(e.target.value || null)}>
          <option value="">Any status</option>
          <option value="open">Active</option>
          <option value="done">Completed</option>
          <option value="scheduled">Scheduled</option>
          <option value="unscheduled">Unscheduled</option>
          <option value="let-go">Let go</option>
        </Select>
        <Select aria-label="Sort tasks" value={sort ?? ''} onChange={(e) => setSort(e.target.value || null)}>
          <option value="">Sort by due date</option>
          <option value="title">Sort by title</option>
        </Select>
        <div className={styles.filterSummary}>
          <span className={styles.count} role="status">
            {narrowed && status !== 'let-go' ? `${matching.length} of ${countOf(total, 'task')}` : countOf(matching.length, 'task')}
          </span>
          {narrowed && (
            <button type="button" className={ui.textButton} onClick={clearFilters}>
              <Icon name="close" size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {visibleGroups.length === 0 && !showInbox ? (
        narrowed ? (
          <div className={styles.emptyFiltered}>
            <p>
              No tasks match{' '}
              {query ? `“${query}”${status || validGroup || validCategory ? ' with these filters' : ''}` : 'these filters'}.
            </p>
            <button type="button" className={ui.secondaryButton} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className={styles.empty}>
            <MonetAccent art="garden" variant="card" phrase="nothing waiting." />
          </div>
        )
      ) : (
        <div className={styles.tree}>
          {showInbox && <InboxCard tasks={inbox} />}
          {visibleGroups.map(({ group, cats }) => (
            <GroupSection
              key={group.id}
              group={group}
              activeCount={cats.reduce((n, c) => n + inCategory(c.id).filter((t) => t.status === 'open').length, 0)}
              showHeader
              collapseKey="manage-tasks"
            >
              {cats.map((cat) => (
                <CategoryCard key={cat.id} category={cat} group={group} tasks={inCategory(cat.id)} />
              ))}
            </GroupSection>
          ))}
        </div>
      )}
    </section>
  );
}
