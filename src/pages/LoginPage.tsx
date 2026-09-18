import { useState, type FormEvent } from 'react';
import { supabase } from '../auth/supabase';
import logoMark from '../assets/brand/gaia-logo.webp';
import lilies from '../assets/monet/lilies-card.webp';
import styles from './LoginPage.module.css';

type Mode = 'sign-in' | 'sign-up' | 'reset' | 'new-password';

const HEADINGS: Record<Mode, { title: string; lead: string; submit: string }> = {
  'sign-in': { title: 'Welcome back', lead: 'Sign in to open your planner.', submit: 'Sign in' },
  'sign-up': { title: 'Make a planner', lead: 'Your own space, saved to your account.', submit: 'Create account' },
  reset: { title: 'Forgot your password?', lead: "We'll email you a link to choose a new one.", submit: 'Send the link' },
  'new-password': { title: 'Choose a new password', lead: 'At least 8 characters.', submit: 'Save password' },
};

/** Supabase's messages, in Gaia's voice where it matters. */
function explain(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(message)) return 'Confirm your email first: the link is in your inbox.';
  if (/already registered/i.test(message)) return 'There is already an account with this email. Try signing in.';
  if (/rate limit/i.test(message)) return 'Too many tries for now. Please wait a few minutes.';
  return message;
}

interface LoginPageProps {
  mode?: Mode;
  /** Called once a password chosen from a reset link is saved. */
  onPasswordSet?: () => void;
}

export function LoginPage({ mode: initialMode = 'sign-in', onPasswordSet }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const text = HEADINGS[mode];
  const home = window.location.origin;

  const switchTo = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: home } });
        if (error) throw error;
        // With email confirmation on, there's no session until the link is clicked.
        if (!data.session) setNotice(`Almost there: we sent a link to ${email}. Open it to finish.`);
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: home });
        if (error) throw error;
        setNotice(`If ${email} has an account, a link is on its way.`);
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        onPasswordSet?.();
      }
    } catch (err) {
      setError(explain((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <img className={styles.art} src={lilies} alt="" width={360} height={240} />
        <div className={styles.body}>
          <div className={styles.brand}>
            <img src={logoMark} alt="" width={28} height={28} />
            <span>Gaia</span>
          </div>
          <h1 className={styles.title}>{text.title}</h1>
          <p className={styles.quiet}>{text.lead}</p>

          <form className={styles.form} onSubmit={submit}>
            {mode !== 'new-password' && (
              <label className={styles.label}>
                Email
                <input
                  className="field"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {mode !== 'reset' && (
              <label className={styles.label}>
                Password
                <input
                  className="field"
                  type="password"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={mode === 'sign-in' ? undefined : 8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}

            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? 'One moment…' : text.submit}
            </button>
          </form>

          <div className={styles.switches}>
            {mode === 'sign-in' && (
              <>
                <button type="button" className={styles.link} onClick={() => switchTo('reset')}>
                  Forgot your password?
                </button>
                <span>
                  New here?{' '}
                  <button type="button" className={styles.link} onClick={() => switchTo('sign-up')}>
                    Create an account
                  </button>
                </span>
              </>
            )}
            {(mode === 'sign-up' || mode === 'reset') && (
              <span>
                {mode === 'sign-up' ? 'Already have one? ' : ''}
                <button type="button" className={styles.link} onClick={() => switchTo('sign-in')}>
                  {mode === 'sign-up' ? 'Sign in' : 'Back to sign in'}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
