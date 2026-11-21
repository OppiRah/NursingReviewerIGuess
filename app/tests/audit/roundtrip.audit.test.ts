/**
 * AUDIT-001 area 1: property-style round-trip. Synthetic decks → import text with format noise → parse.
 * Outcomes per deck: exact | rejected (errors shown, nothing silently wrong) | SILENT (items differ, no error).
 * SILENT is the harmful class: the student would study a wrong answer/rationale without being told.
 */
import { describe, expect, it } from 'vitest';
import { parseReviewer, type ParsedItem } from '../../src/domain/parser';
import { genDeck, genStyle, rng, serialize, type GenItem, type Style } from './gen';

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

function diff(expected: GenItem[], got: ParsedItem[]): string | null {
  if (expected.length !== got.length) return `item count ${got.length} != ${expected.length}`;
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i] as GenItem;
    const g = got[i] as ParsedItem;
    if (e.type !== g.type) return `#${i + 1} type ${g.type} != ${e.type}`;
    if (norm(e.question) !== g.question) return `#${i + 1} question "${g.question}" != "${norm(e.question)}"`;
    if (JSON.stringify(e.choices.map(norm)) !== JSON.stringify(g.choices)) return `#${i + 1} choices ${JSON.stringify(g.choices)} != ${JSON.stringify(e.choices)}`;
    if (JSON.stringify(e.answer) !== JSON.stringify(g.answer)) return `#${i + 1} ANSWER ${JSON.stringify(g.answer)} != ${JSON.stringify(e.answer)}`;
    if (norm(e.back) !== g.back) return `#${i + 1} back "${g.back}" != "${e.back}"`;
    if (norm(e.rationale) !== g.rationale) return `#${i + 1} rationale "${g.rationale}" != "${norm(e.rationale)}"`;
  }
  return null;
}

interface Tally {
  exact: number;
  rejected: number;
  silent: { seed: number; style: Style; why: string; text: string }[];
  rejects: { seed: number; style: Style; err: string }[];
}

function run(seeds: number, base: number, hazard: number, wrap: boolean): Tally {
  const t: Tally = { exact: 0, rejected: 0, silent: [], rejects: [] };
  for (let s = 0; s < seeds; s++) {
    const r = rng(base + s);
    const deck = genDeck(r, 1 + Math.floor(r() * 8), hazard);
    const style = genStyle(r, wrap);
    const text = serialize(deck, style);
    const res = parseReviewer(text);
    const d = diff(deck, res.items);
    if (!d) {
      if (res.errors.length === 0) t.exact++;
      else {
        t.rejected++;
        t.rejects.push({ seed: base + s, style, err: res.errors[0]?.message ?? '' });
      }
    } else if (res.errors.length > 0) {
      t.rejected++;
      t.rejects.push({ seed: base + s, style, err: res.errors[0]?.message ?? '' });
    } else t.silent.push({ seed: base + s, style, why: d, text });
  }
  return t;
}

function report(name: string, t: Tally): void {
  const by = new Map<string, number>();
  for (const x of t.rejects) {
    const k = `num=${x.style.num} choice=${x.style.choice} ans=${x.style.answer} sep=${JSON.stringify(x.style.sep)}`;
    by.set(k, (by.get(k) ?? 0) + 1);
  }
  console.log(`\n[${name}] exact=${t.exact} rejected=${t.rejected} SILENT=${t.silent.length}`);
  for (const x of t.silent.slice(0, 8)) console.log(`  SILENT seed=${x.seed} ${x.why}\n    style=${JSON.stringify(x.style)}`);
  const keyCount = (f: (s: Style) => string): string =>
    [...t.rejects.reduce((m, x) => m.set(f(x.style), (m.get(f(x.style)) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${v}`).join('  ');
  if (t.rejects.length) {
    console.log(`  rejects by num:    ${keyCount((s) => s.num)}`);
    console.log(`  rejects by answer: ${keyCount((s) => s.answer)}`);
    console.log(`  rejects by sep:    ${keyCount((s) => JSON.stringify(s.sep))}`);
    console.log(`  rejects by choice: ${keyCount((s) => s.choice)}`);
    for (const x of t.rejects.slice(0, 5)) console.log(`  e.g. seed=${x.seed}: ${x.err}`);
  }
}

describe('AUDIT-001 round-trip (seeded, 3 tiers)', () => {
  it('T1 clean content + format noise: never silently different', () => {
    const t = run(1500, 1000, 0, false);
    report('T1 clean content, format noise', t);
    expect(t.silent, 'silent mismatches').toHaveLength(0);
  });

  it('T2 clean content + PDF-style line wrapping: never silently different', () => {
    const t = run(1500, 50_000, 0, true);
    report('T2 clean content, wrapped lines', t);
    expect(t.silent, 'silent mismatches').toHaveLength(0);
  });

  it('T3 hazard tokens + wrapping (adversarial): report silent mismatches', () => {
    const t = run(1500, 90_000, 0.08, true);
    report('T3 hazard tokens, wrapped lines', t);
    expect(t.silent, 'silent mismatches').toHaveLength(0);
  });
});
