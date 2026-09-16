import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MonetAccent } from '../../components/art/MonetAccent';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

const TABS = [
  { to: '/manage/tasks', label: 'Tasks' },
  { to: '/manage/categories', label: 'Categories' },
  { to: '/manage/groups', label: 'Groups' },
];

export function ManageLayout() {
  const { pathname } = useLocation();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Manage</h1>
        <nav aria-label="Manage sections" className={`${ui.segmented} ${styles.tabs}`}>
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.to);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`${ui.segment} ${active ? ui.segmentSelected : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
        <MonetAccent art="lilies" variant="strip" fill phrase="everything has a place" className={styles.accent} />
      </header>
      <Outlet />
    </div>
  );
}
