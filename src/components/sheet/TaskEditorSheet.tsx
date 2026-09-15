import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import type { Priority, Schedule, Task, TimeBlock } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { blocksOn, categoriesInGroup, categoryById, groupOfTask, sortedGroups } from '../../store/selectors';
import { findFreeSlot } from '../../lib/layout';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatShortDate, isValidISODate, todayISO } from '../../lib/dates';
import { DAY_MIN, formatClock, formatDuration, formatRange, nowMinutes } from '../../lib/time';
import { Icon, type IconName } from '../ui/Icon';
import { Select } from '../ui/Select';
import { SegmentedControl } from '../ui/SegmentedControl';
import ui from '../ui/ui.module.css';
import styles from './TaskEditorSheet.module.css';

const STARTS = Array.from({ length: 96 }, (_, i) => i * 15);
const LENGTHS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];

export function TaskEditorSheet() {
  const { state } = useGaia();
  const { taskId, closeTask } = useTaskEditor();
  const task = taskId ? state.tasks.find((t) => t.id === taskId) : undefined;

  useEffect(() => {
    if (taskId && !task) closeTask();
  }, [taskId, task, closeTask]);

  if (!task) return null;
  return <Sheet key={task.id} task={task} onClose={closeTask} />;
}

function Row({ icon, label, htmlFor, children }: { icon: IconName; label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>
        <Icon name={icon} size={17} />
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
      </span>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

function Sheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const [params] = useSearchParams();
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useFocusTrap(sheetRef, true);

  const category = categoryById(state, task.categoryId);
  const group = groupOfTask(state, task);
  const fmt = state.settings.timeFormat;
  const done = task.status === 'done';
  const blocks = task.blocks;
  const totalMin = blocks.reduce((n, b) => n + b.durationMin, 0);
  const pageDate = params.get('date');
  const fallbackDate = isValidISODate(pageDate) ? pageDate : todayISO();

  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch = (p: Partial<Omit<Task, 'blocks'>>) => dispatch({ type: 'task/update', id: task.id, patch: p });

  const updateBlock = (b: TimeBlock, change: Partial<Schedule>) =>
    dispatch({
      type: 'block/update',
      taskId: task.id,
      blockId: b.id,
      schedule: { date: b.date, startMin: b.startMin, durationMin: b.durationMin, ...change },
    });

  // New sessions go into the first free hour of the day being viewed.
  const addSession = () => {
    const busy = blocksOn(state, fallbackDate).map(({ block }) => block);
    const dayStart = state.settings.dayStartHour * 60;
    const from = fallbackDate === todayISO() ? Math.max(dayStart, nowMinutes()) : dayStart;
    const start =
      findFreeSlot(busy, 60, from, state.settings.dayEndHour * 60) ??
      findFreeSlot(busy, 60, dayStart, state.settings.dayEndHour * 60) ??
      9 * 60;
    dispatch({ type: 'block/add', taskId: task.id, block: { id: uid('b'), date: fallbackDate, startMin: start, durationMin: 60 } });
  };

  return createPortal(
    <div className={styles.layer}>
      <div className={styles.scrim} onPointerDown={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title-label"
      >
        <div className={styles.head}>
          <p className={styles.crumb}>
            <span className={styles.crumbDot} style={{ background: category?.color }} aria-hidden="true" />
            {group?.name} · {category?.name}
          </p>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close editor">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <label id="editor-title-label" htmlFor="editor-title" className="visually-hidden">
            Task name
          </label>
          <textarea
            id="editor-title"
            ref={titleRef}
            className={`${styles.title} ${done ? styles.titleDone : ''}`}
            value={task.title}
            rows={1}
            onChange={(e) => patch({ title: e.target.value.replace(/\n/g, ' ') })}
            onBlur={(e) => {
              if (!e.target.value.trim()) patch({ title: 'Untitled task' });
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />

          <Row icon="folder" label="Category" htmlFor="editor-category">
            <Select
              id="editor-category"
              value={task.categoryId}
              onChange={(e) => patch({ categoryId: e.target.value })}
              wrapClassName={styles.full}
            >
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
          </Row>

          <Row icon="calendar" label="Due" htmlFor="editor-due">
            <input
              id="editor-due"
              type="date"
              className="field"
              value={task.due ?? ''}
              onChange={(e) => patch({ due: e.target.value || undefined })}
            />
          </Row>

          <section className={styles.sessions} aria-labelledby="editor-sessions-label">
            <div className={styles.sessionsHead}>
              <span className={styles.rowLabel}>
                <Icon name="schedule" size={17} />
                <span id="editor-sessions-label">
                  Sessions{blocks.length > 0 && <span className={styles.sessionCount}> · {blocks.length}</span>}
                </span>
              </span>
              <button type="button" className={ui.textButton} onClick={addSession}>
                <Icon name="plus" size={15} />
                Add session
              </button>
            </div>
            {blocks.length === 0 ? (
              <p className={styles.sessionsEmpty}>Not on the calendar yet. Drag the task onto a timeline, or add a session.</p>
            ) : (
              <ul className={styles.sessionList}>
                {blocks.map((b, i) => {
                  const lengths = LENGTHS.includes(b.durationMin) ? LENGTHS : [...LENGTHS, b.durationMin].sort((x, y) => x - y);
                  const n = i + 1;
                  return (
                    <li key={b.id} className={styles.session}>
                      <input
                        type="date"
                        className={`field ${styles.sessionField}`}
                        value={b.date}
                        aria-label={`Session ${n} date`}
                        onChange={(e) => e.target.value && updateBlock(b, { date: e.target.value })}
                      />
                      <Select
                        aria-label={`Session ${n} start`}
                        value={String(b.startMin)}
                        className={styles.sessionField}
                        onChange={(e) => updateBlock(b, { startMin: Number(e.target.value) })}
                      >
                        {STARTS.map((m) => (
                          <option key={m} value={m}>
                            {formatClock(m, fmt)}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label={`Session ${n} length`}
                        value={String(b.durationMin)}
                        className={styles.sessionField}
                        onChange={(e) =>
                          updateBlock(b, { durationMin: Math.min(Number(e.target.value), DAY_MIN - b.startMin) })
                        }
                      >
                        {lengths.map((m) => (
                          <option key={m} value={m}>
                            {formatDuration(m)}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        className={`${ui.iconButton} ${ui.iconButtonSm} ${styles.delete}`}
                        aria-label={`Remove session ${n}, ${formatShortDate(b.date)} ${formatRange(b.startMin, b.durationMin, fmt)}`}
                        onClick={() => dispatch({ type: 'block/remove', taskId: task.id, blockId: b.id })}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Row icon="flag" label="Priority">
            <SegmentedControl<Priority>
              size="sm"
              label="Priority"
              value={task.priority}
              options={[
                { value: 'low', label: 'Low', swatch: 'var(--priority-low)' },
                { value: 'medium', label: 'Medium', swatch: 'var(--priority-medium)' },
                { value: 'high', label: 'High', swatch: 'var(--priority-high)' },
              ]}
              onChange={(priority) => patch({ priority })}
            />
          </Row>

          <Row icon="note" label="Notes" htmlFor="editor-notes">
            <textarea
              id="editor-notes"
              className="field"
              placeholder="Add a note…"
              value={task.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Row>

          <p className={styles.readout}>
            {blocks.length
              ? `${blocks.length} ${blocks.length === 1 ? 'session' : 'sessions'} · ${formatDuration(totalMin)} planned`
              : 'Not on the calendar yet'}
            {done && ' · Completed'}
          </p>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={done ? ui.secondaryButton : ui.primaryButton}
            onClick={() => dispatch({ type: 'task/toggle', id: task.id })}
          >
            <Icon name="check" size={17} />
            {done ? 'Mark not done' : 'Complete'}
          </button>
          {blocks.length > 0 && (
            <button
              type="button"
              className={ui.secondaryButton}
              onClick={() => {
                const previous = state;
                dispatch({ type: 'task/unschedule', id: task.id });
                notify(`All sessions for “${task.title}” removed`, previous);
              }}
            >
              Clear schedule
            </button>
          )}
          <button
            type="button"
            className={`${ui.iconButton} ${styles.delete}`}
            aria-label="Delete task"
            onClick={() => {
              const previous = state;
              dispatch({ type: 'task/delete', id: task.id });
              notify(`“${task.title}” deleted`, previous);
            }}
          >
            <Icon name="trash" size={19} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
