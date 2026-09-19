import type { Habit, IfThen, Rhythm } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { useHabitEditor } from '../../hooks/useSheetParam';
import {
  categoriesInGroup,
  categoryById,
  groupById,
  sortedGroups,
  totalCount,
} from '../../store/selectors';
import { rhythmLabel } from '../../lib/rhythm';
import { formatClock } from '../../lib/time';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { Icon } from '../ui/Icon';
import { SheetRow, SheetShell } from './SheetShell';
import ui from '../ui/ui.module.css';
import styles from './sheet.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIMES = Array.from({ length: 96 }, (_, i) => i * 15);

export function HabitEditorSheet() {
  const { state } = useGaia();
  const { habitId, closeHabit } = useHabitEditor();
  const habit = habitId ? state.habits.find((h) => h.id === habitId) : undefined;

  if (!habitId || !habit) return null;
  return <Sheet key={habit.id} habit={habit} onClose={closeHabit} />;
}

function Sheet({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const category = categoryById(state, habit.categoryId);
  const group = category ? groupById(state, category.groupId) : undefined;
  const total = totalCount(state, habit.id);

  const patch = (p: Partial<Omit<Habit, 'id' | 'createdAt'>>) =>
    dispatch({ type: 'habit/update', id: habit.id, patch: p });

  const toggleDay = (day: number) => {
    const days = habit.rhythm.type === 'daysOfWeek' ? habit.rhythm.days : [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    // Keep at least one day, so a rhythm never becomes impossible to meet.
    patch({ rhythm: { type: 'daysOfWeek', days: next.length ? next : days } });
  };

  // One empty pair is offered until the first plan is written.
  const plans: IfThen[] = habit.ifThen?.length ? habit.ifThen : [{ when: '', then: '' }];
  const setPlan = (index: number, part: keyof IfThen, value: string) =>
    patch({ ifThen: plans.map((p, i) => (i === index ? { ...p, [part]: value } : p)) });
  const removePlan = (index: number) => patch({ ifThen: plans.filter((_, i) => i !== index) });
  const addPlan = () => patch({ ifThen: [...plans, { when: '', then: '' }] });

  const setRhythmType = (type: Rhythm['type']) =>
    patch({
      rhythm: type === 'daysOfWeek' ? { type: 'daysOfWeek', days: [1, 3, 5] } : { type: 'timesPerWeek', times: 3 },
    });

  return (
    <SheetShell
      label={`Edit ${habit.title}`}
      eyebrow={group && category ? `${group.name} · ${category.name}` : 'Habit'}
      title={habit.title}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={ui.secondaryButton}
            onClick={() => {
              const resting = habit.status !== 'active';
              patch({ status: resting ? 'active' : 'paused' });
              announce(resting ? `${habit.title} is active again` : `${habit.title} is resting. Its history stays.`);
            }}
          >
            {habit.status === 'active' ? 'Let it rest' : 'Start again'}
          </button>
          <span className={styles.footSpacer} />
          <button
            type="button"
            className={`${ui.iconButton} ${ui.iconButtonSm}`}
            aria-label={`Delete ${habit.title}`}
            onClick={() => {
              const previous = state;
              dispatch({ type: 'habit/delete', id: habit.id });
              notify(`“${habit.title}” deleted, along with its history`, previous);
              onClose();
            }}
          >
            <Icon name="trash" size={17} />
          </button>
        </>
      }
    >
      <SheetRow label="Habit" htmlFor="habit-title">
        <textarea
          id="habit-title"
          className={`field ${styles.titleInput}`}
          rows={1}
          value={habit.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </SheetRow>

      <SheetRow label="How often" hint="How often feels realistic right now? You can change this anytime.">
        <SegmentedControl
          label="Rhythm type"
          size="sm"
          options={[
            { value: 'timesPerWeek', label: 'Times a week' },
            { value: 'daysOfWeek', label: 'Certain days' },
          ]}
          value={habit.rhythm.type}
          onChange={setRhythmType}
        />
        {habit.rhythm.type === 'timesPerWeek' ? (
          <Select
            aria-label="Times a week"
            value={String(habit.rhythm.times)}
            onChange={(e) => patch({ rhythm: { type: 'timesPerWeek', times: Number(e.target.value) } })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                about {n} {n === 1 ? 'time' : 'times'} a week
              </option>
            ))}
          </Select>
        ) : (
          <div className={styles.days}>
            {DAY_NAMES.map((name, day) => (
              <button
                key={name}
                type="button"
                className={styles.dayToggle}
                aria-pressed={habit.rhythm.type === 'daysOfWeek' && habit.rhythm.days.includes(day)}
                aria-label={name}
                onClick={() => toggleDay(day)}
              >
                {name.slice(0, 1)}
              </button>
            ))}
          </div>
        )}
      </SheetRow>

      <SheetRow
        label="When"
        htmlFor="habit-cue"
        hint="When will this happen? Try linking it to something you already do, like after coffee or when you get home."
      >
        <input
          id="habit-cue"
          className="field"
          placeholder="After I finish lunch"
          value={habit.cue ?? ''}
          onChange={(e) => patch({ cue: e.target.value })}
        />
      </SheetRow>

      <SheetRow
        label="Tiny version"
        htmlFor="habit-tiny"
        hint="What’s the smallest version that still counts? On hard days, this is enough."
      >
        <input
          id="habit-tiny"
          className="field"
          placeholder="Step outside for two minutes"
          value={habit.tinyVersion ?? ''}
          onChange={(e) => patch({ tinyVersion: e.target.value })}
        />
      </SheetRow>

      <SheetRow label="Time of day" hint="Appears on the timeline as a suggestion, not a commitment.">
        <Select
          aria-label="Preferred time"
          value={habit.preferredStartMin === undefined ? '' : String(habit.preferredStartMin)}
          onChange={(e) => patch({ preferredStartMin: e.target.value === '' ? undefined : Number(e.target.value) })}
        >
          <option value="">No particular time</option>
          {TIMES.map((min) => (
            <option key={min} value={min}>
              {formatClock(min, state.settings.timeFormat)}
            </option>
          ))}
        </Select>
      </SheetRow>

      <div className={styles.groupHead}>
        <h3 className={styles.groupTitle}>Why it matters, and what helps</h3>
        <span className={styles.groupNote}>all optional</span>
      </div>

      <SheetRow label="Why" htmlFor="habit-why" hint="Only you see this. It shows under the habit on gentle days.">
        <textarea
          id="habit-why"
          className={`field ${styles.textarea} ${styles.whyInput}`}
          rows={2}
          placeholder="So my body has somewhere to put the day"
          value={habit.why ?? ''}
          onChange={(e) => patch({ why: e.target.value })}
        />
      </SheetRow>

      <SheetRow
        label="If–then"
        hint="What usually gets in the way, and what you’ll do then. A plan like this makes a habit easier to keep."
      >
        <ul className={styles.plans}>
          {plans.map((plan, i) => (
            <li key={i} className={styles.plan}>
              <input
                className="field"
                aria-label={`If, plan ${i + 1}`}
                placeholder="If it rains"
                value={plan.when}
                onChange={(e) => setPlan(i, 'when', e.target.value)}
              />
              <Icon name="arrowRight" size={16} className={styles.planArrow} />
              <input
                className="field"
                aria-label={`Then, plan ${i + 1}`}
                placeholder="then I walk the stairs"
                value={plan.then}
                onChange={(e) => setPlan(i, 'then', e.target.value)}
              />
              {habit.ifThen?.length ? (
                <button
                  type="button"
                  className={`${ui.iconButton} ${ui.iconButtonSm}`}
                  aria-label={`Remove plan ${i + 1}`}
                  onClick={() => removePlan(i)}
                >
                  <Icon name="close" size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {habit.ifThen?.length ? (
          <button type="button" className={`${ui.textButton} ${styles.addPlan}`} onClick={addPlan}>
            <Icon name="plus" size={14} />
            Add another
          </button>
        ) : null}
      </SheetRow>

      <SheetRow
        label="Coming back"
        htmlFor="habit-back"
        hint="What helps you pick it up again after a pause. After a few quiet days, Gaia shows this instead of anything about the gap."
      >
        <input
          id="habit-back"
          className="field"
          placeholder="After a quiet week, I start with the tiny version"
          value={habit.comingBack ?? ''}
          onChange={(e) => patch({ comingBack: e.target.value })}
        />
      </SheetRow>

      <SheetRow label="Lives in">
        <Select aria-label="Category" value={habit.categoryId} onChange={(e) => patch({ categoryId: e.target.value })}>
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

      <SheetRow label="Supports">
        <Select
          aria-label="Goal"
          value={habit.goalId ?? ''}
          onChange={(e) => patch({ goalId: e.target.value || undefined })}
        >
          <option value="">Nothing in particular</option>
          {state.goals
            .filter((g) => g.status === 'active' || g.id === habit.goalId)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
        </Select>
      </SheetRow>

      <p className={styles.note}>
        {rhythmLabel(habit.rhythm)}
        {total > 0 && !state.settings.hideNumbers ? ` · ${total} logged so far` : ''}
        {habit.status !== 'active' ? ' · resting for now' : ''}
      </p>
    </SheetShell>
  );
}
