import { NavLink, Outlet } from 'react-router-dom';
import { MonetAccent } from '../../components/art/MonetAccent';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

const TABS = [
  { to: '/manage/tasks', label: 'Tasks' },
  { to: '/manage/groups', label: 'Groups & categories' },
];

export function ManageLayout() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Manage</p>
          <h1 className={styles.title}>Where everything lives</h1>
        </div>
        <MonetAccent art="lilies" variant="strip" fill phrase="everything has a place" className={styles.accent} />
      </header>
      {/* NavLink sets aria-current="page" on the tab you are on. */}
      <nav aria-label="Manage sections" className={`${ui.segmented} ${styles.tabs}`}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `${ui.segment} ${isActive ? ui.segmentSelected : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
