/**
 * Paste/extraction tolerance (BUILD-005, ADR-002 "Addendum BUILD-005").
 * Turns raw text (typed, pasted, or extracted from a PDF/DOCX) into lines the parser can read,
 * while keeping every output line mapped to its ORIGINAL line number, so errors still point at
 * the right line in the editable preview.
 * Pure function, no DOM.
 */

export interface NormLine {
  /** Normalized, trimmed text. */
  text: string;
  /** 1-based line number in the original input. */
  line: number;
  /**
   * Set on a separator produced by splitting a glued "--N. …" line: the original line text.
   * The parser undoes the split when no choices/Answer follow (e.g. "--5. mg is too high" in a rationale).
   */
  glued?: string;
  /**
   * Chatbot small talk. 'opener' ("Here are your questions:", "Sure!") is ignored only outside a question;
   * 'signoff' ("Let me know…", "Hope this helps") may also end a finished question.
   */
  chatty?: 'opener' | 'signoff';
  /**
   * The line before chatbot clean-up rewrote its structure (a removed list/heading marker or a
   * "Q1:"/"Question 1:" number). Inside a rationale the parser keeps this original text instead.
   */
  orig?: string;
  /** The rewrite removed a markdown heading marker ("## 1. Cardio"): a heading unless a question follows. */
  fromHash?: boolean;
}

// ---------- Chatbot output (BUILD-006) ----------

/** ``` or ~~~ fence, optionally with a language tag. */
const FENCE = /^(?:`{3,}|~{3,})\s*[\w+.-]*\s*$/;
const LABEL = 'correct\\s+answer|answer|ans|rationale|explanation|reason';
/** Lines that carry structure: numbered/Q-numbered questions, choices, labels. */
const RE_STRUCT = new RegExp(`^(?:\\d{1,4}[.)]|(?:q|question)\\s*\\d{1,4}(?:\\s*[.:)]|$)|[a-h][.)]\\s|(?:${LABEL})\\s*:|q\\s*:|a\\s*:|type\\s*:)`, 'i');
const LIST_OR_HEADING_MARKER = /^(?:[-*+]\s+|#{2,6}\s+)(.*)$/;
const WHOLE_LINE_EMPHASIS = /^(\*\*|__|\*|_)(?=\S)(.*\S)\1$/;
/** "**Answer:** b", "*Rationale:* x", "**Q1.** text", "**1.** text" */
const EMPHASIZED_PREFIX = new RegExp(`^(\\*\\*|__|\\*|_)((?:${LABEL})\\s*:|(?:(?:q|question)\\s*)?\\d{1,4}\\s*[.):])\\1\\s*`, 'i');
/** "**Answer**: b" */
const EMPHASIZED_LABEL_BEFORE_COLON = new RegExp(`^(\\*\\*|__|\\*|_)(${LABEL})\\1\\s*:\\s*`, 'i');
/** "Q1. text", "Question 1: text" (a space is required after the mark, so "Q2.5 units" is left alone), or a bare "Question 1". */
const Q_NUMBER = /^(?:q|question)\s*(\d{1,4})(?:\s*[.:)](?:\s+(.*))?|\s*)$/i;
const CHATTY_OPENER = /^(?:here\s+(?:are|is)\b|below\s+(?:are|is)\b|sure[!,.]|certainly[!,.]|of course[!,.]|okay[!,.]|ok[!,.])/i;
const CHATTY_SIGNOFF = /^(?:let me know\b|i hope\b|hope this helps\b|feel free\b|would you like\b|do you want me\b|if you(?:'d| would) like\b|happy to help\b|good luck\b)/i;

/** Remove bold/italic wrappers that chatbots add around whole lines or label prefixes. Never inside words. */
function stripEmphasis(t: string): string {
  let s = t;
  for (let k = 0; k < 3; k++) {
    const m = WHOLE_LINE_EMPHASIS.exec(s);
    // Only a real wrapper: "**a** **b**" starts and ends with ** but is two bold runs, not one.
    if (!m || !/[A-Za-z0-9]/.test(m[2] ?? '') || (m[2] ?? '').includes(m[1] ?? '')) break;
    s = (m[2] ?? '').trim();
  }
  s = s.replace(EMPHASIZED_PREFIX, (_all, _w: string, label: string) => `${label} `);
  s = s.replace(EMPHASIZED_LABEL_BEFORE_COLON, (_all, _w: string, label: string) => `${label}: `);
  // Inline bold anywhere ("a. **Alpha**"); double underscores only at word boundaries (not snake__case).
  s = s.replace(/\*\*(?=\S)([^*]+?)(?<=\S)\*\*/g, '$1');
  s = s.replace(/(^|[^\w])__(?=\S)([^_]+?)(?<=\S)__(?![\w])/g, '$1$2');
  return s.trim();
}

interface Cleaned {
  text: string;
  /** Structure was rewritten (a marker removed or a Q-number converted). */
  rewritten: boolean;
  fromHash: boolean;
  /** Converted from a "Q1:"-style number (a flashcard if an "A:" line follows). */
  qNumbered: boolean;
}

function clean(text: string): Cleaned {
  let s = stripEmphasis(text);
  let rewritten = false;
  let fromHash = false;
  let qNumbered = false;
  const marker = LIST_OR_HEADING_MARKER.exec(s);
  if (marker) {
    const rest = stripEmphasis(marker[1] ?? '');
    if (RE_STRUCT.test(rest)) {
      fromHash = s.startsWith('#');
      s = rest;
      rewritten = true;
    }
  }
  const q = Q_NUMBER.exec(s);
  if (q) {
    s = q[2] ? `${q[1]}. ${q[2]}` : `${q[1]}.`;
    rewritten = true;
    qNumbered = true;
  }
  s = s.replace(/^ans\s*:\s*/i, 'Answer: ').replace(/^reason\s*:\s*/i, 'Rationale: ');
  return { text: s.trim(), rewritten, fromHash, qNumbered };
}

/** Normalize one line of chatbot output into the canonical format. */
export function cleanChatbotLine(text: string): string {
  return clean(text).text;
}

export function chattyKind(text: string): 'opener' | 'signoff' | null {
  if (text.length > 200) return null;
  if (CHATTY_SIGNOFF.test(text)) return 'signoff';
  if (CHATTY_OPENER.test(text)) return 'opener';
  return null;
}

const ZERO_WIDTH = /[​-‍⁠﻿­]/g; // ZW space/joiners, word joiner, BOM, soft hyphen
const NBSP = /[   ]/g;
const LEADING_BULLET = /^[•●◦▪‣∙·]\s*/;
/** A separator glued to the next question: "--2. A nurse…", "---12) Which…". */
const GLUED_SEPARATOR = /^-{2,}\s*(\d{1,4}[.)]\s*\S.*)$/;
/**
 * A whole-line separator written with other dash glyphs: "———", "–––".
 * Underscore lines ("____") are left alone here: they may be a fill-in-the-blank; the parser decides.
 */
const ALT_SEPARATOR = /^[—–]{3,}$/;

export const SEPARATOR = '---';

/** Normalize one physical line (no newlines inside). */
function cleanLine(s: string): string {
  return s.replace(ZERO_WIDTH, '').replace(NBSP, ' ').replace(/\t/g, ' ').trim().replace(LEADING_BULLET, '').trimEnd();
}

/**
 * Normalize raw input into parser-ready lines.
 * - CRLF/CR → LF; BOM, zero-width characters and soft hyphens removed; NBSP → space.
 * - Form feeds (PDF page breaks) split a line in two; both halves keep the original line number.
 * - Leading bullet glyphs (•, ●, ◦ …) removed; trailing whitespace trimmed.
 * - "--2. Question" becomes a separator line plus "2. Question".
 * - Lines of only — or – (3 or more) become a separator. Underscore lines are decided by the parser.
 * - Chatbot output (BUILD-006): code fences become separators; bold/italic wrappers and list/heading
 *   markers before structure are removed; "Q1:", "Question 1." become "1."; "Ans:" → "Answer:",
 *   "Reason:" → "Rationale:"; small-talk lines are flagged `chatty`.
 */
export function normalizeLines(input: string): NormLine[] {
  const out: NormLine[] = [];
  const qNumbered: number[] = [];
  const physical = input.replace(/\r\n?/g, '\n').split('\n');
  physical.forEach((raw, i) => {
    const line = i + 1;
    for (const piece of raw.split(/[\f\v]/)) {
      const cleaned = cleanLine(piece);
      if (!cleaned) {
        out.push({ text: '', line });
        continue;
      }
      // A code fence (chatbots wrap answers in ``` … ```) ends whatever came before it.
      if (FENCE.test(cleaned)) {
        out.push({ text: SEPARATOR, line });
        continue;
      }
      const c = clean(cleaned);
      const text = c.text;
      if (!text) {
        out.push({ text: '', line });
        continue;
      }
      const chatty = chattyKind(text);
      if (chatty) {
        out.push({ text, line, chatty });
        continue;
      }
      if (c.rewritten) {
        const entry: NormLine = { text, line, orig: cleaned };
        if (c.fromHash) entry.fromHash = true;
        if (c.qNumbered) qNumbered.push(out.length);
        out.push(entry);
        continue;
      }
      if (ALT_SEPARATOR.test(text)) {
        out.push({ text: SEPARATOR, line });
        continue;
      }
      const glued = GLUED_SEPARATOR.exec(text);
      if (glued) {
        out.push({ text: SEPARATOR, line, glued: text }, { text: (glued[1] ?? '').trim(), line });
        continue;
      }
      out.push({ text, line });
    }
  });
  // "Q1: What is K?" followed by "A: 3.5-5" is a flashcard, not a numbered question.
  for (const idx of qNumbered) {
    for (let j = idx + 1; j < out.length; j++) {
      const t = out[j]?.text ?? '';
      if (!t) continue;
      if (/^a\s*:/i.test(t)) {
        const e = out[idx];
        if (e) e.text = e.text.replace(/^\d{1,4}\.\s*/, 'Q: ');
      }
      break;
    }
  }
  return out;
}

/**
 * Chapter/section headings that PDFs and Word files carry between questions:
 * "CHAPTER 3", "Chapter IV: Cardio", "SECTION 1: Fundamentals", "Unit 2 – Maternal".
 * A keyword plus a number/roman numeral (or a colon) is required, so prose like
 * "section of the heart" is never treated as a heading.
 */
const RE_HEADING_KEYWORD = /^(?:chapter|section|unit|part|module|lesson|topic)\b\s*(.*)$/i;
const RE_HEADING_NUMBER = /^(\d{1,3}|[IVXLC]{1,6}|[ivxlc]{1,6})\b(.*)$/;

/**
 * Inside an open question only an ALL-CAPS keyword counts ("CHAPTER 2", "SECTION 3: …"), so wrapped
 * text such as "Unit 2 ICU is required." or "topic: insulin" stays part of the question or rationale.
 */
export function isStrongHeading(text: string): boolean {
  return /^(?:CHAPTER|SECTION|UNIT|PART|MODULE|LESSON|TOPIC)\b/.test(text) && isHeading(text);
}

export function isHeading(text: string): boolean {
  if (text.length > 100) return false;
  const kw = RE_HEADING_KEYWORD.exec(text);
  if (!kw) return false;
  const rest = kw[1] ?? '';
  if (/^:\s*\S/.test(rest)) return true; // "Topic: Cardio"
  const num = RE_HEADING_NUMBER.exec(rest);
  if (!num) return false;
  const tail = (num[2] ?? '').trim();
  // Case-sensitive on purpose: "Unit 2 Maternal" is a heading, "Part 2 of the cell" is prose.
  return tail === '' || /^[:.\-–—)]/.test(tail) || /^[A-Z0-9]/.test(tail);
}
