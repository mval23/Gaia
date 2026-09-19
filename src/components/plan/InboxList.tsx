import type { Capture } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoryById, groupById, recentCategoryId } from '../../store/selectors';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { useGoalEditor, useHabitEditor } from '../../hooks/useSheetParam';
import { COPY } from '../../lib/copy';
import { todayISO } from '../../lib/dates';
import { Icon } from '../ui/Icon';
import { Menu, type MenuEntry } from '../ui/Menu';
import styles from './plan.module.css';

/**
 * What was kept with Capture, waiting to be sorted. Nothing here ages: no
 * dates, no growing count in a warning colour. Sorting is one menu per line.
 */
export function InboxList({ date, hideNumbers }: { date: string; hideNumbers: boolean }) {
  const { state } = useGaia();
  if (state.captures.length === 0) return null;

  return (
    <div className={styles.inbox} role="group" aria-labelledby="inbox-title">
      <p id="inbox-title" className={styles.inboxHead}>
        <Icon name="inbox" size={15} />
        <span className="eyebrow">Inbox</span>
        <span className={styles.sectionMeta}>
          {hideNumbers ? COPY.inboxNote : `${state.captures.length} ${COPY.inboxNote}`}
        </span>
      </p>
      <ul className={styles.inboxList}>
        {state.captures.map((capture) => (
          <InboxRow key={capture.id} capture={capture} date={date} />
        ))}
      </ul>
    </div>
  );
}

function InboxRow({ capture, date }: { capture: Capture; date: string }) {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { openTask } = useTaskEditor();
  const { openHabit } = useHabitEditor();
  const { openGoal } = useGoalEditor();
  const categoryId = recentCategoryId(state);

  const remove = () => dispatch({ type: 'capture/remove', id: capture.id });

  const addTask = () => {
    if (!categoryId) return undefined;
    const id = uid('t');
    dispatch({ type: 'task/add', id, categoryId, title: capture.text });
    remove();
    return id;
  };

  const items: MenuEntry[] = [
    {
      label: date === todayISO() ? 'Plan it for today' : 'Plan it for this day',
      icon: 'plan',
      disabled: !categoryId,
      onSelect: () => {
        const previous = state;
        const id = addTask();
        if (!id) return;
        dispatch({ type: 'task/plan', id, date });
        const category = categoryById(state, categoryId);
        const group = category ? groupById(state, category.groupId) : undefined;
        const place = category ? `, in ${group ? `${group.name} · ` : ''}${category.name}` : '';
        notify(`“${capture.text}” is on the list${place}`, previous);
      },
    },
    {
      label: 'Make it a task…',
      icon: 'check',
      disabled: !categoryId,
      onSelect: () => {
        const id = addTask();
        if (id) openTask(id);
      },
    },
    { kind: 'separator' },
    {
      label: 'Make it a habit…',
      icon: 'rhythm',
      disabled: !categoryId,
      onSelect: () => {
        if (!categoryId) return;
        const id = uid('h');
        dispatch({ type: 'habit/add', id, categoryId, title: capture.text });
        remove();
        openHabit(id);
      },
    },
    {
      label: 'Make it a goal…',
      icon: 'goal',
      onSelect: () => {
        const id = uid('goal');
        dispatch({ type: 'goal/add', id, title: capture.text, kind: 'ongoing' });
        remove();
        openGoal(id);
      },
    },
    { kind: 'separator' },
    {
      label: 'Let it go',
      icon: 'unschedule',
      onSelect: () => {
        const previous = state;
        remove();
        notify('Let go.', previous);
      },
    },
  ];

  return (
    <li className={styles.inboxRow}>
      <span className={styles.inboxText}>{capture.text}</span>
      <Menu
        label={`Sort “${capture.text}”`}
        items={items}
        triggerClassName={styles.sortButton}
        trigger={<span>Sort</span>}
      />
    </li>
  );
}
