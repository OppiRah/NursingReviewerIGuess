# Nursing Reviewer — beta guide (v0.2.1)

Hi! Thanks for trying this. It's a small app made by a classmate, still in testing. Basahin muna 'to, 3 minutes lang.

## What it is

You give it **your own reviewers**. Every day it gives you a short set of questions to answer from memory, then shows the rationale. It plans around **your exam date** and brings back the ones you miss.

It is **not** a question bank. It only knows what you put in.

## Install it

**iPhone**
1. Open the link in **Safari** (not Chrome, not Messenger's browser).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. From now on, **always open it from the icon** on your home screen. Kung sa Safari mo bubuksan ulit, iba ang storage at parang mawawala ang decks mo.

**Android**
1. Open the link in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Open it from the icon.

## Put your reviewer in

Go to **Import**. You have two ways:

**A. You already have questions with answers** (a Q&A reviewer)
- Tap **choose a file** and pick the **PDF** or **Word (.docx)** file, or paste the text.
- The app shows how many questions it found and lists any problems by line number.

**B. You have notes, not questions** (most of us)
1. Tap **Copy prompt**.
2. Open ChatGPT, Claude or Gemini. Paste the prompt, then paste your notes after it.
3. Copy the chatbot's whole answer and paste it into **Import**.

Then add a **deck title** and your **exam date**, and tap **Save**.

Good to know:
- The first time you import a PDF or Word file you need internet (the reader downloads once). After that it works offline.
- Long notes? Ask the chatbot for 30 questions at a time, then "more".

## Every day

- Open the app, tap **Start review**. One session is 10 questions, mga 3–5 minutes.
- If it says many items are due, do what you can. The weakest ones come first.
- **Review my mistakes** gives you another pass at the ones you missed.
- Wrong answer in the app itself? Tap **Report wrong** on that question, then fix it in **Decks → Open → Edit**.

## Your data stays on your phone

- No account, no server. Walang ina-upload. Kahit ako, hindi ko makikita ang reviewers mo.
- That also means: **if you delete the app or clear Safari/Chrome data, your decks are gone.**
- So once a week, back up:
  1. **Settings → Export backup.** The app makes a file named like `reviewer-backup-2026-11-21.json`. Your phone may or may not save it, and the app can't check.
  2. Open your **Files** (iPhone) or **Downloads / Files** (Android) app and find that file. If your phone shows **Share backup file**, you can use it to save the file straight to Files or Drive.
  3. Back in the app, tap **Yes, I found the file**. Only then does it count: "Last confirmed backup" shows the date and the backup reminder stops for 7 days.
  4. Can't find it? Tap **I can't find it**. Nothing is counted, the reminder stays on, and you can try again. If it never appears, tell me your phone and browser.
  5. Send the file to yourself too (email or Drive), so it isn't only on this phone.
- To bring it back: **Settings → Import backup**.

## When a new version comes out

You'll see **"New version available — tap to update"** at the bottom (never in the middle of a session). Tap it. Your decks stay. Your version is shown in **Settings → About and feedback**.

## If something goes wrong

Send me on Messenger:
1. A **screenshot**.
2. **Settings → Copy feedback info**, then paste. It only has the app version, your phone/browser, and counts. It never includes your questions or deck names.
3. One line: what you were doing.

## Important

- **This is a study aid, not medical advice.** Questions come from your own files or from your chatbot, so they can be wrong. **Check answers against your book, notes or instructor.** Chatbots make confident mistakes.
- "Readiness" is a rough estimate from your answers so far. It is not a predicted score.

## Known not to work (yet)

- **Scanned PDFs, photos of pages, and slide decks saved as images.** The app can't read text from pictures. Use the original Word/Google Doc, or type/paste the text into your chatbot instead.
- Old **.doc** files. Save as **.docx** first.
- Tables and diagrams inside PDFs usually come out messy.
- Syncing between two phones. Use Export/Import backup to move.
- Push notifications. Use **Settings → Add daily reminder to calendar** instead.

Salamat! Honest feedback helps most, even "hindi ko ginamit kasi…".
