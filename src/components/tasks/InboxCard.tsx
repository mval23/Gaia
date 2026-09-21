import type { Task } from '../../types';
import { useCollapsed } from '../../hooks/useCollapsed';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import { SortMenu } from './SortMenu';
import { InlineAddTask } from './InlineAddTask';
import { TaskRow } from './TaskRow';
import styles from './tasks.module.css';

/**
 * Tasks with no category, drawn like a category card so they sit in the same
 * tree. Adding here keeps a task uncategorized; each row offers Sort.
 */
export function InboxCard({ tasks }: { tasks: Task[] }) {
  const { isCollapsed, toggle } = useCollapsed();
  const key = 'cat:inbox';
  const collapsed = isCollapsed(key);
  const active = tasks.filter((t) => t.status === 'open').length;
  const bodyId = 'cat-body-inbox';

  return (
    <section className={styles.card} aria-label="Inbox, tasks with no category">
      <div className={styles.cardHeader}>
        <button
          type="button"
          className={styles.cardToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => toggle(key)}
        >
          <Icon name="chevronDown" size={16} className={`${styles.chevron} ${collapsed ? styles.chevronClosed : ''}`} />
          <Icon name="inbox" size={15} />
          <span className={styles.cardName}>Inbox</span>
          <span className={styles.inboxNote}>{COPY.inboxNote}</span>
          <span className={styles.count} aria-label={`${active} active`}>
            {active}
          </span>
        </button>
      </div>
      {!collapsed && (
        <div id={bodyId} className={styles.cardBody}>
          {tasks.length > 0 && (
            <ul className={styles.taskList}>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} action={<SortMenu task={t} />} />
              ))}
            </ul>
          )}
          <InlineAddTask placeName="the Inbox" />
        </div>
      )}
    </section>
  );
}
