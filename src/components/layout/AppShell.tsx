import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TaskEditorSheet } from '../sheet/TaskEditorSheet';
import { DragProvider } from '../../dnd/DragProvider';
import { BlockHelp } from '../timeline/TimeBlock';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <DragProvider>
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
      <BlockHelp />
    </DragProvider>
  );
}
