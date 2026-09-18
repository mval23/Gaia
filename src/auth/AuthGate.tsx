import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { GaiaState } from '../types';
import { GaiaProvider, useGaia } from '../store/GaiaProvider';
import { CloudSync, forgetLocalCopy, openPlanner } from '../store/cloud';
import { cloudConfigured, supabase } from './supabase';
import { LoginPage } from '../pages/LoginPage';
import styles from '../pages/LoginPage.module.css';

interface AccountValue {
  email: string;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountValue | null>(null);

/** The signed-in Gaia account, or null when Gaia runs without accounts. */
export function useAccount(): AccountValue | null {
  return useContext(AccountContext);
}

/**
 * With Supabase set up, nothing of the planner shows until someone signs in,
 * and each person gets their own planner. Without it, Gaia works as it always
 * has, saved in this browser.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!cloudConfigured) return <GaiaProvider>{children}</GaiaProvider>;
  return <SignedInOnly>{children}</SignedInOnly>;
}

function SignedInOnly({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // A password-reset link signs you in only so you can choose a new password.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Waiting />;
  if (!session || recovering) {
    return <LoginPage mode={recovering ? 'new-password' : undefined} onPasswordSet={() => setRecovering(false)} />;
  }
  return (
    <Planner key={session.user.id} user={session.user}>
      {children}
    </Planner>
  );
}

function Planner({ user, children }: { user: User; children: ReactNode }) {
  const [opened, setOpened] = useState<{ state: GaiaState; sync: CloudSync; browserPlanner?: GaiaState } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setFailed(false);
    openPlanner(user.id).then(
      (result) => live && setOpened(result),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [user.id, attempt]);

  // Leaving with unsent changes: send them now, and ask the browser to hold on if they can't go yet.
  useEffect(() => {
    if (!opened) return;
    const { sync } = opened;
    const onHide = () => {
      if (document.visibilityState === 'hidden') void sync.flush();
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!sync.pending) return;
      void sync.flush();
      e.preventDefault();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [opened]);

  const signOut = useCallback(async () => {
    await opened?.sync.flush();
    await supabase.auth.signOut();
    forgetLocalCopy(user.id);
  }, [opened, user.id]);

  if (failed) {
    return (
      <Waiting>
        <p>Gaia couldn't reach your planner. Check your connection and try again.</p>
        <div className={styles.row}>
          <button type="button" className={styles.submit} onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
          <button type="button" className={styles.link} onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </Waiting>
    );
  }
  if (!opened) return <Waiting />;

  if (opened.browserPlanner) {
    const found = opened.browserPlanner;
    return (
      <CarryOver
        planner={found}
        onChoose={(keep) => setOpened({ state: keep ? found : opened.state, sync: opened.sync })}
      />
    );
  }

  return (
    <AccountContext.Provider value={{ email: user.email ?? '', signOut }}>
      <GaiaProvider initial={opened.state} persist={opened.sync.save}>
        <PullNewer sync={opened.sync} />
        {children}
      </GaiaProvider>
    </AccountContext.Provider>
  );
}

/** Coming back to Gaia picks up what you did on another device in the meantime. */
function PullNewer({ sync }: { sync: CloudSync }) {
  const { dispatch } = useGaia();
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      const state = await sync.newer();
      if (state) dispatch({ type: 'state/replace', state });
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [sync, dispatch]);
  return null;
}

/**
 * A first sign-in in a browser that already has a planner from before accounts:
 * ask, rather than assume it's theirs (a shared computer may hold someone else's).
 */
function CarryOver({ planner, onChoose }: { planner: GaiaState; onChoose: (keep: boolean) => void }) {
  const counts = [
    [planner.tasks.length, 'task', 'tasks'],
    [planner.habits.length, 'habit', 'habits'],
    [planner.goals.length, 'goal', 'goals'],
  ] as const;
  const summary = counts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
    .join(', ');

  return (
    <Waiting>
      <h1 className={styles.title}>A planner is already here</h1>
      <p className={styles.quiet}>
        This browser has a Gaia planner from before you had an account{summary ? ` (${summary})` : ''}. Use it for your
        account?
      </p>
      <div className={styles.choices}>
        <button type="button" className={styles.submit} onClick={() => onChoose(true)}>
          Use this planner
        </button>
        <button type="button" className={styles.link} onClick={() => onChoose(false)}>
          Start with sample data
        </button>
      </div>
    </Waiting>
  );
}

function Waiting({ children }: { children?: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.card} aria-busy={!children}>
        {children ?? <p className={styles.quiet}>Opening your planner…</p>}
      </div>
    </main>
  );
}
