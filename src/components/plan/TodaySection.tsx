import type { Task } from '../../types';
import { COPY } from '../../lib/copy';
import { TaskRow } from '../tasks/TaskRow';
import styles from './plan.module.css';
import taskStyles from '../tasks/tasks.module.css';

interface Props {
  tasks: Task[];
  date: string;
  gentle: boolean;
  hideNumbers: boolean;
  onScheduleNext: (task: Task) => void;
}

/** What the person chose for this day, plus anything already on the timeline. */
export function TodaySection({ tasks, date, gentle, hideNumbers, onScheduleNext }: Props) {
  const open = tasks.filter((t) => t.status === 'open').length;

  return (
    <section className={styles.section} aria-labelledby="today-title">
      <div className={styles.sectionHead}>
        <h2 id="today-title" className="eyebrow">
          Today
        </h2>
        {tasks.length > 0 && !hideNumbers && (
          <span className={styles.sectionMeta}>
            {open} to go
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className={styles.empty}>{gentle ? COPY.todayEmptyGentle : COPY.todayEmpty}</p>
      ) : (
        <ul className={taskStyles.taskList}>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} date={date} onScheduleNext={onScheduleNext} showContext />
          ))}
        </ul>
      )}
    </section>
  );
}
