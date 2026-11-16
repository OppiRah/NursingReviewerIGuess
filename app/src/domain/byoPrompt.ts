/**
 * "Bring your own AI" prompt (ADR-002 §5). The student copies this into their own
 * chatbot, pastes their material after it, and pastes the result back into Import.
 * The app itself never calls an AI service.
 */
export const BYO_AI_PROMPT = `Turn the study material I paste below into practice questions.

Rules:
- Use ONLY the material I paste. Do not add facts from anywhere else. If something is unclear in my material, skip it.
- Write every question in exactly this plain-text format, with no other text before or after:

# Deck title
1. Question text
a. choice
b. choice
c. choice
d. choice
Answer: b
Rationale: why the answer is right and why the others are wrong, based on my material.
---

- Number the questions 1, 2, 3...
- Every question needs 2 to 6 lettered choices and exactly one "Answer:" line with the letter(s).
- For "select all that apply" questions, list every correct letter: Answer: a, c, d
- For "what should the nurse do first" questions, put the line "Type: priority" on the line before the question.
- For simple recall, you may write a flashcard instead:
Q: question
A: answer
Rationale: short explanation
---
- Always include a "Rationale:" line.
- Do not use bold, tables, emojis or markdown other than the single "#" title line.

My material:
`;
