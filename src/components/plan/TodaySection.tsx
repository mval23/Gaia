import type { Task } from '../../types';
import { COPY } from '../../lib/copy';
import { formatShortDate, todayISO } from '../../lib/dates';
import { Icon } from '../ui/Icon';
import { TaskRow } from '../tasks/TaskRow';
import { InlineAddTask } from '../tasks/InlineAddTask';
import styles from './plan.module.css';
import taskStyles from '../tasks/tasks.module.css';

interface Props {
  /** "The one that matters" on this day, drawn first and larger. */
  essential?: Task;
  tasks: Task[];
  date: string;
  gentle: boolean;
  hideNumbers: boolean;
  onScheduleNext: (task: Task) => void;
}

/** What the person chose for this day, plus anything already on the timeline. */
export function TodaySection({ essential, tasks, date, gentle, hideNumbers, onScheduleNext }: Props) {
  const all = essential ? [essential, ...tasks] : tasks;
  const open = all.filter((t) => t.status === 'open').length;
  // Only a hint, and only when there is a real choice to make.
  const offerChoice = !essential && !gentle && tasks.filter((t) => t.status === 'open').length >= 2;

  return (
    <section className={styles.section} aria-labelledby="today-title">
      <div className={styles.sectionHead}>
        <h2 id="today-title" className="eyebrow">
          Today
        </h2>
        {all.length > 0 && !hideNumbers && <span className={styles.sectionMeta}>{open} to go</span>}
      </div>

      {essential && (
        <div className={styles.essential}>
          <p className={styles.essentialLabel}>
            <Icon name="star" size={14} className={styles.essentialStar} />
            {COPY.oneThatMatters}
          </p>
          <ul className={taskStyles.taskList}>
            <TaskRow task={essential} date={date} onScheduleNext={onScheduleNext} showContext essential />
          </ul>
        </div>
      )}

      {all.length === 0 ? (
        <p className={styles.empty}>{gentle ? COPY.todayEmptyGentle : COPY.todayEmpty}</p>
      ) : (
        tasks.length > 0 && (
          <ul className={taskStyles.taskList}>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} date={date} onScheduleNext={onScheduleNext} showContext />
            ))}
          </ul>
        )
      )}

      {/* No category needed: it can be sorted later from the Inbox, or never. */}
      <InlineAddTask
        id="today-add"
        plannedFor={date}
        placeName={date === todayISO() ? 'today’s list' : `the list for ${formatShortDate(date)}`}
      />

      {offerChoice && <p className={styles.hintLine}>{COPY.chooseOne}</p>}
    </section>
  );
}
