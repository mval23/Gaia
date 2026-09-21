import type { Task } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoriesInGroup, recentCategoryId, sortedGroups } from '../../store/selectors';
import { useGoalEditor, useHabitEditor } from '../../hooks/useSheetParam';
import { paint } from '../../lib/swatch';
import { Menu, type MenuEntry } from '../ui/Menu';
import styles from './tasks.module.css';

/** One menu per line: which category it belongs to, or whether it is really a habit or a goal. */
export function SortMenu({ task }: { task: Task }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const { openHabit } = useHabitEditor();
  const { openGoal } = useGoalEditor();
  const habitCategoryId = recentCategoryId(state);

  const categoryItems: MenuEntry[] = sortedGroups(state).flatMap((group) => {
    const cats = categoriesInGroup(state, group.id);
    if (cats.length === 0) return [];
    return [
      { kind: 'heading' as const, label: group.name },
      ...cats.map((cat) => ({
        label: cat.name,
        swatch: paint(cat.color),
        onSelect: () => {
          dispatch({ type: 'task/update', id: task.id, patch: { categoryId: cat.id } });
          announce(`${task.title} is in ${group.name} · ${cat.name}`);
        },
      })),
    ];
  });

  const items: MenuEntry[] = [
    ...categoryItems,
    ...(categoryItems.length > 0 ? [{ kind: 'separator' as const }] : []),
    {
      label: 'Make it a habit…',
      icon: 'rhythm',
      disabled: !habitCategoryId,
      onSelect: () => {
        if (!habitCategoryId) return;
        const id = uid('h');
        dispatch({ type: 'habit/add', id, categoryId: habitCategoryId, title: task.title });
        dispatch({ type: 'task/delete', id: task.id });
        openHabit(id);
      },
    },
    {
      label: 'Make it a goal…',
      icon: 'goal',
      onSelect: () => {
        const id = uid('goal');
        dispatch({ type: 'goal/add', id, title: task.title, kind: 'ongoing' });
        dispatch({ type: 'task/delete', id: task.id });
        openGoal(id);
      },
    },
  ];

  return (
    <Menu
      label={`Sort “${task.title}”`}
      items={items}
      triggerClassName={styles.sortButton}
      trigger={<span>Sort</span>}
    />
  );
}
