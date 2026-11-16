import { describe, expect, it } from 'vitest';
import { buildDailyReminderIcs, escapeText, foldLine } from '../../src/domain/ics';

const NOW = new Date(2026, 10, 14, 8, 30, 0); // local time
const ics = buildDailyReminderIcs({ time: '19:05', now: NOW, uid: 'test-uid-123@nursing-reviewer.local' });
const lines = ics.split('\r\n');

describe('daily reminder .ics (RFC 5545)', () => {
  it('uses CRLF line endings only, ending with CRLF', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('wraps a VEVENT in a VCALENDAR with VERSION and PRODID', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines.some((l) => l.startsWith('PRODID:'))).toBe(true);
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain('END:VEVENT');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
  });

  it('has UID, a UTC DTSTAMP and a floating local DTSTART at the chosen time', () => {
    expect(lines).toContain('UID:test-uid-123@nursing-reviewer.local');
    expect(lines.find((l) => l.startsWith('DTSTAMP:'))).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
    expect(lines).toContain('DTSTART:20261114T190500');
    expect(lines.find((l) => l.startsWith('DTSTART'))).not.toMatch(/Z$|TZID/);
  });

  it('repeats daily and alerts at start with a display alarm', () => {
    expect(lines).toContain('RRULE:FREQ=DAILY');
    const a = lines.indexOf('BEGIN:VALARM');
    const b = lines.indexOf('END:VALARM');
    expect(a).toBeGreaterThan(lines.indexOf('BEGIN:VEVENT'));
    expect(b).toBeLessThan(lines.indexOf('END:VEVENT'));
    const alarm = lines.slice(a, b);
    expect(alarm).toContain('ACTION:DISPLAY');
    expect(alarm).toContain('TRIGGER:PT0M');
    expect(alarm.some((l) => l.startsWith('DESCRIPTION:'))).toBe(true);
  });

  it('no line is longer than 75 octets', () => {
    const long = buildDailyReminderIcs({ time: '07:00', now: NOW, uid: 'u', description: 'Ñ'.repeat(120) + ' long description, with; special chars' });
    for (const l of long.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it('rejects a malformed time', () => {
    expect(() => buildDailyReminderIcs({ time: '25:00', now: NOW, uid: 'u' })).toThrow();
  });
});

describe('foldLine / escapeText', () => {
  it('folds at 75 octets with a leading space and unfolds back to the original', () => {
    const line = 'DESCRIPTION:' + 'x'.repeat(200);
    const folded = foldLine(line);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]).toHaveLength(75);
    for (const p of parts.slice(1)) {
      expect(p.startsWith(' ')).toBe(true);
      expect(p.length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('never splits a multi-byte character', () => {
    const line = 'SUMMARY:' + 'é'.repeat(80);
    const folded = foldLine(line);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
    for (const p of folded.split('\r\n')) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
  });

  it('short lines are unchanged', () => {
    expect(foldLine('VERSION:2.0')).toBe('VERSION:2.0');
  });

  it('escapes backslash, semicolon, comma and newline', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
});
