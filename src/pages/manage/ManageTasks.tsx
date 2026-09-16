import { useMemo } from 'react';
import { useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, categoryById, groupById, sortedGroups } from '../../store/selectors';
import { useParam, useSetParams } from '../../hooks/useDateParam';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Select';
import { MonetAccent } from '../../components/art/MonetAccent';
import { GroupSection } from '../../components/tasks/GroupSection';
import { CategoryCard } from '../../components/tasks/CategoryCard';
import styles from './manage.module.css';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

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
  const [status, setStatus] = useParam('status');
  const [sort, setSort] = useParam('sort');

  const groups = sortedGroups(state);
  const validGroup = groupId && groupById(state, groupId) ? groupId : null;
  const categoryOptions = validGroup ? categoriesInGroup(state, validGroup) : state.categories;
  const validCategory = categoryId && categoryOptions.some((c) => c.id === categoryId) ? categoryId : null;
  const query = (q ?? '').trim().toLowerCase();
  const narrowed = !!(query || status || validCategory || validGroup);

  const matching = useMemo(() => {
    const rows = state.tasks.filter((task) => {
      const cat = categoryById(state, task.categoryId);
      const group = cat ? groupById(state, cat.groupId) : undefined;
      if (query && !task.title.toLowerCase().includes(query) && !task.notes.toLowerCase().includes(query)) return false;
      if (validGroup && group?.id !== validGroup) return false;
      if (validCategory && cat?.id !== validCategory) return false;
      if (status === 'open' && task.status !== 'open') return false;
      if (status === 'done' && task.status !== 'done') return false;
      if (status === 'scheduled' && task.blocks.length === 0) return false;
      if (status === 'let-go' && task.status !== 'let-go') return false;
      if (status !== 'let-go' && task.status === 'let-go') return false;
      if (status === 'unscheduled' && (task.blocks.length > 0 || task.status !== 'open')) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      // Finished ones settle at the bottom of their category, as on the Plan page.
      const done = Number(a.status === 'done') - Number(b.status === 'done');
      if (done) return done;
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      const dueA = a.due ?? '9999-99-99';
      const dueB = b.due ?? '9999-99-99';
      return dueA.localeCompare(dueB) || a.createdAt.localeCompare(b.createdAt);
    });
  }, [state, query, validGroup, validCategory, status, sort]);

  const inCategory = (id: string) => matching.filter((t) => t.categoryId === id);

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
        <Select
          aria-label="Filter by category"
          value={validCategory ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
        >
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
          <option value="let-go">Let go</option>
        </Select>
        <Select aria-label="Sort tasks" value={sort ?? ''} onChange={(e) => setSort(e.target.value || null)}>
          <option value="">Sort: Due date</option>
          <option value="title">Sort: Title</option>
          <option value="priority">Sort: Priority</option>
        </Select>
        <span className={styles.count} aria-live="polite">
          {matching.length} {matching.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {visibleGroups.length === 0 ? (
        <div className={styles.empty}>
          <MonetAccent art="garden" variant="card" phrase="nothing waiting." />
        </div>
      ) : (
        <div className={styles.tree}>
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
