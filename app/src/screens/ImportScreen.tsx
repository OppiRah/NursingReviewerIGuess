import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { PageTitle } from '../components/PageTitle';
import { createDeck } from '../data/repo';
import { BYO_AI_PROMPT } from '../domain/byoPrompt';
import { isDateStr, localDateStr } from '../domain/dates';
import { MAX_IMPORT_BYTES, parseReviewer } from '../domain/parser';
import { MAX_PDF_PAGES, MAX_UPLOAD_BYTES, fileKind } from '../import/kinds';

const SCANNED_MESSAGE =
  "This PDF looks like scanned images or slides — text can't be read from it yet. Try the original Google Doc/Word file, or use the AI prompt.";

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [fileTitle, setFileTitle] = useState('');

  const parsed = useMemo(() => (text.trim() ? parseReviewer(text) : null), [text]);
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
        if (r.scanned) {
          setFileError(SCANNED_MESSAGE);
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
    } catch {
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
      setCopyMsg("Couldn't copy automatically. Select the prompt text below and copy it.");
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
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="page-title">
      <PageTitle>Import a reviewer</PageTitle>

      <div className="card">
        <h2>Make one with your own AI</h2>
        <p>Copy this prompt into ChatGPT, Claude or Gemini, paste your notes after it, then paste the answer here. This app never sends your notes anywhere.</p>
        <button type="button" className="btn" onClick={copyPrompt}>Copy BYO-AI prompt</button>
        {copyMsg && <p role="status" className="muted">{copyMsg}</p>}
        <details>
          <summary>Show the prompt</summary>
          <pre className="prompt-text">{BYO_AI_PROMPT}</pre>
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

        {parsed && (
          <div className="preview" aria-live="polite" data-testid="preview">
            <p className="lead">
              <strong data-testid="parsed-count">{parsed.items.length}</strong> {parsed.items.length === 1 ? 'question' : 'questions'} ready
              {parsed.errors.length > 0 && <>, <strong className="error">{parsed.errors.length} {parsed.errors.length === 1 ? 'problem' : 'problems'}</strong> to fix</>}
              {parsed.warnings.length > 0 && <>, {parsed.warnings.length} {parsed.warnings.length === 1 ? 'warning' : 'warnings'}</>}
            </p>
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
                <ul className="issues warnings">
                  {parsed.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

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

        {saveError && <p role="alert" className="error">Couldn't save: {saveError}</p>}
        <button type="submit" className="btn primary" disabled={!canSave}>
          {parsed && parsed.items.length > 0 ? `Save ${parsed.items.length} ${parsed.items.length === 1 ? 'question' : 'questions'}` : 'Save'}
        </button>
      </form>
    </section>
  );
}
