import { useId } from 'react';
import type { Task } from '../../types';
import { useCollapsed } from '../../hooks/useCollapsed';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import { TaskRow } from '../tasks/TaskRow';
import styles from './plan.module.css';
import taskStyles from '../tasks/tasks.module.css';

interface Props {
  tasks: Task[];
  date: string;
  hideNumbers: boolean;
}

const COLLAPSE_KEY = 'with-someone';

/**
 * Tasks someone else has for now. Off the person's plate, so never in Today
 * or Later, and only here when there is something to show.
 */
export function WithSomeoneSection({ tasks, date, hideNumbers }: Props) {
  const { isCollapsed, toggle } = useCollapsed();
  const bodyId = useId();
  if (tasks.length === 0) return null;
  const collapsed = isCollapsed(COLLAPSE_KEY);

  return (
    <section className={styles.section} aria-labelledby="with-someone-title">
      <h2 id="with-someone-title" className={styles.laterHead}>
        <button
          type="button"
          className={styles.laterToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => toggle(COLLAPSE_KEY)}
        >
          <Icon name="chevronDown" size={16} className={collapsed ? styles.chevronClosed : undefined} />
          <span className="eyebrow">{COPY.withSomeone}</span>
          {!hideNumbers && <span className={styles.sectionMeta}>{tasks.length}</span>}
        </button>
      </h2>
      {!collapsed && (
        <ul id={bodyId} className={taskStyles.taskList}>
          {tasks.map((task) => (
            // No category here: who has it is the useful context, and the row stays readable.
            <TaskRow key={task.id} task={task} date={date} />
          ))}
        </ul>
      )}
    </section>
  );
}
