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
 */
export function normalizeLines(input: string): NormLine[] {
  const out: NormLine[] = [];
  const physical = input.replace(/\r\n?/g, '\n').split('\n');
  physical.forEach((raw, i) => {
    const line = i + 1;
    for (const piece of raw.split(/[\f\v]/)) {
      const text = cleanLine(piece);
      if (!text) {
        out.push({ text: '', line });
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
