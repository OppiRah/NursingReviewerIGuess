import { describe, expect, it } from 'vitest';
import { cleanChatbotLine, normalizeLines } from '../../src/domain/normalize';
import { parseAnswerLetters, parseReviewer } from '../../src/domain/parser';
import fencedBold from '../../e2e/fixtures/chatbot-fenced-bold.txt?raw';
import chatgptBold from '../../e2e/fixtures/chatbot-chatgpt-bold.txt?raw';
import questionN from '../../e2e/fixtures/chatbot-question-n.txt?raw';
import explanation from '../../e2e/fixtures/chatbot-explanation.txt?raw';
import proseNotes from '../../e2e/fixtures/prose-notes.txt?raw';

describe('chatbot output: one rule at a time', () => {
  it('code fences (``` and ~~~, with or without a language) become separators', () => {
    expect(normalizeLines('```\nx\n```json\n~~~\n~~~text').map((l) => l.text)).toEqual(['---', 'x', '---', '---', '---']);
  });

  it('strips **, __, * and _ wrapped around whole lines', () => {
    expect(cleanChatbotLine('**1. Which finding is expected?**')).toBe('1. Which finding is expected?');
    expect(cleanChatbotLine('__2. Second?__')).toBe('2. Second?');
    expect(cleanChatbotLine('*Answer: b*')).toBe('Answer: b');
    expect(cleanChatbotLine('_Rationale: because_')).toBe('Rationale: because');
  });

  it('strips emphasis around label prefixes and inline bold runs', () => {
    expect(cleanChatbotLine('**Answer:** b')).toBe('Answer: b');
    expect(cleanChatbotLine('*Rationale:* text')).toBe('Rationale: text');
    expect(cleanChatbotLine('**Answer**: c')).toBe('Answer: c');
    expect(cleanChatbotLine('**Correct answer:** **B - Beta**')).toBe('Correct answer: B - Beta');
    expect(cleanChatbotLine('a. **Alpha** wave')).toBe('a. Alpha wave');
  });

  it('never strips underscores inside words', () => {
    expect(cleanChatbotLine('Rationale: use sample_value_x and snake__case here')).toBe('Rationale: use sample_value_x and snake__case here');
    expect(cleanChatbotLine('______')).toBe('______');
  });

  it('removes - , * and ### markers only before question structure', () => {
    expect(cleanChatbotLine('- a. Alpha')).toBe('a. Alpha');
    expect(cleanChatbotLine('* 3. Third?')).toBe('3. Third?');
    expect(cleanChatbotLine('### 4. Fourth?')).toBe('4. Fourth?');
    expect(cleanChatbotLine('- just a note')).toBe('- just a note');
  });

  it.each([
    ['1. Q', '1. Q'],
    ['1) Q', '1) Q'],
    ['Q1. Q', '1. Q'],
    ['Q1: Q', '1. Q'],
    ['Question 1: Q', '1. Q'],
    ['Question 1. Q', '1. Q'],
    ['Question 12:', '12.'],
  ])('question number form %s → %s', (input, out) => expect(cleanChatbotLine(input)).toBe(out));

  it('accepts Ans: and Reason: as Answer: and Rationale:', () => {
    expect(cleanChatbotLine('Ans: b')).toBe('Answer: b');
    expect(cleanChatbotLine('reason: x')).toBe('Rationale: x');
    const r = parseReviewer('1. Q?\na. x\nb. y\nCorrect answer: b\nExplanation: e1\nReason: e2');
    expect(r.items[0]).toMatchObject({ answer: [1], rationale: 'e1 e2' });
  });

  it.each([
    ['b', ['b']],
    ['B', ['b']],
    ['(b)', ['b']],
    ['b.', ['b']],
    ['b) Beta', ['b']],
    ['B - Beta', ['b']],
    ['Option B', ['b']],
    ['option b: Beta', ['b']],
    ['Options A and C', ['a', 'c']],
  ])('answer value %s → %j', (raw, letters) => expect(parseAnswerLetters(raw)).toEqual(letters));

  it('chatty lines before the first and after the last question become one summary warning', () => {
    const r = parseReviewer('Sure! Here you go.\n\n1. Q?\na. x\nb. y\nAnswer: a\nRationale: r\n\nLet me know if you want more!\nI hope this helps.');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.rationale).toBe('r');
    expect(r.warnings.map((w) => w.message)).toEqual(['3 lines outside the questions ignored (lines 1, 9, 10).']);
  });

  it('a chatty-looking line inside a question is kept', () => {
    const r = parseReviewer('1. A sample stem.\nHere is the sample scenario: which is first?\na. x\nb. y\nAnswer: a\nRationale: r');
    expect(r.items[0]?.question).toBe('A sample stem. Here is the sample scenario: which is first?');
  });
});

describe('chatbot output: whole samples', () => {
  it('ACCEPTANCE: the fenced, bolded sample gives 2 items and 0 errors', () => {
    const r = parseReviewer(fencedBold);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(2);
    expect(r.title).toBe('Hema');
    expect(r.items[0]).toMatchObject({ question: 'Which finding is expected?', choices: ['Alpha', 'Beta', 'Gamma', 'Delta'], answer: [1], rationale: 'Because beta.' });
    expect(r.items[1]).toMatchObject({ question: 'Second question here', choices: ['one', 'two'], answer: [0], rationale: 'ok' });
  });

  it('ChatGPT-like bold, list markers and ### heading parse fully', () => {
    const r = parseReviewer(chatgptBold);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(3);
    expect(r.title).toBe('Sample Deck: Fluids');
    expect(r.items[0]).toMatchObject({ question: 'A sample client shows sample sign X. What should the nurse do first?', answer: [1] });
    expect(r.items[1]).toMatchObject({ choices: ['Sample value 1', 'Sample value 2', 'Sample value 3'], answer: [2], rationale: 'The sample notes list value 3 as normal.' });
    expect(r.items[2]).toMatchObject({ type: 'sata', answer: [0, 2] });
  });

  it('"Question 1:" style with Ans:/Reason:/Option D parses fully', () => {
    const r = parseReviewer(questionN);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(3);
    expect(r.items[0]).toMatchObject({ question: 'Which sample step comes before sample step two?', answer: [0], rationale: 'The sample notes list step one before step two.' });
    expect(r.items[1]?.answer).toEqual([3]);
    expect(r.items[2]?.answer).toEqual([1]);
  });

  it('"Explanation:" style inside ~~~ fences parses fully', () => {
    const r = parseReviewer(explanation);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(3);
    expect(r.items[1]?.rationale).toBe('The sample notes say to do the first action before the others. It also notes the second action can wait.');
    expect(r.items[2]).toMatchObject({ answer: [3] });
    expect(r.items[2]?.rationale).toContain('sample_value_x');
  });
});

describe('notes detection signal (proseWords)', () => {
  it('a long synthetic prose file gives 0 items and a high prose word count', () => {
    const r = parseReviewer(proseNotes);
    expect(r.items).toHaveLength(0);
    expect(r.proseWords).toBeGreaterThan(300);
  });

  it('valid questions add no prose words', () => {
    expect(parseReviewer(fencedBold).proseWords).toBeLessThan(20);
  });
});

describe('BUILD-006 review fixes', () => {
  const Q = '1. Which is right?\na. Alpha\nb. Beta\nc. Gamma\nd. Delta\nAnswer: a\n';

  it('#1 a rationale paragraph starting "Here is why…" is kept; only trailing sign-offs are dropped', () => {
    const r = parseReviewer(`${Q}Rationale: A is right.\n\nHere is why B is wrong: it lowers BP.\n\nLet me know if you want more!`);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.rationale).toContain('Here is why B is wrong');
    expect(r.items[0]?.rationale).not.toContain('Let me know');
  });

  it('#4 a broken question deck over 300 words is not "study notes" (answerLines counted)', () => {
    const block = '### Question 1\nWhich of these is the best first action for the nurse in this situation described here?\nA) Alpha option text\nB) Beta option text\n**Correct Answer:** B\n\n';
    const r = parseReviewer(block.repeat(20));
    expect(r.answerLines).toBeGreaterThanOrEqual(2);
  });

  it('#4 a bare "Question N" heading before the stem starts a question', () => {
    const r = parseReviewer('### Question 1\nWhich is right?\nA) Alpha\nB) Beta\n**Correct Answer:** B');
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.question).toBe('Which is right?');
  });

  it('#5 "Q1: …" followed by "A: …" is a flashcard', () => {
    const r = parseReviewer('Q1: What is the normal potassium range?\nA: 3.5-5.0 mEq/L');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.back).toBe('3.5-5.0 mEq/L');
  });

  it('#6 "A - C" is never read as a single letter', () => {
    expect(parseAnswerLetters('A - C')).not.toEqual(['a']);
    expect(parseAnswerLetters('B - Beta')).toEqual(['b']);
  });

  it('#7 "## 1. Cardiovascular" is a section heading, not a broken question', () => {
    const r = parseReviewer(`## 1. Cardiovascular\n\n${Q}`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
  });

  it('#7 "## Respiratory" after a finished question is not glued into its rationale', () => {
    const r = parseReviewer(`${Q}Rationale: because.\n## Respiratory\n${Q.replace('1.', '2.')}`);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]?.rationale).toBe('because.');
  });

  it('#9 "Q2.5 units" inside a rationale is left alone', () => {
    expect(cleanChatbotLine('Q2.5 units')).toBe('Q2.5 units');
    const r = parseReviewer(`${Q}Rationale: Give Q2.5 units as ordered.`);
    expect(r.items[0]?.rationale).toBe('Give Q2.5 units as ordered.');
  });

  it('#10 list bullets inside a rationale keep their original text', () => {
    const r = parseReviewer(`${Q}Rationale: Steps:\n- 1. assess airway\n- 2. check pulse`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.rationale).toContain('- 1. assess airway');
  });

  it('#8 a few broken questions do not count as notes words outside questions', () => {
    const r = parseReviewer(`${Q}\n2. Broken question with no choices at all here and quite a few words in it to count\n\n${Q.replace('1.', '3.')}`);
    expect(r.ignoredWords).toBe(0);
  });
});
