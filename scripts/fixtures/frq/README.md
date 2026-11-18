# Local FRQ debugging fixture

From the BetterQuest repository root:

```sh
node scripts/fixtures/frq/serve.mjs
```

Open **http://127.0.0.1:4179/**. The Code selector switches between the working
source (4179) and the original viewer at commit `34f22fc` (4180). Both use the
real `src/content/index.ts`, adapters, workspace, answer components, and PDF.js.
This is Vite development serving only; it does not package the extension.

The fixture generates an eight-page PDF and native-style response table with
22 MCQs and a final textarea FRQ, Q23. All names, IDs, answers, statuses, and
submission results are synthetic. The Chrome messaging shim uses the real
`LocalRepository` with an in-memory backend instead of the extension worker.
Only this dev server replaces Quest's origin guard with its loopback origin;
production URL matching and permissions are untouched. PDF workers/fonts are
served from the installed local PDF.js package. No Quest requests or login.
Regular viewer zoom/dark-page preferences can persist in localhost storage.

## Reproduce and inspect

1. Choose **Before fix**, then **Go to Q23**. The original viewer applies the
   measured placement height as `min-height`, stretching a short answer card.
2. Choose **Fixed**. Q23 uses intrinsic content height, capped by that same
   placement rectangle. Both views use a single-line field with an adjacent
   checkmark button; the native synthetic response remains a textarea.
3. Enter any synthetic answer; verify it appears in the Response Desk. Submit
   delegates to the mock native button exactly once. Default result: Correct.
4. **Rerender responses** checks recycled rows without duplicated cards.
   Fresh correct feedback stays visible and read-only; **Reload completed Q23**
   verifies that historical completion hides the PDF card.
5. **Next submit: incorrect** tests editing/retrying a wrong answer.
6. The layout selector adds a following header/separator, removes overlay room,
   or removes Q23's PDF boundary. The existing placement/fallback logic must
   keep the answer available without covering the following question.

Inspect through the real Shadow DOM:

```js
const pdf = document.querySelector('[data-betterquest="interactive-pdf"]').shadowRoot;
const card = pdf.querySelector('.pdf-free-response[data-question="23"]');
({ bounds: card?.getBoundingClientRect(), min: card?.style.minHeight,
   max: card?.style.maxHeight, hidden: card?.hidden, correct: card?.dataset.correct });
```

## Focused local browser check

With the servers running and Chrome installed:

```sh
node scripts/fixtures/frq/check.mjs
```

Uses a new temporary Chrome profile, headless, against loopback only. Set
`CHROME_PATH` if Chrome is installed elsewhere. Checks actual browser geometry,
MCQ selection, native FRQ synchronization/submission, incorrect retries,
inline field/button alignment, completion/rerender behavior, and boundary fallbacks.
Also verifies that reopening a previously completed Q23 restores its editor.
Before/fixed screenshots go to ignored `output/frq-debug-evidence/`.

Before the single-line redesign, the sizing fix measured **220.9 px → 167 px**
at a 1800 × 1100 viewport, with **66 MCQ controls** retained. The subsequent
single-line redesign has not been tested or measured. No production build or
full test suite is required. Synthetic local evidence does not establish
compatibility with every authenticated Quest document.

## Root causes

- `freeResponsePlacement` returns an allowed rectangle (maximum 132 PDF units),
  not the preferred card height. Applying it as percentage `min-height` forced
  a large blank region below short answers, especially on larger fitted pages.
  The viewer now applies `max-height` with internal overflow instead.
- `celebrate` retained fresh correct FRQs in `keptCorrect`, but the next
  `setAnsweredQuestions` refresh ignored that set for FRQs. Remapping also
  skipped those cards. FRQs now follow the same fresh-feedback visibility rule
  as MCQs, with completed feedback made read-only and its Submit disabled.
  An initially completed FRQ also remounts if Quest later reopens its answer.
- The measured Q23 and following-question boundaries were valid. No selectors,
  PDF parsing heuristics, native submission handlers, or MCQ geometry changed.
