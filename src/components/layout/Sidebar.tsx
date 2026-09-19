import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { Menu } from '../ui/Menu';
import { SearchPalette } from './SearchPalette';
import { MOBILE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import logoMark from '../../assets/brand/gaia-logo.webp';
import { MonetImage } from '../art/MonetAccent';
import { useAccount } from '../../auth/AuthGate';
import { CAPTURE_KEYS, useCapture } from '../capture/CaptureProvider';
import styles from './Sidebar.module.css';

const NAV: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { to: '/', label: 'Plan', icon: 'plan', match: (p) => p === '/' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar', match: (p) => p.startsWith('/calendar') },
  { to: '/goals', label: 'Goals & habits', icon: 'goal', match: (p) => p.startsWith('/goals') },
  { to: '/manage/tasks', label: 'Manage', icon: 'manage', match: (p) => p.startsWith('/manage') },
];

const STORAGE_KEY = 'gaia:ui:sidebar';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl ';

function readCollapsed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return raw === 'collapsed';
  } catch {
    // Non-essential preference.
  }
  // No saved choice yet: start as a rail on narrower screens to leave room for the planner.
  return typeof window !== 'undefined' && window.innerWidth < 1280;
}

function persistCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    // Non-essential preference.
  }
}

type Tip = { label: string; top: number; left: number };

/**
 * Primary navigation. Desktop: a glass sidebar that folds into an icon rail (⌘/Ctrl B).
 * Mobile: a compact top bar whose menu button opens the same sidebar as a drawer.
 */
export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const account = useAccount();
  const { openCapture } = useCapture();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [collapsedPref, setCollapsedPref] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const drawerId = useId();

  const collapsed = !isMobile && collapsedPref;
  const active = NAV.find((n) => n.match(location.pathname));

  const toggleCollapsed = useCallback(() => {
    setTip(null);
    setCollapsedPref((c) => {
      persistCollapsed(!c);
      return !c;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (key === 'b') {
        e.preventDefault();
        if (isMobile) setDrawerOpen((o) => !o);
        else toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, toggleCollapsed]);

  useEffect(() => setDrawerOpen(false), [location.pathname, isMobile]);
  useEffect(() => setTip(null), [collapsed, location.pathname]);

  useFocusTrap(asideRef, isMobile && drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => asideRef.current?.querySelector<HTMLElement>('a[href], button')?.focus());
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [drawerOpen]);

  /** Hover/focus labels for the icon rail, portalled so the panel's clipping never hides them. */
  const tipFor = (label: string) =>
    collapsed
      ? {
          onMouseEnter: (e: { currentTarget: HTMLElement }) => showTip(e.currentTarget, label),
          onFocus: (e: { currentTarget: HTMLElement }) => showTip(e.currentTarget, label),
          onMouseLeave: () => setTip(null),
          onBlur: () => setTip(null),
        }
      : {};

  const showTip = (el: HTMLElement, label: string) => {
    const r = el.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 12 });
  };

  const className = [
    styles.sidebar,
    collapsed ? styles.collapsed : '',
    isMobile && drawerOpen ? styles.open : '',
  ].join(' ');

  return (
    <>
      <header className={styles.mobileBar}>
        <div className={styles.mobileBarInner}>
          <NavLink to="/" className={styles.brand} aria-label="Gaia, go to Plan">
            <img className={styles.logoMark} src={logoMark} width={144} height={144} alt="" aria-hidden="true" />
            <span className={styles.wordmark}>Gaia</span>
          </NavLink>
          {active && (
            <span className={styles.mobileCurrent} aria-hidden="true">
              {active.label}
            </span>
          )}
          <div className={styles.spacer} />
          <button type="button" className={styles.headBtn} onClick={openCapture} aria-label="Capture">
            <Icon name="capture" size={19} />
          </button>
          <button type="button" className={styles.headBtn} onClick={() => setSearchOpen(true)} aria-label="Search tasks">
            <Icon name="search" size={19} />
          </button>
          <button
            type="button"
            className={styles.headBtn}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </header>

      {isMobile && drawerOpen && <div className={styles.scrim} onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <aside
        ref={asideRef}
        id={drawerId}
        className={className}
        aria-label="Sidebar"
        role={isMobile && drawerOpen ? 'dialog' : undefined}
        aria-modal={isMobile && drawerOpen ? true : undefined}
      >
        <div
          className={styles.panel}
          // Clicking the panel itself — not a link, button or field — folds it away.
          onClick={(e) => {
            if (isMobile) return;
            const el = e.target as HTMLElement;
            if (el.closest('a, button, input, select, textarea, [role="menu"], [role="dialog"]')) return;
            toggleCollapsed();
          }}
        >
          <div className={styles.head}>
            {collapsed ? (
              <button
                type="button"
                className={styles.railToggle}
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                aria-expanded={false}
                {...tipFor(`Expand sidebar · ${MOD}B`)}
              >
                <img className={styles.logoMark} src={logoMark} width={144} height={144} alt="" aria-hidden="true" />
                <Icon name="sidebar" size={19} className={styles.railToggleIcon} />
              </button>
            ) : (
              <>
                <NavLink to="/" className={styles.brand} aria-label="Gaia, go to Plan">
                  <img className={styles.logoMark} src={logoMark} width={144} height={144} alt="" aria-hidden="true" />
                  <span className={styles.wordmark}>Gaia</span>
                </NavLink>
                {isMobile ? (
                  <button type="button" className={styles.headBtn} onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                    <Icon name="close" size={19} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.headBtn}
                    onClick={toggleCollapsed}
                    aria-label="Collapse sidebar"
                    aria-expanded={true}
                    title={`Collapse sidebar (${MOD}B)`}
                  >
                    <Icon name="sidebar" size={19} />
                  </button>
                )}
              </>
            )}
          </div>

          <div className={styles.body}>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                setDrawerOpen(false);
                setSearchOpen(true);
              }}
              {...tipFor(`Search · ${MOD}K`)}
            >
              <Icon name="search" size={18} />
              <span className={styles.label}>Search</span>
              <kbd className={styles.kbd}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>

            <button
              type="button"
              className={styles.item}
              onClick={() => {
                setDrawerOpen(false);
                openCapture();
              }}
              {...tipFor(`Capture · ${CAPTURE_KEYS}`)}
            >
              <Icon name="capture" size={18} />
              <span className={styles.label}>Capture</span>
              <kbd className={styles.kbd}>{CAPTURE_KEYS}</kbd>
            </button>

            <div className={styles.divider} />
            <p className={styles.sectionLabel}>Menu</p>

            <nav aria-label="Primary">
              <ul className={styles.list}>
                {NAV.map((item) => {
                  const isActive = item.match(location.pathname);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        {...tipFor(item.label)}
                      >
                        <Icon name={item.icon} size={18} />
                        <span className={styles.label}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className={styles.grow} />

            <div className={styles.art}>
              <MonetImage spot="sidebar" painting="lilies" shape="tile" className={styles.artButton} imgClassName={styles.artImg} />
              <div className={styles.artText} aria-hidden="true">
                <p className={styles.artPhrase}>leave space</p>
                <p className={styles.artNote}>A quiet day is still a full day.</p>
              </div>
            </div>
          </div>

          <div className={styles.foot}>
            <Link
              to="/settings"
              className={`${styles.item} ${location.pathname.startsWith('/settings') ? styles.itemActive : ''}`}
              aria-current={location.pathname.startsWith('/settings') ? 'page' : undefined}
              {...tipFor('Settings')}
            >
              <Icon name="settings" size={18} />
              <span className={styles.label}>Settings</span>
            </Link>
            <Menu
              label="Profile"
              align="start"
              triggerClassName={styles.profile}
              trigger={
                <>
                  <span className={styles.avatar}>
                    <Icon name="user" size={17} />
                  </span>
                  <span className={styles.profileText}>
                    <span className={styles.profileName}>Your planner</span>
                    <span className={styles.profileMeta}>{account ? account.email : 'Saved on this device'}</span>
                  </span>
                  <Icon name="chevronUpDown" size={16} className={styles.profileChevron} />
                </>
              }
              items={[
                { kind: 'heading', label: account ? `Signed in as ${account.email}` : 'Your planner · saved on this device' },
                { label: 'What’s coming', icon: 'flag', onSelect: () => navigate('/plans') },
                { label: 'How to use Gaia', icon: 'sparkle', onSelect: () => navigate('/help') },
                { label: 'Support', icon: 'heart', onSelect: () => navigate('/support') },
                ...(account
                  ? ([
                      { kind: 'separator' },
                      { label: 'Sign out', icon: 'signOut', onSelect: () => void account.signOut() },
                    ] as const)
                  : []),
              ]}
            />
          </div>
        </div>
      </aside>


      {tip &&
        createPortal(
          <div className={styles.tooltip} style={{ top: tip.top, left: tip.left }} role="presentation">
            {tip.label}
          </div>,
          document.body,
        )}

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
