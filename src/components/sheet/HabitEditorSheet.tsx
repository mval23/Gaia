import type { Habit, Rhythm } from '../../types';
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
              announce(resting ? `${habit.title} is active again` : `${habit.title} is resting`);
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

      <SheetRow label="How often" hint="You can change this whenever it stops fitting.">
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
        hint="Linking it to something you already do makes it easier to remember."
      >
        <input
          id="habit-cue"
          className="field"
          placeholder="After I finish lunch"
          value={habit.cue ?? ''}
          onChange={(e) => patch({ cue: e.target.value })}
        />
      </SheetRow>

      <SheetRow label="Tiny version" htmlFor="habit-tiny" hint="On hard days, this is enough.">
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
