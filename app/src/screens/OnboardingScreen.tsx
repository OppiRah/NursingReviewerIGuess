import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { MascotMoment } from '../components/Mascot';
import { setSetting } from '../data/repo';
import { BYO_AI_PROMPT } from '../domain/byoPrompt';
import { CHATBOT_NOTICE } from '../copy';

const STEPS = 3;

export function OnboardingScreen() {
  const { db, go, prefs } = useApp();
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step > 0) headingRef.current?.focus();
  }, [step]);

  const finish = async (to: 'today' | 'import'): Promise<void> => {
    await setSetting(db, 'onboarded', true);
    go({ name: to });
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(BYO_AI_PROMPT);
      setCopied('Prompt copied.');
    } catch {
      setCopied("Couldn't copy here. You can copy it later from the Import screen.");
    }
  };

  return (
    <section aria-labelledby="page-title" className="onboarding">
      <p className="muted step-count">Step {step + 1} of {STEPS}</p>
      {step === 0 && (
        <>
          <h1 id="page-title" tabIndex={-1} ref={headingRef}>Your reviewers, as daily practice</h1>
          {prefs.mascot && <MascotMoment text="Hi! I'll cheer you on between sessions. I stay quiet while you answer." mood="cheer" />}
          <p>Paste the reviewers you already have. Each day, the app picks a short set of questions for you to answer from memory, then shows the rationale.</p>
          <p>It plans backward from your exam date, and it brings back the ones you miss sooner.</p>
          <p className="muted">Everything stays on this phone. No account, no uploads.</p>
        </>
      )}
      {step === 1 && (
        <>
          <h1 id="page-title" tabIndex={-1} ref={headingRef}>How to import</h1>
          <ol className="steps">
            <li>Paste a reviewer that already has <strong>Answer:</strong> and <strong>Rationale:</strong> lines, or</li>
            <li>Copy our prompt into your own chatbot (ChatGPT, Claude, Gemini), paste your notes after it, and paste the answer back here.</li>
            <li>Check the preview: problems are listed by line so you can fix them.</li>
          </ol>
          <p className="hint">{CHATBOT_NOTICE}</p>
          <p className="hint">Tip: start with one exam&apos;s chapters, not the whole semester.</p>
          <button type="button" className="btn" onClick={copy}>Copy BYO-AI prompt</button>
          {copied && <p role="status" className="muted">{copied}</p>}
        </>
      )}
      {step === 2 && (
        <>
          <h1 id="page-title" tabIndex={-1} ref={headingRef}>Set your exam date</h1>
          <p>When you import a reviewer, add the date of that exam. Your daily plan spreads new questions over the days you have left and aims to bring each one back before exam day. It is a guide, not a guarantee: with many questions and few days, Today tells you how many sessions it would take.</p>
          <p>No date yet? Leave it empty. You can add it later from the Decks screen.</p>
          <p>Tip: in Settings you can add a daily reminder to your calendar, and save a backup of your data.</p>
        </>
      )}

      <div className="row onboarding-nav">
        {step < STEPS - 1 ? (
          <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button type="button" className="btn primary" onClick={() => finish('import')}>Import my first reviewer</button>
        )}
        {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        <button type="button" className="btn ghost" onClick={() => finish('today')}>Skip intro</button>
      </div>
    </section>
  );
}
