import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
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
      <TopNav />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <TaskEditorSheet />
      <BlockHelp />
    </DragProvider>
  );
}
