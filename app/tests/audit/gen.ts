/** AUDIT-001: seeded synthetic deck generator + serializers with chatbot/PDF noise. No dependencies. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
export const int = (r: () => number, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

export interface GenItem {
  type: 'mcq' | 'sata' | 'priority' | 'flashcard';
  question: string;
  choices: string[];
  answer: number[];
  back: string;
  rationale: string;
}

const SAFE = ['client', 'nurse', 'assess', 'airway', 'monitor', 'sample', 'value', 'fluid', 'balance', 'priority', 'intervention', 'record', 'observe', 'report', 'pressure', 'pulse', 'rate', 'synthetic', 'placeholder', 'finding', 'expected', 'before', 'after', 'during', 'with', 'the', 'of', 'and', 'for', 'is', 'low', 'high', '120/80', '2.5', 'mg', '(sample)', 'x-ray', "client's"];
/** Tokens that look like structure when a wrapped line starts with them. */
const HAZARD = ['type: O negative', 'answer: none of these', 'reason: low oxygen', 'A: fib', 'Unit 2 ICU', 'Here is why', 'Sure, the', 'Let me know the', 'e.g.', '1. assess', '2) check', 'TOPIC 3', 'PART 2: fluids', 'a. fib', 'b. i. d.', 'Q: what', '- then', '# 1 priority', 'C. diff', 'Question 2: asks', 'Explanation: none', '**bold**', '_under_', '---', '10. mg'];

function sentence(r: () => number, n: number, hazard: number): string {
  const w: string[] = [];
  for (let i = 0; i < n; i++) w.push(r() < hazard ? pick(r, HAZARD) : pick(r, SAFE));
  const s = w.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function genDeck(r: () => number, n: number, hazard = 0): GenItem[] {
  const out: GenItem[] = [];
  for (let i = 0; i < n; i++) {
    const roll = r();
    const type: GenItem['type'] = roll < 0.55 ? 'mcq' : roll < 0.75 ? 'sata' : roll < 0.88 ? 'priority' : 'flashcard';
    // Unique marker per field so a mix-up between questions is always detectable.
    const tag = `i${i}`;
    const question = `${sentence(r, int(r, 5, 18), hazard)} ${tag}q?`;
    const rationale = r() < 0.9 ? `${sentence(r, int(r, 4, 30), hazard)} ${tag}r.` : '';
    if (type === 'flashcard') {
      out.push({ type, question, choices: [], answer: [], back: `${sentence(r, int(r, 1, 6), hazard)} ${tag}b`, rationale });
      continue;
    }
    const nc = int(r, type === 'sata' ? 3 : 2, 6);
    const choices = Array.from({ length: nc }, (_, k) => `${sentence(r, int(r, 1, 7), hazard)} ${tag}c${k}`);
    let answer: number[];
    if (type === 'sata') {
      const k = int(r, 2, nc);
      const idx = Array.from({ length: nc }, (_, j) => j);
      for (let j = idx.length - 1; j > 0; j--) {
        const s = int(r, 0, j);
        [idx[j], idx[s]] = [idx[s] as number, idx[j] as number];
      }
      answer = idx.slice(0, k).sort((a, b) => a - b);
    } else answer = [int(r, 0, nc - 1)];
    out.push({ type, question, choices, answer, back: '', rationale });
  }
  return out;
}

export interface Style {
  num: string;
  choice: string;
  answer: string;
  multi: string;
  rat: string;
  sep: string;
  eol: string;
  wrap: 'none' | 'fence' | 'chatty' | 'both';
  flashNum: boolean;
  wrapWidth: number;
}
export const NUMS = ['1.', '1)', 'Q1.', 'Q1:', 'Question 1:', 'Question 1.', '**1.**', '**Q1.**', '### 1.', '**Question 1:**'] as const;
export const CHOICES = ['a.', 'a)', 'A.', 'A)', '- a.', '* a)', '- A.'] as const;
export const ANSWERS = ['Answer: b', '**Answer:** b', 'Correct answer: B', 'Ans: (b)', 'Answer: b. TEXT', 'Answer: B - TEXT', 'Answer: Option B', '**Correct Answer:** B', 'answer: b', 'Answer: b) TEXT'] as const;
export const MULTIS = ['a, c', 'A and C', 'a c', 'Options A and C', 'A, C.', 'a; c', '(a), (c)'] as const;
export const RATS = ['Rationale:', 'Explanation:', 'Reason:', '**Rationale:**', '*Explanation:*', 'rationale:'] as const;
export const SEPS = ['---', '', 'blank', '\f', '———', '___'] as const;

export function genStyle(r: () => number, wrap = false): Style {
  return {
    num: pick(r, NUMS),
    choice: pick(r, CHOICES),
    answer: pick(r, ANSWERS),
    multi: pick(r, MULTIS),
    rat: pick(r, RATS),
    sep: pick(r, SEPS),
    eol: r() < 0.3 ? '\r\n' : '\n',
    wrap: pick(r, ['none', 'fence', 'chatty', 'both'] as const),
    flashNum: r() < 0.3,
    wrapWidth: wrap ? int(r, 25, 70) : 0,
  };
}

const L = 'abcdefgh';
const letterAt = (i: number, upper: boolean): string => {
  const l = L.charAt(i);
  return upper ? l.toUpperCase() : l;
};

function wrapText(s: string, width: number): string[] {
  if (!width) return [s];
  const lines: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if (cur && (cur + ' ' + w).length > width) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function serialize(deck: GenItem[], st: Style): string {
  const lines: string[] = [];
  if (st.wrap === 'chatty' || st.wrap === 'both') lines.push('Sure! Here are your practice questions:', '');
  if (st.wrap === 'fence' || st.wrap === 'both') lines.push('```text');
  lines.push('# Synthetic Deck');
  deck.forEach((it, i) => {
    const n = String(i + 1);
    if (it.type === 'flashcard') {
      lines.push(...wrapText(`${st.flashNum ? `Q${n}:` : 'Q:'} ${it.question}`, st.wrapWidth), ...wrapText(`A: ${it.back}`, st.wrapWidth));
    } else {
      if (it.type === 'priority') lines.push('Type: priority');
      lines.push(...wrapText(`${st.num.replace('1', n)} ${it.question}`, st.wrapWidth));
      const upper = st.choice.includes('A');
      it.choices.forEach((c, k) => lines.push(...wrapText(`${st.choice.replace(/a/i, letterAt(k, upper))} ${c}`, st.wrapWidth)));
      if (it.answer.length > 1) {
        const up = /[AC]/.test(st.multi);
        let txt: string;
        if (it.answer.length === 2) {
          txt = st.multi
            .replace(/\ba\b/i, letterAt(it.answer[0] ?? 0, up))
            .replace(/\bc\b(?=[^a-z]*$)/i, letterAt(it.answer[1] ?? 0, up));
        } else txt = it.answer.map((a) => letterAt(a, false)).join(', ');
        lines.push(`Answer: ${txt}`);
      } else {
        const a = it.answer[0] ?? 0;
        lines.push(st.answer.replace(/\bb\b/, letterAt(a, false)).replace(/\bB\b/, letterAt(a, true)).replace('TEXT', it.choices[a] ?? ''));
      }
    }
    if (it.rationale) lines.push(...wrapText(`${st.rat} ${it.rationale}`, st.wrapWidth));
    if (st.sep === 'blank') lines.push('');
    else if (st.sep === '\f') lines[lines.length - 1] += '\f';
    else if (st.sep) lines.push(st.sep);
  });
  if (st.wrap === 'fence' || st.wrap === 'both') lines.push('```');
  if (st.wrap === 'chatty' || st.wrap === 'both') lines.push('', 'Let me know if you want more questions!');
  return lines.join(st.eol);
}
