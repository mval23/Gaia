import type { Goal } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { useGoalEditor, useHabitEditor } from '../../hooks/useSheetParam';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import {
  categoriesInGroup,
  goalActivity,
  habitsForGoal,
  sortedGroups,
  tasksForGoal,
} from '../../store/selectors';
import { todayISO } from '../../lib/dates';
import { BODY_NOTE, mentionsBodyOrFood } from '../../lib/sensitive';
import { Link } from 'react-router-dom';
import { Menu } from '../ui/Menu';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';
import { SheetRow, SheetShell } from './SheetShell';
import ui from '../ui/ui.module.css';
import styles from './sheet.module.css';

const STATUS_WORD: Record<Goal['status'], string> = {
  active: 'Goal',
  paused: 'Resting',
  completed: 'Finished',
  released: 'Let go',
};

export function GoalEditorSheet() {
  const { state } = useGaia();
  const { goalId, closeGoal } = useGoalEditor();
  const goal = goalId ? state.goals.find((g) => g.id === goalId) : undefined;

  if (!goalId || !goal) return null;
  return <Sheet key={goal.id} goal={goal} onClose={closeGoal} />;
}

function Sheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { openHabit } = useHabitEditor();
  const { openTask } = useTaskEditor();
  const today = todayISO();
  const habits = habitsForGoal(state, goal.id);
  const tasks = tasksForGoal(state, goal.id);
  const activity = goalActivity(state, goal, today);
  const closed = goal.status === 'completed' || goal.status === 'released';

  const patch = (p: Partial<Omit<Goal, 'id' | 'createdAt' | 'status' | 'closedAt'>>) =>
    dispatch({ type: 'goal/update', id: goal.id, patch: p });

  const setStatus = (status: Goal['status'], archiveHabits?: boolean, said?: string) => {
    dispatch({ type: 'goal/setStatus', id: goal.id, status, archiveHabits });
    announce(said ?? `${goal.title}: ${STATUS_WORD[status].toLowerCase()}`);
  };

  return (
    <SheetShell
      label={`Edit ${goal.title}`}
      eyebrow={STATUS_WORD[goal.status]}
      title={goal.title}
      onClose={onClose}
      footer={
        <>
          {goal.status === 'active' && (
            <button
              type="button"
              className={ui.secondaryButton}
              onClick={() => setStatus('paused', false, `${goal.title} is resting. Its habits rest too. Nothing is lost.`)}
            >
              Let it rest
            </button>
          )}
          {goal.status !== 'active' && (
            <button
              type="button"
              className={ui.secondaryButton}
              onClick={() => setStatus('active', false, `${goal.title} is active again`)}
            >
              Pick it up again
            </button>
          )}
          <Menu
            label="Close this goal"
            align="start"
            trigger={<span className={ui.pillButton}>Close it…</span>}
            items={[
              { kind: 'heading', label: 'Finished it' },
              {
                label: 'Finished, keep its habits',
                icon: 'check',
                onSelect: () => setStatus('completed', false, `You finished ${goal.title}. Want to note what helped?`),
              },
              {
                label: 'Finished, archive its habits',
                icon: 'check',
                onSelect: () => setStatus('completed', true, `You finished ${goal.title}. Want to note what helped?`),
              },
              { kind: 'separator' },
              { kind: 'heading', label: 'Not for now' },
              {
                label: 'Let this goal go',
                icon: 'unschedule',
                onSelect: () =>
                  setStatus('released', true, `Let go. ${goal.title} stays in your history. Thank you for being honest with yourself.`),
              },
            ]}
          />
          <span className={styles.footSpacer} />
          <button
            type="button"
            className={`${ui.iconButton} ${ui.iconButtonSm}`}
            aria-label={`Delete ${goal.title}`}
            onClick={() => {
              const previous = state;
              dispatch({ type: 'goal/delete', id: goal.id });
              notify(`“${goal.title}” deleted. Its habits and tasks stayed.`, previous);
              onClose();
            }}
          >
            <Icon name="trash" size={17} />
          </button>
        </>
      }
    >
      <SheetRow label="Goal" htmlFor="goal-title">
        <textarea
          id="goal-title"
          className={`field ${styles.titleInput}`}
          rows={2}
          value={goal.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </SheetRow>

      {mentionsBodyOrFood(goal.title) && (
        <p className={styles.note}>
          {BODY_NOTE} <Link to="/support">Support</Link>
        </p>
      )}

      <SheetRow label="Kind">
        <SegmentedControl
          label="Kind of goal"
          size="sm"
          options={[
            { value: 'ongoing', label: 'A direction' },
            { value: 'finish', label: 'Something to finish' },
          ]}
          value={goal.kind}
          onChange={(kind) => patch({ kind })}
        />
      </SheetRow>

      <SheetRow label="Why" htmlFor="goal-why" hint="Optional, and only you see this. It comes back when you finish.">
        <textarea
          id="goal-why"
          className={`field ${styles.textarea}`}
          placeholder="Why does this matter to you?"
          value={goal.why ?? ''}
          onChange={(e) => patch({ why: e.target.value })}
        />
      </SheetRow>

      {goal.kind === 'finish' && (
        <SheetRow label="Done looks like" htmlFor="goal-done">
          <input
            id="goal-done"
            className="field"
            placeholder="Final exam passed"
            value={goal.doneLooksLike ?? ''}
            onChange={(e) => patch({ doneLooksLike: e.target.value })}
          />
        </SheetRow>
      )}

      <SheetRow label="By around" htmlFor="goal-season" hint="A soft horizon, not a deadline. Nothing happens if it passes.">
        <input
          id="goal-season"
          type="date"
          className="field"
          value={goal.season?.end ?? ''}
          onChange={(e) => patch({ season: { ...goal.season, end: e.target.value || undefined } })}
        />
      </SheetRow>

      <SheetRow
        label="Something to count"
        hint="Only for goals you can really count: chapters, sessions, savings. Gaia shows the count as it is, never as a percentage."
      >
        <label className={styles.checkLine}>
          <input
            type="checkbox"
            checked={!!goal.milestone}
            onChange={(e) =>
              patch({ milestone: e.target.checked ? { target: 10, current: 0, unit: '' } : undefined })
            }
          />
          Count toward a number
        </label>
        {goal.milestone && (
          <div className={styles.milestoneFields}>
            <label className={styles.miniField}>
              <span>How many</span>
              <input
                type="number"
                min={1}
                className="field"
                value={goal.milestone.target}
                onChange={(e) => patch({ milestone: { ...goal.milestone!, target: Number(e.target.value) } })}
              />
            </label>
            <label className={styles.miniField}>
              <span>Of what</span>
              <input
                className="field"
                placeholder="sections drafted"
                value={goal.milestone.unit ?? ''}
                onChange={(e) => patch({ milestone: { ...goal.milestone!, unit: e.target.value } })}
              />
            </label>
            <label className={styles.miniField}>
              <span>So far</span>
              <input
                type="number"
                min={0}
                max={goal.milestone.target}
                className="field"
                value={goal.milestone.current}
                onChange={(e) => patch({ milestone: { ...goal.milestone!, current: Number(e.target.value) } })}
              />
            </label>
          </div>
        )}
      </SheetRow>

      <SheetRow label="Lives in" hint="A goal borrows a category's colour. It can stay unattached.">
        <Select
          aria-label="Category"
          value={goal.categoryId ?? ''}
          onChange={(e) => patch({ categoryId: e.target.value || undefined })}
        >
          <option value="">Nowhere in particular</option>
          {sortedGroups(state).map((g) => (
            <optgroup key={g.id} label={g.name}>
              {categoriesInGroup(state, g.id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </SheetRow>

      {closed && (
        <SheetRow label="Closing note" htmlFor="goal-note" hint={goal.status === 'completed' ? 'What helped? Anything you’d like to remember from it.' : 'Anything you’d like to remember from it?'}>
          <textarea
            id="goal-note"
            className={`field ${styles.textarea}`}
            value={goal.closingNote ?? ''}
            onChange={(e) => patch({ closingNote: e.target.value })}
          />
        </SheetRow>
      )}

      <div className={styles.note}>
        {!state.settings.hideNumbers && (
          <p className={styles.activity}>
            {activity.steps} {activity.steps === 1 ? 'step' : 'steps'} taken · active {activity.activeDays} of the last{' '}
            {activity.windowDays} days
          </p>
        )}
        {habits.length > 0 && (
          <ul className={styles.linked}>
            {habits.map((h) => (
              <li key={h.id}>
                <Icon name="rhythm" size={15} />
                <button type="button" className={ui.textButton} onClick={() => openHabit(h.id)}>
                  {h.title}
                </button>
                {h.status !== 'active' && <span>· resting</span>}
              </li>
            ))}
          </ul>
        )}
        {tasks.length > 0 && (
          <ul className={styles.linked}>
            {tasks.map((t) => (
              <li key={t.id}>
                <Icon name="check" size={15} />
                <button type="button" className={ui.textButton} onClick={() => openTask(t.id)}>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        {habits.length === 0 && tasks.length === 0 && (
          <p className={styles.activity}>Nothing attached yet, and that is fine. Naming it is enough for now. When you’re ready, what’s one small way to begin?</p>
        )}
      </div>
    </SheetShell>
  );
}
