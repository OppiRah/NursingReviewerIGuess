/**
 * Canonical import format parser (ADR-002 §4 + Addendum M2 + Addendum BUILD-005).
 * Pure function: text in, { title, items, errors, warnings } out.
 * Malformed blocks are reported with line numbers and never silently dropped, and one bad
 * block never takes the blocks after it down with it.
 */
import { isHeading, isStrongHeading, normalizeLines, type NormLine } from './normalize';
import type { ItemType } from './types';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export interface ParsedItem {
  type: ItemType;
  question: string;
  choices: string[];
  answer: number[];
  back: string;
  rationale: string;
  /** 1-based line where the block starts. */
  line: number;
}

export interface ParseIssue {
  /** 1-based line number; 0 means "whole input". */
  line: number;
  message: string;
}

export interface ParseResult {
  title: string | null;
  items: ParsedItem[];
  errors: ParseIssue[];
  warnings: ParseIssue[];
}

const RE_TITLE = /^#\s*(.*)$/;
const RE_SEP = /^-{3,}$/;
const RE_TYPE = /^type\s*:\s*(.*)$/i;
const RE_ANSWER = /^(?:correct\s+)?answer\s*:\s*(.*)$/i;
const RE_RATIONALE = /^(?:rationale|explanation)\s*:\s*(.*)$/i;
const RE_Q = /^q\s*:\s*(.*)$/i;
const RE_A = /^a\s*:\s*(.*)$/i;
const RE_NUM = /^(\d{1,4})[.)]\s+(.+)$/;
/**
 * Looser question start for PDF text where the space after the number was lost ("2.A nurse…").
 * Never a decimal ("1.5 units"). Used only between blocks (when choices/Answer follow) and for recovery.
 */
const RE_NUM_LOOSE = /^(\d{1,4})[.)](?!\d)\s*(\S.*)$/;
/** A whole line of underscores: a separator between questions, or a fill-in-the-blank inside one. */
const RE_UNDERSCORES = /^_{3,}$/;
const RE_CHOICE = /^([a-hA-H])[.)]\s+(.+)$/;
const LETTERS = 'abcdefgh';

/**
 * Species/term words that follow a capital initial in wrapped text ("C. diff", "E. coli",
 * "A. fib"). A capital letter followed by one of these is never read as a choice.
 */
const ABBREVIATED_TERMS = new Set([
  'coli', 'diff', 'difficile', 'aureus', 'pylori', 'pneumoniae', 'aeruginosa', 'tuberculosis', 'gonorrhoeae',
  'pallidum', 'pyogenes', 'agalactiae', 'cereus', 'monocytogenes', 'albicans', 'epidermidis', 'faecalis',
  'botulinum', 'tetani', 'perfringens', 'typhi', 'influenzae', 'trachomatis', 'vaginalis', 'jejuni',
  'burgdorferi', 'meningitidis', 'fib', 'flutter',
]);

type Field = 'question' | 'choice' | 'answer' | 'back' | 'rationale';

interface Block {
  line: number;
  kind: 'numbered' | 'flash';
  declaredType: ItemType | null;
  question: string[];
  choices: { letter: string; upper: boolean; text: string[]; line: number }[];
  answerRaw: string | null;
  answerLine: number;
  /** Index (into the normalized lines) of the most recent Answer: line. */
  lastAnswerIdx: number;
  back: string[] | null;
  rationale: string[] | null;
  field: Field;
  errors: ParseIssue[];
}

interface PassResult extends ParseResult {
  /** Merged blocks found in this pass: where a new question should be forced to start. */
  requests: { idx: number; blockLine: number }[];
  /** Original line numbers of ignored chapter/section headings. */
  headings: number[];
}

function parseDeclaredType(raw: string): ItemType | null {
  const v = raw.trim().toLowerCase();
  if (/^(mcq|multiple[\s-]*choice|single)$/.test(v)) return 'mcq';
  if (/^(sata|select[\s-]*all(\s+that\s+apply)?)$/.test(v)) return 'sata';
  if (/^(priority|first[\s-]*action|prioritization)$/.test(v)) return 'priority';
  if (/^(flashcard|flash[\s-]*card|card)$/.test(v)) return 'flashcard';
  return null;
}

/** "b" → ["b"]; "a, c, d" → ["a","c","d"]; "b. Some text" → ["b"]; otherwise null. */
export function parseAnswerLetters(raw: string): string[] | null {
  const s = raw.trim().replace(/\.$/, '');
  if (!s) return null;
  const tokens = s.split(/\s*(?:,|;|&|\band\b|\s)\s*/i).filter(Boolean);
  if (tokens.length > 0 && tokens.every((t) => /^\(?[a-h]\)?[.)]?$/i.test(t))) {
    return [...new Set(tokens.map((t) => t.replace(/[^a-h]/gi, '').toLowerCase()))].sort();
  }
  const m = /^\(?([a-h])(?:\)|[.):])\s+\S/i.exec(s);
  if (m && m[1]) return [m[1].toLowerCase()];
  return null;
}

const join = (parts: string[]): string => parts.join(' ').replace(/\s+/g, ' ').trim();

function startsWithAbbreviatedTerm(text: string): boolean {
  const first = /^([a-z]+)\b/.exec(text);
  return !!first && ABBREVIATED_TERMS.has(first[1] ?? '');
}

/** One parsing pass over normalized lines. `forced` holds line indexes that must start a question. */
function parsePass(lines: NormLine[], forced: ReadonlySet<number>): PassResult {
  const result: PassResult = { title: null, items: [], errors: [], warnings: [], requests: [], headings: [] };
  let firstHeading: string | null = null;

  let block: Block | null = null;
  let pendingType: { type: ItemType; line: number } | null = null;
  let seenBlock = false;

  const finalize = (): void => {
    if (!block) return;
    const b = block;
    block = null;
    const errs = [...b.errors];
    const question = join(b.question);
    const rationale = b.rationale ? join(b.rationale) : '';
    const where = `Question at line ${b.line}`;

    if (!question) errs.push({ line: b.line, message: `${where}: the question text is empty.` });

    if (b.kind === 'flash' || b.declaredType === 'flashcard') {
      const back = b.back ? join(b.back) : '';
      if (b.choices.length > 0) errs.push({ line: b.line, message: `${where}: a flashcard (Q:/A:) cannot have lettered choices.` });
      if (!back) errs.push({ line: b.line, message: `${where}: flashcard has no "A:" answer line.` });
      if (errs.length) {
        result.errors.push(...errs);
        return;
      }
      result.items.push({ type: 'flashcard', question, choices: [], answer: [], back, rationale, line: b.line });
      return;
    }

    if (b.choices.length < 2) {
      errs.push({ line: b.line, message: `${where}: needs at least 2 lettered choices (found ${b.choices.length}).` });
    }
    b.choices.forEach((c, i) => {
      if (c.letter !== LETTERS[i]) {
        errs.push({ line: c.line, message: `${where}: choices must be lettered a, b, c… in order (found "${c.letter}" at position ${i + 1}).` });
      }
    });

    let letters: string[] | null = null;
    if (b.answerRaw === null) {
      errs.push({ line: b.line, message: `${where}: missing "Answer:" line.` });
    } else {
      letters = parseAnswerLetters(b.answerRaw);
      if (!letters) {
        errs.push({ line: b.answerLine, message: `${where}: the answer "${b.answerRaw.trim()}" should be a choice letter, like "b" or "a, c".` });
      }
    }

    const answer: number[] = [];
    if (letters) {
      for (const l of letters) {
        const idx = LETTERS.indexOf(l);
        if (idx < 0 || idx >= b.choices.length) {
          const last = LETTERS[Math.max(0, b.choices.length - 1)] ?? 'a';
          errs.push({ line: b.answerLine, message: `${where}: answer "${l}" is not one of the choices (a–${last}).` });
        } else {
          answer.push(idx);
        }
      }
    }

    let type: ItemType = b.declaredType ?? 'mcq';
    if (!b.declaredType && (answer.length > 1 || /select all that apply/i.test(question))) type = 'sata';
    if ((type === 'mcq' || type === 'priority') && answer.length > 1) {
      errs.push({ line: b.answerLine, message: `${where}: a ${type === 'priority' ? 'priority' : 'single-answer'} question must have exactly one answer.` });
    }

    if (errs.length) {
      result.errors.push(...errs);
      return;
    }
    if (!rationale) result.warnings.push({ line: b.line, message: `${where}: no rationale. It will be saved, but you won't see an explanation after answering.` });
    result.items.push({
      type,
      question,
      choices: b.choices.map((c) => join(c.text)),
      answer,
      back: '',
      rationale,
      line: b.line,
    });
  };

  const startBlock = (lineNo: number, kind: Block['kind'], firstQuestionText: string): void => {
    finalize();
    seenBlock = true;
    block = {
      line: lineNo,
      kind,
      declaredType: pendingType?.type ?? null,
      question: [firstQuestionText],
      choices: [],
      answerRaw: null,
      answerLine: lineNo,
      lastAnswerIdx: -1,
      back: null,
      rationale: null,
      field: 'question',
      errors: [],
    };
    pendingType = null;
  };

  /** Continuation of a wrapped line: append to whatever field the block is in. */
  const appendText = (b: Block, line: string, lineNo: number): void => {
    switch (b.field) {
      case 'question':
        b.question.push(line);
        break;
      case 'choice':
        b.choices[b.choices.length - 1]?.text.push(line);
        break;
      case 'back':
        b.back?.push(line);
        break;
      case 'rationale':
        b.rationale?.push(line);
        break;
      case 'answer':
        b.errors.push({ line: lineNo, message: `Question at line ${b.line}: unexpected text after "Answer:" (line ${lineNo}). Start explanations with "Rationale:".` });
        break;
    }
  };

  /** Do choices or an Answer: line follow line `idx` before the next block boundary? */
  const questionFollows = (idx: number): boolean => {
    for (let j = idx + 1; j < lines.length; j++) {
      const l = lines[j]?.text ?? '';
      if (!l) continue;
      if (RE_NUM.test(l) || RE_SEP.test(l) || RE_Q.test(l) || RE_TYPE.test(l)) return false;
      if (RE_CHOICE.test(l) || RE_ANSWER.test(l)) return true;
    }
    return false;
  };

  /**
   * A second Answer: inside one block means two questions merged (usually a lost separator).
   * Find the question line between the previous Answer: and this one, so the next pass can split there.
   */
  const findSplit = (b: Block, answerIdx: number): number | null => {
    // One backward scan (linear): the nearest numbered line that has a choice line after it.
    let sawChoice = false;
    for (let k = answerIdx - 1; k > b.lastAnswerIdx; k--) {
      const t = lines[k]?.text ?? '';
      if (RE_CHOICE.test(t)) {
        sawChoice = true;
        continue;
      }
      if (sawChoice && !forced.has(k) && RE_NUM_LOOSE.test(t)) return k;
    }
    return null;
  };

  /** Lines already consumed by an undone glued split (see NormLine.glued). */
  let skipIdx = -1;

  lines.forEach((entry, i) => {
    const lineNo = entry.line;
    const line = entry.text;
    if (!line || i === skipIdx) return;

    let m: RegExpExecArray | null;
    const open = block as Block | null;

    if (forced.has(i) && (m = RE_NUM_LOOSE.exec(line))) {
      startBlock(lineNo, 'numbered', m[2] ?? '');
      return;
    }

    // "#" is a title/heading only between blocks; inside a block it is ordinary text ("#1 priority").
    if (!open && (m = RE_TITLE.exec(line))) {
      if (!seenBlock && result.title === null) result.title = (m[1] ?? '').trim().slice(0, 120) || null;
      else result.headings.push(lineNo);
      return;
    }
    // Chapter/section headings from PDFs and Word files: counted, never part of a question.
    // Inside an open question only ALL-CAPS headings count, so wrapped text like "Unit 2 ICU…" is kept.
    if (open ? isStrongHeading(line) : isHeading(line)) {
      result.headings.push(lineNo);
      firstHeading ??= line.slice(0, 120);
      return;
    }
    if (RE_SEP.test(line)) {
      // A glued "--N. …" split is undone when no choices/Answer follow: it was ordinary text.
      if (entry.glued && !questionFollows(i + 1)) {
        skipIdx = i + 1;
        if (open) appendText(open, entry.glued, lineNo);
        else result.warnings.push({ line: lineNo, message: `Line ${lineNo}: text outside a question was ignored ("${entry.glued.slice(0, 40)}").` });
        return;
      }
      finalize();
      return;
    }
    if (RE_UNDERSCORES.test(line)) {
      // Between questions it separates them; inside an unanswered question it is a fill-in-the-blank.
      if (!open || open.answerRaw !== null) finalize();
      else appendText(open, line, lineNo);
      return;
    }
    if ((m = RE_TYPE.exec(line))) {
      finalize();
      const t = parseDeclaredType(m[1] ?? '');
      if (!t) result.errors.push({ line: lineNo, message: `Line ${lineNo}: unknown type "${(m[1] ?? '').trim()}". Use priority, sata, mcq or flashcard.` });
      else pendingType = { type: t, line: lineNo };
      return;
    }
    if ((m = RE_Q.exec(line))) {
      startBlock(lineNo, 'flash', m[1] ?? '');
      return;
    }
    if ((m = RE_NUM.exec(line))) {
      const rest = m[2] ?? '';
      const q = RE_Q.exec(rest);
      if (q) {
        startBlock(lineNo, 'flash', q[1] ?? '');
        return;
      }
      // A numbered list inside a rationale ("1. Airway 2. Breathing") stays in the rationale
      // unless choices or an Answer line follow, which means a real new question starts here.
      if (open?.field === 'rationale' && !questionFollows(i)) {
        open.rationale?.push(line);
        result.warnings.push({ line: lineNo, message: `Line ${lineNo}: "${line.slice(0, 30)}" was kept as part of the rationale above (no choices or Answer: follow it).` });
        return;
      }
      startBlock(lineNo, 'numbered', rest);
      return;
    }

    const b = block as Block | null;
    if (!b) {
      // "2.A nurse…" (space lost in PDF extraction) starts a question when choices/Answer follow.
      if ((m = RE_NUM_LOOSE.exec(line)) && questionFollows(i)) {
        startBlock(lineNo, 'numbered', m[2] ?? '');
        return;
      }
      if (RE_CHOICE.test(line) || RE_ANSWER.test(line) || RE_RATIONALE.test(line) || RE_A.test(line)) {
        result.errors.push({ line: lineNo, message: `Line ${lineNo}: "${line.slice(0, 40)}" is not inside a numbered question.` });
      } else {
        result.warnings.push({ line: lineNo, message: `Line ${lineNo}: text outside a question was ignored ("${line.slice(0, 40)}").` });
      }
      return;
    }

    if ((m = RE_ANSWER.exec(line))) {
      if (b.answerRaw !== null) {
        const split = findSplit(b, i);
        if (split !== null) result.requests.push({ idx: split, blockLine: b.line });
        else b.errors.push({ line: lineNo, message: `Question at line ${b.line}: more than one "Answer:" line.` });
      }
      b.answerRaw = m[1] ?? '';
      b.answerLine = lineNo;
      b.lastAnswerIdx = i;
      b.field = 'answer';
      return;
    }
    if ((m = RE_RATIONALE.exec(line))) {
      b.rationale = [m[1] ?? ''];
      b.field = 'rationale';
      return;
    }
    if ((b.kind === 'flash' || b.declaredType === 'flashcard') && (m = RE_A.exec(line))) {
      b.back = [m[1] ?? ''];
      b.field = 'back';
      return;
    }
    if (b.kind === 'numbered' && b.field !== 'rationale' && b.field !== 'answer' && (m = RE_CHOICE.exec(line))) {
      const raw = m[1] ?? '';
      const rest = m[2] ?? '';
      const lower = raw.toLowerCase();
      const upper = raw !== lower;
      const expected = LETTERS[b.choices.length] ?? '';
      // A capital "X." is a choice only when it is the next expected letter, no Answer: has been
      // seen yet, the block's earlier choices were not lowercase, and it is not a wrapped
      // abbreviation such as "C. diff" or "E. coli". Lowercase markers keep the strict reading.
      const prevLowercase = b.choices.length > 0 && b.choices.every((c) => !c.upper);
      const upperIsChoice = lower === expected && b.answerRaw === null && !prevLowercase && !startsWithAbbreviatedTerm(rest);
      if (!upper || upperIsChoice) {
        b.choices.push({ letter: lower, upper, text: [rest], line: lineNo });
        b.field = 'choice';
        return;
      }
      if (b.field === 'choice') {
        result.warnings.push({ line: lineNo, message: `Line ${lineNo}: "${line.slice(0, 20)}" was read as part of the text above, not as choice "${raw}".` });
      }
    }

    appendText(b, line, lineNo);
  });

  finalize();
  if (pendingType) {
    const p = pendingType as { type: ItemType; line: number };
    result.errors.push({ line: p.line, message: `Line ${p.line}: "Type:" line is not followed by a question.` });
  }
  if (result.title === null && firstHeading) result.title = firstHeading;
  return result;
}

/** Upper bound on recovery passes; each pass can split every merged block once. */
const MAX_PASSES = 50;

export function parseReviewer(input: string): ParseResult {
  if (new TextEncoder().encode(input).length > MAX_IMPORT_BYTES) {
    return { title: null, items: [], errors: [{ line: 0, message: 'This text is larger than 2 MB. Split it into smaller parts and import them one at a time.' }], warnings: [] };
  }

  const lines = normalizeLines(input);
  const forced = new Set<number>();
  const recovered = new Map<number, number>();
  let pass = parsePass(lines, forced);
  for (let n = 1; n < MAX_PASSES && pass.requests.length > 0; n++) {
    let added = 0;
    for (const r of pass.requests) {
      if (forced.has(r.idx)) continue;
      forced.add(r.idx);
      // Attribute the split to the block it was found in; blocks keep their start line across passes.
      recovered.set(r.blockLine, (recovered.get(r.blockLine) ?? 0) + 1);
      added++;
    }
    if (added === 0) break;
    pass = parsePass(lines, forced);
  }
  // Anything still merged after the last pass is reported, never dropped.
  for (const r of pass.requests) {
    pass.errors.push({ line: r.blockLine, message: `Question at line ${r.blockLine}: more than one "Answer:" line.` });
  }

  const result: ParseResult = { title: pass.title, items: pass.items, errors: pass.errors, warnings: pass.warnings };
  for (const [line, count] of recovered) {
    result.warnings.push({ line, message: `Recovered ${count} ${count === 1 ? 'question' : 'questions'} from a merged block near line ${line}.` });
  }
  const h = pass.headings;
  if (h.length > 0) {
    const shown = h.slice(0, 10).join(', ') + (h.length > 10 ? ', …' : '');
    result.warnings.push({ line: 0, message: `${h.length} heading ${h.length === 1 ? 'line' : 'lines'} ignored (${h.length === 1 ? 'line' : 'lines'} ${shown}).` });
  }
  if (result.items.length === 0 && result.errors.length === 0) {
    result.errors.push({ line: 0, message: 'No questions found. Paste text in the format shown below, or use the BYO-AI prompt.' });
  }
  result.errors.sort((a, b) => a.line - b.line);
  result.warnings.sort((a, b) => a.line - b.line);
  return result;
}
