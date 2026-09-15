import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { Menu } from '../ui/Menu';
import { SearchPalette } from './SearchPalette';
import { SettingsPanel } from './SettingsPanel';
import { useNavigate } from 'react-router-dom';
import logoMark from '../../assets/brand/gaia-logo.webp';
import styles from './TopNav.module.css';

const NAV: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { to: '/', label: 'Plan', icon: 'plan', match: (p) => p === '/' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar', match: (p) => p.startsWith('/calendar') },
  { to: '/manage/tasks', label: 'Manage', icon: 'manage', match: (p) => p.startsWith('/manage') },
];

export function Logo() {
  return <img className={styles.logoMark} src={logoMark} width={144} height={144} alt="" aria-hidden="true" />;
}

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobilePanelId = useId();
  const active = NAV.find((n) => n.match(location.pathname));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [mobileOpen]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.bar}>
        <NavLink to="/" className={styles.brand} aria-label="Gaia, go to Plan">
          <Logo />
          <span className={styles.wordmark}>Gaia</span>
        </NavLink>

        {active && (
          <span className={styles.mobileCurrent} aria-hidden="true">
            {active.label}
          </span>
        )}

        <nav aria-label="Primary" className={styles.nav}>
          <ul className={styles.navList}>
            {NAV.map((item) => {
              const isActive = item.match(location.pathname);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.spacer} />

        <div className={styles.globals}>
          <button type="button" className={styles.search} onClick={() => setSearchOpen(true)} aria-label="Search tasks">
            <Icon name="search" size={17} />
            <span className={styles.searchLabel}>Search</span>
            <kbd className={styles.kbd}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <button
            ref={settingsRef}
            type="button"
            className={`${styles.iconBtn} ${styles.desktopOnly}`}
            aria-label="Settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <Icon name="settings" size={18} />
          </button>
          <span className={styles.desktopOnly}>
            <ProfileButton onManage={() => navigate('/manage/groups')} />
          </span>
          <button
            ref={menuButtonRef}
            type="button"
            className={`${styles.iconBtn} ${styles.mobileOnly}`}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls={mobilePanelId}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id={mobilePanelId} className={styles.mobilePanel}>
          <nav aria-label="Primary">
            <ul>
              {NAV.map((item) => {
                const isActive = item.match(location.pathname);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={`${styles.mobileLink} ${isActive ? styles.navLinkActive : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon name={item.icon} size={19} />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className={styles.mobileSettings}>
            <p className="eyebrow">Settings</p>
            <SettingsPanel />
          </div>
        </div>
      )}

      <Popover
        anchorRef={settingsRef}
        open={settingsOpen}
        onClose={(reason) => {
          setSettingsOpen(false);
          if (reason === 'escape') settingsRef.current?.focus();
        }}
        label="Settings"
        width={300}
      >
        <SettingsPanel />
      </Popover>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function ProfileButton({ onManage }: { onManage: () => void }) {
  return (
    <Menu
      label="Profile"
      icon="user"
      triggerClassName={styles.avatar}
      items={[
        { kind: 'heading', label: 'Your planner · saved on this device' },
        { label: 'Groups & categories', icon: 'folder', onSelect: onManage },
      ]}
    />
  );
}
