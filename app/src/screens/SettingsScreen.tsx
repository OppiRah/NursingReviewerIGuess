import { useState, type ChangeEvent } from 'react';
import { useApp } from '../app/context';
import { PageTitle } from '../components/PageTitle';
import { downloadText } from '../app/download';
import { readTheme, saveTheme, type ThemePref } from '../app/theme';
import { APP_VERSION, BUILD_DATE, readLastError } from '../app/version';
import { buildFeedbackInfo, collectContentWords, collectFeedbackCounts } from '../domain/feedback';
import { useAsync } from '../app/useAsync';
import { buildExport, getSetting, markExported, newId, restoreBackup, setSetting, wipeAll } from '../data/repo';
import { backupFileName, MAX_BACKUP_BYTES, needsBackupNudge, validateBackupText, type BackupFile } from '../domain/backup';
import { buildDailyReminderIcs } from '../domain/ics';

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function SettingsScreen() {
  const { db, now, version, bump, prefs, setPrefs, reloadPrefs } = useApp();
  const state = useAsync(async () => ({
    lastExportAt: await getSetting<string | null>(db, 'lastExportAt', null),
    reminderTime: await getSetting<string>(db, 'reminderTime', '19:00'),
  }), [db, version]);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(readTheme);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  if (state.status === 'loading') return <p className="muted" aria-busy="true">Loading settings…</p>;
  if (state.status === 'error') return <p role="alert">Couldn't load settings: {state.error}</p>;
  const { lastExportAt, reminderTime } = state.data;
  const reminder = time ?? reminderTime;

  /** Runs one action at a time, with uniform status/error reporting. */
  const act = async (fn: () => Promise<string | null>): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const ok = await fn();
      if (ok) setStatus(ok);
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const onExport = () =>
    act(async () => {
      const t = now();
      const backup = await buildExport(db, t);
      downloadText(backupFileName(t), JSON.stringify(backup, null, 1), 'application/json');
      // Recorded only after the download was handed to the browser without an error.
      await markExported(db, backup.exportedAt);
      bump();
      return `Backup file created: ${backupFileName(t)}. Check that the file is in your Downloads or Files app, then keep a copy somewhere safe, like Google Drive or an email to yourself.`;
    });

  const onPickBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setPending(null);
    if (!file) return;
    void act(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('That file is too large to be a backup from this app.');
      const result = await validateBackupText(await file.text(), now());
      if (!result.ok) throw new Error(result.error);
      setPending(result.backup);
      return null;
    });
  };

  const onConfirmRestore = () =>
    act(async () => {
      if (!pending) return null;
      try {
        await restoreBackup(db, pending);
      } catch (e) {
        throw new Error(`Restore failed; your previous data was kept. (${msg(e)})`);
      }
      setPending(null);
      await reloadPrefs();
      bump();
      return 'Backup restored.';
    });

  const onWipe = () =>
    act(async () => {
      await wipeAll(db);
      setConfirmWipe(false);
      await reloadPrefs();
      bump();
      return 'All data on this device was deleted.';
    });

  const onReminder = () =>
    act(async () => {
      // Read the UID fresh so two quick taps can't create two different calendar events.
      const uid = (await getSetting<string | null>(db, 'reminderUid', null)) ?? `${newId()}@nursing-reviewer.local`;
      const ics = buildDailyReminderIcs({ time: reminder, now: now(), uid });
      await setSetting(db, 'reminderUid', uid);
      await setSetting(db, 'reminderTime', reminder);
      downloadText('daily-review-reminder.ics', ics, 'text/calendar');
      bump();
      return 'Reminder file downloaded. Open it and tap "Add" to put it in your calendar. Downloading again updates the same event.';
    });

  const onFeedback = async (): Promise<void> => {
    setFeedbackText(null);
    let persisted: boolean | null = null;
    try {
      persisted = (await navigator.storage?.persisted?.()) ?? null;
    } catch {
      persisted = null;
    }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    // Counts and device facts only: never question text, deck titles or any other content.
    const info = buildFeedbackInfo({ version: APP_VERSION, buildDate: BUILD_DATE, userAgent: navigator.userAgent, standalone, counts: await collectFeedbackCounts(db), lastError: readLastError(), persisted, contentWords: await collectContentWords(db) });
    try {
      await navigator.clipboard.writeText(info);
      setFeedbackMsg('Copied. Paste it in your message, with a screenshot if you can.');
    } catch {
      setFeedbackText(info);
      setFeedbackMsg("Couldn't copy automatically. Select the text below and copy it.");
    }
  };

  const onTheme = (t: ThemePref): void => {
    setTheme(t);
    saveTheme(t);
  };

  return (
    <section aria-labelledby="page-title">
      <PageTitle>Settings</PageTitle>
      {status && <p role="status" className="status">{status}</p>}
      {error && <p role="alert" className="error">{error}</p>}

      <div className="card">
        <h2>Backup</h2>
        <p data-testid="last-export">
          Last exported: {lastExportAt ? new Date(lastExportAt).toLocaleDateString() : 'never'}
        </p>
        {needsBackupNudge(lastExportAt, now()) && (
          <p className="nudge-text">Your data lives only on this device. A quick backup keeps it safe.</p>
        )}
        <div className="row">
          <button type="button" className="btn primary" onClick={onExport} disabled={busy}>Export backup</button>
          <label className="btn file-btn">
            Import backup
            <input type="file" accept=".json,application/json" className="sr-only" onChange={onPickBackup} data-testid="backup-file" disabled={busy} />
          </label>
        </div>
        {pending && (
          <div className="confirm" role="group" aria-label="Confirm restore">
            <p>
              Restore this backup from {new Date(pending.exportedAt).toLocaleString()}? It has {pending.data.decks.length} deck(s) and {pending.data.items.length} item(s).
              <strong> It will replace everything currently on this device.</strong>
            </p>
            <div className="row">
              <button type="button" className="btn danger" onClick={onConfirmRestore} disabled={busy}>Replace my data with this backup</button>
              <button type="button" className="btn" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Daily reminder</h2>
        <p>Adds a repeating daily event with an alert to your phone's calendar. No notifications or accounts needed.</p>
        <div className="form">
          <label htmlFor="reminder-time">Reminder time</label>
          <input id="reminder-time" type="time" value={reminder} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={onReminder} disabled={busy || !/^\d{2}:\d{2}$/.test(reminder)}>
            Add daily reminder to calendar
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Appearance</h2>
        <fieldset className="radio-group">
          <legend>Theme</legend>
          {(['system', 'light', 'dark'] as const).map((t) => (
            <label key={t} className="inline-check">
              <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => onTheme(t)} />
              {t === 'system' ? 'Match my phone' : t === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </fieldset>
        <label className="inline-check">
          <input type="checkbox" checked={prefs.mascot} onChange={(e) => void setPrefs({ mascot: e.target.checked })} />
          Show the mascot between sessions
        </label>
      </div>

      <div className="card">
        <h2>Delete all data</h2>
        {!confirmWipe ? (
          <button type="button" className="btn danger" onClick={() => setConfirmWipe(true)}>Wipe all data</button>
        ) : (
          <div className="confirm" role="group" aria-label="Confirm wipe">
            <p><strong>Delete every deck, item and review on this device?</strong> This can't be undone. Export a backup first if you might want them back.</p>
            <div className="row">
              <button type="button" className="btn danger" onClick={onWipe} disabled={busy}>Yes, delete everything</button>
              <button type="button" className="btn" onClick={() => setConfirmWipe(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>About and feedback</h2>
        <p data-testid="app-version">Version {APP_VERSION} · built {BUILD_DATE}</p>
        <p>Found a problem? Send a screenshot, and tap this to copy a few facts about your app (version, phone, counts). It never includes your questions or deck names.</p>
        <button type="button" className="btn" onClick={() => void onFeedback()}>Copy feedback info</button>
        {feedbackMsg && <p role="status" className="muted" data-testid="feedback-status">{feedbackMsg}</p>}
        {feedbackText && <textarea readOnly rows={7} value={feedbackText} aria-label="Feedback info" onFocus={(e) => e.target.select()} />}
      </div>

      <p className="muted small">Everything you add stays on this device. This app has no account, no server and no tracking.</p>
    </section>
  );
}
