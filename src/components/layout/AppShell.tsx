import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TaskEditorSheet } from '../sheet/TaskEditorSheet';
import { GoalEditorSheet } from '../sheet/GoalEditorSheet';
import { HabitEditorSheet } from '../sheet/HabitEditorSheet';
import { DragProvider } from '../../dnd/DragProvider';
import { CaptureProvider } from '../capture/CaptureProvider';
import { WalkProvider } from '../walk/WalkProvider';
import { WalkGuide } from '../walk/WalkGuide';
import { BlockHelp } from '../timeline/TimeBlock';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <DragProvider>
      <CaptureProvider>
        <WalkProvider>
          <a href="#main" className={styles.skipLink}>
            Skip to content
          </a>
          <div className={styles.shell}>
            <Sidebar />
            <main id="main" className={styles.main} tabIndex={-1}>
              <Outlet />
            </main>
          </div>
          <TaskEditorSheet />
          <GoalEditorSheet />
          <HabitEditorSheet />
          <BlockHelp />
          <WalkGuide />
        </WalkProvider>
      </CaptureProvider>
    </DragProvider>
  );
}
