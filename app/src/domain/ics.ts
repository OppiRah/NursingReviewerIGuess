/**
 * Daily calendar reminder as an RFC 5545 iCalendar file (ADR-001 amendment 1).
 * CRLF line endings, 75-octet line folding, floating local DTSTART, daily RRULE,
 * and a VALARM (ACTION:DISPLAY, TRIGGER:PT0M) so the calendar alerts at start time.
 */

export interface ReminderOptions {
  /** Local time, 'HH:MM' (24h). */
  time: string;
  /** Used for DTSTAMP and to pick the start date. */
  now: Date;
  uid: string;
  summary?: string;
  description?: string;
}

/** RFC 5545 §3.3.11 TEXT escaping. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 §3.1: fold lines longer than 75 octets; continuation lines start with one space. Never splits a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (currentBytes + b > limit) {
      out.push(current);
      current = '';
      currentBytes = 0;
      limit = 74; // the leading space counts toward the 75 octets
    }
    current += ch;
    currentBytes += b;
  }
  out.push(current);
  return out.join('\r\n ');
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function parseTime(time: string): { h: number; m: number } {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!m) throw new Error(`Invalid time "${time}", expected HH:MM`);
  return { h: Number(m[1]), m: Number(m[2]) };
}

export function buildDailyReminderIcs(opts: ReminderOptions): string {
  const { h, m } = parseTime(opts.time);
  const d = opts.now;
  // Floating local time (no Z, no TZID): the event stays at this wall-clock time wherever the phone is.
  const dtstart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
  const summary = opts.summary ?? 'Review time (5 minutes)';
  const description = opts.description ?? 'Open your reviewer app and do today\'s short session.';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nursing Reviewer//Daily Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    // Same UID + higher SEQUENCE lets calendars treat a re-download as an update of the same event.
    `SEQUENCE:${Math.floor(d.getTime() / 1000)}`,
    `DTSTAMP:${utcStamp(d)}`,
    `DTSTART:${dtstart}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
