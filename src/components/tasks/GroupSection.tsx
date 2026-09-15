import type { ReactNode } from 'react';
import type { Group } from '../../types';
import { useCollapsed } from '../../hooks/useCollapsed';
import { Icon } from '../ui/Icon';
import styles from './tasks.module.css';

interface GroupSectionProps {
  group: Group;
  activeCount: number;
  showHeader: boolean;
  children: ReactNode;
}

export function GroupSection({ group, activeCount, showHeader, children }: GroupSectionProps) {
  const { isCollapsed, toggle } = useCollapsed();
  const key = `group:${group.id}`;
  const collapsed = showHeader && isCollapsed(key);
  const bodyId = `group-body-${group.id}`;

  return (
    <section className={styles.group} aria-label={showHeader ? undefined : group.name}>
      {showHeader && (
        <h3 className={styles.groupHeading}>
          <button
            type="button"
            className={styles.groupToggle}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => toggle(key)}
          >
            <Icon name="chevronDown" size={15} className={`${styles.chevron} ${collapsed ? styles.chevronClosed : ''}`} />
            <span className={styles.groupName}>{group.name}</span>
            <span className={styles.groupCount} aria-label={`${activeCount} active`}>
              · {activeCount}
            </span>
          </button>
        </h3>
      )}
      {!collapsed && (
        <div id={bodyId} className={styles.groupBody}>
          {children}
        </div>
      )}
    </section>
  );
}
