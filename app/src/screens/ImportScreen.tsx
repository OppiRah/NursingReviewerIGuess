import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { describeError } from '../app/errors';
import { PageTitle } from '../components/PageTitle';
import { createDeck } from '../data/repo';
import { BYO_AI_PROMPT } from '../domain/byoPrompt';
import { isDateStr, localDateStr } from '../domain/dates';
import { MAX_IMPORT_BYTES, parseReviewer, type ParsedItem, type ParseResult } from '../domain/parser';
import { letter } from '../domain/scoring';
import { CHATBOT_NOTICE, CONTENT_NOTICE, ITEM_TYPE_LABEL } from '../copy';
import { FriendlyImportError, MAX_PDF_PAGES, MAX_UPLOAD_BYTES, READER_LOAD_MESSAGE, fileKind, isModuleLoadError } from '../import/kinds';

const UNREADABLE_MESSAGE = "Text in this PDF couldn't be read cleanly — try the original Word/Google Doc.";
const SCANNED_MESSAGE =
  "This PDF looks like scanned images or slides — text can't be read from it yet. Try the original Google Doc/Word file, or use the AI prompt.";

/** No questions found in more than this many words → show the "study notes" card (BUILD-006). */
const NOTES_MIN_WORDS = 300;
/** Some questions found, but this many words of prose besides → suggest the AI prompt for those parts. */
const MIXED_NOTES_MIN_WORDS = 150;
/** Show at most this many warnings; the rest are summarized. */
const MAX_WARNINGS_SHOWN = 20;

/** Problems and warnings from a parse, as plain text (never HTML). */
function Issues({ parsed }: { parsed: ParseResult }) {
  const shown = parsed.warnings.slice(0, MAX_WARNINGS_SHOWN);
  const more = parsed.warnings.length - shown.length;
  return (
    <>
      {parsed.errors.length > 0 && (
        <>
          <h3>Problems (these questions will not be saved)</h3>
          <ul className="issues errors" data-testid="parse-errors">
            {parsed.errors.map((er, i) => <li key={i}>{er.line > 0 ? `Line ${er.line}: ` : ''}{er.message}</li>)}
          </ul>
        </>
      )}
      {parsed.warnings.length > 0 && (
        <details>
          <summary>Warnings ({parsed.warnings.length})</summary>
          <ul className="issues warnings" data-testid="parse-warnings">
            {shown.map((w, i) => <li key={i}>{w.message}</li>)}
            {more > 0 && <li data-testid="warnings-more">and {more} more</li>}
          </ul>
        </details>
      )}
    </>
  );
}

const SAMPLE_ITEMS_SHOWN = 3;

/**
 * AUDIT-001 A-20: show the first few parsed questions with the answer the app will mark correct, so a
 * student can spot a wrong answer key (common with chatbot output) before saving. Plain text only.
 */
function SampleItems({ items }: { items: ParsedItem[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, SAMPLE_ITEMS_SHOWN);
  const more = items.length - shown.length;
  return (
    <div data-testid="preview-sample">
      <h3>Check a few before saving</h3>
      <ol className="sample-items">
        {shown.map((it, i) => (
          <li key={i}>
            <span className="hint">{ITEM_TYPE_LABEL[it.type]}</span>
            <br />
            {it.question}
            <br />
            <strong>{it.type === 'flashcard' ? `A: ${it.back}` : `Answer: ${it.answer.map((a) => `${letter(a)}. ${it.choices[a] ?? ''}`).join('; ')}`}</strong>
          </li>
        ))}
      </ol>
      {more > 0 && <p className="hint">and {more} more. After saving, you can check and edit every question in Decks.</p>}
    </div>
  );
}

/** "Chapter 3 reviewer.pdf" → "Chapter 3 reviewer" (title suggestion only). */
function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 120);
}

const FORMAT_EXAMPLE = `# Sample deck (SAMPLE, not for study)
1. Sample question: which color is the sky on a clear day?
a. Green
b. Blue
c. Red
d. Yellow
Answer: b
Rationale: Sample rationale text.
---`;

export function ImportScreen() {
  const { db, scheduler, now, go, bump } = useApp();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  /** The prompt text box: opened (and selected) when the clipboard is not available, so it can be copied by hand. */
  const [promptOpen, setPromptOpen] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [fileTitle, setFileTitle] = useState('');

  const parsed = useMemo(() => (text.trim() ? parseReviewer(text) : null), [text]);
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  // Long text with no questions at all is almost always study notes: point to the AI prompt first.
  // A broken question deck (many "Answer:" lines) is not notes: show its real errors instead.
  const looksLikeNotes = !!parsed && parsed.items.length === 0 && words > NOTES_MIN_WORDS && parsed.answerLines < 2;
  // Only text outside any question counts here, not a few broken questions.
  const mixedNotes = !!parsed && parsed.items.length > 0 && parsed.ignoredWords >= MIXED_NOTES_MIN_WORDS;
  const effectiveTitle = titleTouched ? title : title || parsed?.title || fileTitle || '';

  const onFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    setFileError(null);
    setFileNote(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const kind = fileKind(file);
    if (kind === 'unsupported') {
      setFileError('That file type is not supported. Choose a .pdf, .docx, .txt or .md file.');
      return;
    }
    if (kind === 'text') {
      if (file.size > MAX_IMPORT_BYTES) {
        setFileError('That file is larger than 2 MB. Split it into smaller files and import them one at a time.');
        return;
      }
      try {
        setText(await file.text());
        setFileTitle(titleFromFileName(file.name));
      } catch {
        setFileError("Couldn't read that file. Make sure it is a plain text file.");
      }
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError('That file is larger than 15 MB. Split it into smaller files and import them one at a time.');
      return;
    }
    setReading(kind === 'pdf' ? 'Opening the PDF…' : 'Reading the Word file…');
    try {
      // Loaded only now, so the PDF and Word readers never slow down the app's first load.
      const { extractDocx, extractPdf } = await import('../import/extract');
      const data = await file.arrayBuffer();
      if (kind === 'pdf') {
        const r = await extractPdf(data, (page, total) => setReading(`Reading page ${page} of ${total}…`));
        if (r.status !== 'ok') {
          setFileError(r.status === 'scanned' ? SCANNED_MESSAGE : UNREADABLE_MESSAGE);
          return;
        }
        const notes: string[] = [];
        if (r.pagesRead < r.pages) notes.push(`Only the first ${MAX_PDF_PAGES} of ${r.pages} pages were read. Split the PDF to import the rest.`);
        if (r.emptyPages > 0) notes.push(`${r.emptyPages} ${r.emptyPages === 1 ? 'page had' : 'pages had'} no readable text (images or slides) and ${r.emptyPages === 1 ? 'was' : 'were'} skipped.`);
        setFileNote(notes.length ? notes.join(' ') : null);
        setText(r.text);
      } else {
        setText(await extractDocx(data));
      }
      setFileTitle(titleFromFileName(file.name));
    } catch (err) {
      if (err instanceof FriendlyImportError) {
        setFileError(err.message);
        return;
      }
      if (isModuleLoadError(err)) {
        setFileError(READER_LOAD_MESSAGE);
        return;
      }
      setFileError(
        kind === 'pdf'
          ? "Couldn't read that PDF. It may be password-protected or damaged. Try the original Google Doc/Word file, or use the AI prompt."
          : "Couldn't read that Word file. Make sure it is a .docx (not an older .doc) file.",
      );
    } finally {
      setReading(null);
    }
  };

  const copyPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(BYO_AI_PROMPT);
      setCopyMsg('Prompt copied. Paste it into your chatbot, then add your material after it.');
    } catch {
      setPromptOpen(true);
      setCopyMsg("Couldn't copy automatically. The prompt is now shown under “Make one with your own AI”: tap it to select it all, then copy.");
      // After the box opens: bring it into view and select the whole prompt.
      window.setTimeout(() => {
        promptRef.current?.scrollIntoView({ block: 'center' });
        promptRef.current?.focus();
      }, 0);
    }
  };

  const today = localDateStr(now());
  const examPast = examDate !== '' && isDateStr(examDate) && examDate < today;
  const canSave = !!parsed && parsed.items.length > 0 && effectiveTitle.trim().length > 0 && (examDate === '' || isDateStr(examDate)) && !examPast && !saving;

  const onSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!parsed || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createDeck(db, { title: effectiveTitle, examDate: examDate || null, items: parsed.items }, scheduler, now());
      bump();
      go({ name: 'today' });
    } catch (err) {
      setSaveError(describeError(err));
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="page-title">
      <PageTitle>Import a reviewer</PageTitle>

      <div className="card">
        <h2>Make one with your own AI</h2>
        <p>Copy this prompt into ChatGPT, Claude or Gemini, paste your notes after it, then paste the answer here.</p>
        <p className="hint" data-testid="chatbot-notice">{CHATBOT_NOTICE}</p>
        <p className="hint">Tip: start with one exam&apos;s chapters, not the whole semester.</p>
        <button type="button" className="btn" onClick={copyPrompt}>Copy BYO-AI prompt</button>
        {copyMsg && <p role="status" className="muted">{copyMsg}</p>}
        <details open={promptOpen} onToggle={(e) => setPromptOpen(e.currentTarget.open)}>
          <summary>Show the prompt</summary>
          <textarea
            ref={promptRef}
            readOnly
            rows={10}
            className="prompt-text"
            value={BYO_AI_PROMPT}
            aria-label="BYO-AI prompt"
            data-testid="prompt-text"
            onFocus={(e) => e.target.select()}
          />
        </details>
      </div>

      <form onSubmit={onSave} className="card form">
        <label htmlFor="import-text">Paste your reviewer</label>
        <textarea
          id="import-text"
          rows={10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // A cleared text box forgets the old file's name as a title suggestion.
            if (!e.target.value.trim()) setFileTitle('');
          }}
          placeholder={FORMAT_EXAMPLE}
          spellCheck={false}
        />
        <label htmlFor="import-file" className="file-label">Or choose a file (.pdf, .docx, .txt)</label>
        <input
          id="import-file"
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          onChange={onFile}
          disabled={reading !== null}
          aria-describedby="import-file-hint"
        />
        <p id="import-file-hint" className="hint">Your file is read on this phone. Nothing is uploaded. Check the text above before saving.</p>
        {reading && <p role="status" className="muted" data-testid="file-progress">{reading}</p>}
        {fileNote && <p role="status" className="muted">{fileNote}</p>}
        {fileError && <p role="alert" className="error">{fileError}</p>}

        {parsed && looksLikeNotes && (
          <div className="preview notes-card" aria-live="polite" data-testid="notes-card">
            <h3>This looks like study notes, not questions.</h3>
            <p>Turn them into questions with your AI:</p>
            <ol>
              <li>Copy prompt</li>
              <li>Open ChatGPT/Claude, paste the prompt, then your notes</li>
              <li>Paste the result here</li>
            </ol>
            <p className="hint">{CHATBOT_NOTICE}</p>
            <button type="button" className="btn primary" onClick={copyPrompt}>Copy prompt</button>
            {copyMsg && <p role="status" className="muted" data-testid="notes-copy-status">{copyMsg}</p>}
            <details data-testid="notes-details">
              <summary>Show details</summary>
              <Issues parsed={parsed} />
            </details>
          </div>
        )}
        {parsed && !looksLikeNotes && (
          <div className="preview" aria-live="polite" data-testid="preview">
            <p className="lead">
              <strong data-testid="parsed-count">{parsed.items.length}</strong> {parsed.items.length === 1 ? 'question' : 'questions'} ready
              {parsed.errors.length > 0 && <>, <strong className="error">{parsed.errors.length} {parsed.errors.length === 1 ? 'problem' : 'problems'}</strong> to fix</>}
              {parsed.warnings.length > 0 && <>, {parsed.warnings.length} {parsed.warnings.length === 1 ? 'warning' : 'warnings'}</>}
            </p>
            {mixedNotes && (
              <p className="hint" data-testid="mixed-notes">Some parts looked like notes — use the AI prompt for those.</p>
            )}
            <Issues parsed={parsed} />
          </div>
        )}
        {/* Outside the live region: screen readers should not re-read sample questions on every keystroke. */}
        {parsed && !looksLikeNotes && <SampleItems items={parsed.items} />}

        <label htmlFor="deck-title">Deck title</label>
        <input
          id="deck-title"
          type="text"
          maxLength={120}
          value={effectiveTitle}
          onChange={(e) => {
            setTitleTouched(true);
            setTitle(e.target.value);
          }}
          placeholder="e.g. Fundamentals, Chapter 3"
        />
        <label htmlFor="exam-date">Exam date</label>
        <input id="exam-date" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)} aria-describedby="exam-hint" />
        {examPast ? (
          <p id="exam-hint" role="alert" className="error">That date has already passed. Pick today or a later date, or leave it empty.</p>
        ) : (
          <p id="exam-hint" className="hint">Your daily plan works backward from this date. You can leave it empty.</p>
        )}

        <p className="hint" data-testid="content-notice">{CONTENT_NOTICE}</p>
        {saveError && <p role="alert" className="error">Couldn't save: {saveError}</p>}
        <button type="submit" className="btn primary" disabled={!canSave}>
          {parsed && parsed.items.length > 0 ? `Save ${parsed.items.length} ${parsed.items.length === 1 ? 'question' : 'questions'}` : 'Save'}
        </button>
      </form>
    </section>
  );
}
