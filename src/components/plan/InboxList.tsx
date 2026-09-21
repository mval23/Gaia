import type { Task } from '../../types';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import { SortMenu } from '../tasks/SortMenu';
import { TaskRow } from '../tasks/TaskRow';
import styles from './plan.module.css';
import taskStyles from '../tasks/tasks.module.css';

interface Props {
  /** Tasks with no category yet, newest first. */
  tasks: Task[];
  date: string;
  hideNumbers: boolean;
  onScheduleNext: (task: Task) => void;
}

/**
 * Tasks kept with Capture, or added without a category. They are ordinary tasks
 * (done, planned, scheduled like any other) that simply have no place yet.
 * Nothing here ages: no dates, no growing count in a warning colour.
 */
export function InboxList({ tasks, date, hideNumbers, onScheduleNext }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className={styles.inbox} role="group" aria-labelledby="inbox-title">
      <p id="inbox-title" className={styles.inboxHead}>
        <Icon name="inbox" size={15} />
        <span className="eyebrow">Inbox</span>
        <span className={styles.sectionMeta}>
          {hideNumbers ? COPY.inboxNote : `${tasks.length} ${COPY.inboxNote}`}
        </span>
      </p>
      <ul className={taskStyles.taskList}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            date={date}
            onScheduleNext={onScheduleNext}
            action={<SortMenu task={task} />}
          />
        ))}
      </ul>
    </div>
  );
}
