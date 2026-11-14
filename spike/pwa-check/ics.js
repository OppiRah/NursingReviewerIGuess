// iCalendar (RFC 5545) generation and checks for SPIKE-001 (throwaway).
// Pure functions: no DOM, so they can also be checked outside the browser.
const CRLF = '\r\n';
const enc = new TextEncoder();

const pad = (n) => String(n).padStart(2, '0');

function utcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// Floating local time (no TZID): calendars read it as the device's local time.
function floatingStamp(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

// Fold a content line at 75 octets without splitting a UTF-8 character.
export function foldLine(line) {
  const parts = [];
  let current = '';
  let octets = 0;
  let limit = 75;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
      limit = 74; // continuation lines start with one space
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF + ' ');
}

// First occurrence: today at hh:mm if still ahead, else tomorrow.
export function firstOccurrence(hour, minute, now = new Date()) {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

export function buildIcs({ hour, minute, now = new Date(), uid }) {
  const start = firstOccurrence(hour, minute, now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SPIKE-001//PWA Check//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid || `${now.getTime()}-review-reminder@pwa-check.invalid`}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${floatingStamp(start)}`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Nursing review — 5 min',
    'DESCRIPTION:Open the review app and finish today\'s 5-minute session. This calendar reminder was created by a throwaway test (SPIKE-001).',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Nursing review — 5 min',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

export function validateIcs(text) {
  const errors = [];
  if (!text.endsWith(CRLF)) errors.push('does not end with CRLF');
  if (/[^\r]\n/.test(text) || text.startsWith('\n')) errors.push('bare LF line ending found');
  const physical = text.split(CRLF).slice(0, -1);
  physical.forEach((l, i) => {
    if (enc.encode(l).length > 75) errors.push(`line ${i + 1} longer than 75 octets`);
  });
  const unfolded = text.replace(/\r\n[ \t]/g, '');
  const required = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:', 'BEGIN:VEVENT', 'UID:', 'DTSTAMP:',
    'DTSTART:', 'DURATION:PT5M', 'RRULE:FREQ=DAILY', 'SUMMARY:Nursing review — 5 min',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  for (const r of required) if (!unfolded.includes(r)) errors.push(`missing ${r}`);
  return { ok: errors.length === 0, errors };
}
