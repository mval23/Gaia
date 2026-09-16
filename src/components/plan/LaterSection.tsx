import { useId } from 'react';
import type { Task } from '../../types';
import { useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, sortedGroups } from '../../store/selectors';
import { useCollapsed } from '../../hooks/useCollapsed';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import { GroupSection } from '../tasks/GroupSection';
import { CategoryCard } from '../tasks/CategoryCard';
import styles from './plan.module.css';

interface Props {
  tasks: Task[];
  date: string;
  groupFilter: string;
  hideNumbers: boolean;
  onScheduleNext: (task: Task) => void;
}

const COLLAPSE_KEY = 'later';

/**
 * Everything not chosen for today, still organised Group → Category → Task.
 * Collapsed by default: it is there when you want it, and quiet when you don't.
 */
export function LaterSection({ tasks, date, groupFilter, hideNumbers, onScheduleNext }: Props) {
  const { state } = useGaia();
  const { isCollapsed, toggle } = useCollapsed();
  const bodyId = useId();
  const collapsed = isCollapsed(COLLAPSE_KEY);

  const groups = sortedGroups(state).filter((g) => groupFilter === 'all' || g.id === groupFilter);
  const byCategory = (categoryId: string) => tasks.filter((t) => t.categoryId === categoryId);

  return (
    <section className={styles.section} aria-labelledby="later-title">
      <h2 id="later-title" className={styles.laterHead}>
        <button
          type="button"
          className={styles.laterToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => toggle(COLLAPSE_KEY)}
        >
          <Icon name="chevronDown" size={16} className={collapsed ? styles.chevronClosed : undefined} />
          <span className="eyebrow">Later</span>
          {!hideNumbers && (
            <span className={styles.sectionMeta}>
              {tasks.length} waiting
            </span>
          )}
        </button>
      </h2>

      {!collapsed && (
        <div id={bodyId} className={styles.laterBody}>
          {tasks.length === 0 && <p className={styles.empty}>{COPY.laterEmpty}</p>}
          {groups.map((group) => {
            const cats = categoriesInGroup(state, group.id);
            const active = cats.reduce((n, c) => n + byCategory(c.id).length, 0);
            return (
              <GroupSection key={group.id} group={group} activeCount={active} showHeader={groupFilter === 'all'}>
                {cats.length === 0 ? (
                  <p className={styles.empty}>No categories in {group.name} yet. Add one in Manage.</p>
                ) : (
                  cats.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      group={group}
                      tasks={byCategory(cat.id)}
                      date={date}
                      onScheduleNext={onScheduleNext}
                    />
                  ))
                )}
              </GroupSection>
            );
          })}
        </div>
      )}
    </section>
  );
}
