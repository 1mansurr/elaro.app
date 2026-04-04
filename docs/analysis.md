# ELARO — AI Import Feature Spec

> This document specifies the AI-powered past question import feature.
> It is intended to be read by Claude Code before any code is written.
> Read LIBRARY_FEATURE_SPEC.md first for full context on the Library feature
> this builds on top of.

---

## 1. Overview

Replace the manual JSON paste area in `CreateQuizModal` with an AI-powered
file import flow. The student uploads a past question file (PDF, image, or
Word document), a Supabase Edge Function makes two sequential Claude API
calls — the first extracts questions and correct answers from the file, the
second generates a high-quality explanation for each correct answer. The app
presents a preview the student can edit before saving to SQLite.

Splitting into two calls is a deliberate quality decision: extraction and
explanation generation are distinct cognitive tasks. Keeping them separate
ensures Claude can focus fully on reading accuracy in call 1, and on
reasoning quality in call 2. It also makes failures easier to diagnose.

Everything downstream of the preview — the quiz taking flow, results screen,
attempt history — is completely unchanged.

---

## 2. Architecture

```
React Native App
  └── CreateQuizModal
        └── sends file (base64) + quiz metadata
              ↓
        Supabase Edge Function (extract-questions)
              │
              ├── Call 1 → Claude API
              │     "Extract all questions, options and correct answers"
              │     └── returns raw extracted questions (no explanations yet)
              │
              └── Call 2 → Claude API
                    "Generate an explanation for each correct answer"
                    (receives the clean extracted questions from Call 1)
                    └── returns final JSON with explanations attached
              ↓
        App receives final JSON
              ↓
        QuizPreviewScreen (editable)
              ↓
        Student confirms → SQLite (unchanged schema)
```

### Key principles

- The Claude API key never touches the React Native bundle
- Two sequential Claude calls per import: extraction first, explanation second
- Separating the calls improves output quality — Claude focuses on one task at a time
- Only this Edge Function goes to the network — everything else remains offline
- The existing SQLite schema, JSON contract, and all downstream screens are
  completely unchanged

---

## 3. Supabase Edge Function

### 3.1 Function name

`extract-questions`

### 3.2 Location

`supabase/functions/extract-questions/index.ts`

### 3.3 Security — shared secret

The function is callable without user auth (no auth system exists yet).
It is secured with a shared secret header:

- Header name: `x-elaro-secret`
- Header value: a random string stored in Supabase secrets as `ELARO_SECRET`
- The app reads the same value from an environment variable:
  `EXPO_PUBLIC_ELARO_SECRET` in `.env`
- If the header is missing or incorrect, the function returns `401 Unauthorized`
- When auth is introduced in `mvp-v2-auth`, replace this check with JWT
  verification in one place — no other changes needed

### 3.4 Request format

```json
{
  "file": "<base64-encoded file contents>",
  "mimeType": "application/pdf" | "image/jpeg" | "image/png" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "fileName": "past_questions_2023.pdf"
}
```

### 3.5 Claude API — Two sequential calls

The Edge Function makes two sequential calls to the Claude API. Call 2
only runs if Call 1 succeeds.

---

#### Call 1 — Extraction

**Purpose:** Read the file and extract all questions, options, and correct
answers. No explanations yet — Claude's only job here is accurate reading.

**Input:** The file (base64 PDF, image, or extracted DOCX text) + system prompt.

**System prompt:**

```
You are an academic question extractor. Your job is to read past exam papers
and extract all multiple choice and true/false questions with high accuracy.

For each question you must:
1. Extract the question text exactly as written
2. Extract all answer options (A, B, C, D for multiple choice; A=True, B=False
   for true/false)
3. Identify the correct answer option

Do NOT generate explanations — that is handled separately.

If you cannot extract a question with confidence (e.g. the image is blurry,
the question is cut off, or the format is ambiguous), still include it but
add "flagged": true and a "flag_reason" string explaining the problem.

Return ONLY valid JSON. No preamble, no markdown, no backticks.
The JSON must match this exact schema:

{
  "subject": "<inferred subject or empty string>",
  "questions": [
    {
      "id": <number>,
      "question": "<question text>",
      "options": {
        "A": "<option text>",
        "B": "<option text>",
        "C": "<option text, omit for true/false>",
        "D": "<option text, omit for true/false>"
      },
      "correct_option": "<A|B|C|D>",
      "flagged": <true|false>,
      "flag_reason": "<reason string or omit if not flagged>"
    }
  ]
}
```

**On failure:** Return 500 with error. Do not proceed to Call 2.

---

#### Call 2 — Explanation generation

**Purpose:** Generate a clear, accurate explanation for why the correct
answer is correct for each question. Claude receives clean structured data
from Call 1 — no file reading required, full attention on reasoning quality.

**Input:** The extracted questions JSON from Call 1 (as text) + system prompt.

**System prompt:**

```
You are an academic tutor. You will be given a list of exam questions with
their correct answers. Your job is to write a clear, accurate explanation
for why the correct answer is correct for each question.

Each explanation should:
- Be concise but complete (2-4 sentences)
- Explain the underlying concept, not just restate the answer
- Be written in plain English suitable for a university student

Return ONLY valid JSON. No preamble, no markdown, no backticks.
Take the input questions and return them with an "explanation" field added
to each question. Do not change any other fields.

Output schema:
{
  "questions": [
    {
      "id": <number>,
      "explanation": "<explanation text>"
    }
  ]
}
```

**Merging:** The Edge Function merges the explanations from Call 2 back into
the extracted questions from Call 1 by matching on `id`, then assembles the
final response.

**On failure:** Return 500 with error. The student is shown an error and can
try again.

### 3.6 Final response format

The Edge Function assembles the merged output from both calls and returns:

On success:

```json
{
  "success": true,
  "data": {
    "quiz": {
      "subject": "<inferred subject or empty string>",
      "total_questions": 10,
      "questions": [
        {
          "id": 1,
          "question": "<question text>",
          "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
          "correct_option": "C",
          "explanation": "<generated explanation>",
          "flagged": false
        }
      ]
    }
  }
}
```

On failure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "failedAt": "extraction" | "explanation"
}
```

The `failedAt` field tells the app (and logs) exactly which call failed.

### 3.7 Error handling in the function

- Invalid/missing secret header → 401
- Missing required request fields → 400
- Call 1 (extraction) fails → 500 with `failedAt: "extraction"`
- Call 1 returns malformed JSON → 500 with `failedAt: "extraction"`
- Call 2 (explanation) fails → 500 with `failedAt: "explanation"`
- Call 2 returns malformed JSON → 500 with `failedAt: "explanation"`
- Partial extraction (some questions flagged) → 200, both calls still run,
  flagged questions included in final response

---

## 4. Supported File Types

| Type          | MIME type                                                               | Notes                                         |
| ------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| PDF           | application/pdf                                                         | Send as base64 document to Claude             |
| JPEG image    | image/jpeg                                                              | Send as base64 image to Claude                |
| PNG image     | image/png                                                               | Send as base64 image to Claude                |
| Word document | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Extract text first, then send as text content |

**DOCX handling note:** Claude does not natively read .docx binary files.
The Edge Function must extract raw text from the .docx before sending to
Claude. Use the `mammoth` npm package (already available in Deno/Edge
Function environments via npm: specifier) to convert .docx → plain text.

---

## 5. React Native Changes

### 5.1 CreateQuizModal changes

Remove:

- The JSON paste textarea
- The Validate & Save button

Add:

- A file upload area (tappable zone with upload icon + "Choose your past
  question file" label)
- Supported formats note: "PDF, Word document, or image"
- On tap: open native document picker using `expo-document-picker`
- Once a file is selected: show the selected filename + a "Extract Questions"
  button
- On "Extract Questions" tap: begin the upload + processing flow

The quiz name and color picker remain unchanged at the top of the modal.

### 5.2 New service file

`src/features/library/services/aiImportService.ts`

Responsibilities:

- Read the selected file as base64 using `expo-file-system`
- Detect MIME type from file extension
- POST to the Supabase Edge Function with the shared secret header
- Return the parsed quiz JSON or throw a typed error

### 5.3 Loading state — multi-step progress indicator

While the Edge Function is processing, show a full-screen loading overlay
inside the modal with four sequential steps that map directly to real
pipeline stages:

1. **Uploading** — file is being sent to the Edge Function
2. **Reading** — Call 1 is in flight (extraction)
3. **Generating explanations** — Call 2 is in flight (explanation generation)
4. **Done ✓** — both calls complete, preview is ready

Each step activates based on real events — no fake timers needed:

- Step 1 activates immediately when the request is sent
- Step 2 activates when the Edge Function acknowledges receipt and begins
  Call 1 (or after a short delay if the function doesn't stream progress)
- Step 3 activates when Call 1 completes and Call 2 begins
- Step 4 activates when the final response arrives

**Note for Claude Code:** Since Supabase Edge Functions return a single
response (not a stream), steps 2 and 3 will need to be approximated with
timing on the client side. The Edge Function should log which step it's on,
but the client cannot observe mid-function progress. Suggested approach:
activate Step 2 immediately after Step 1, activate Step 3 after 3s, activate
Step 4 when the response arrives — regardless of timing.

### 5.4 New screen — QuizPreviewScreen

A full-screen modal pushed on top of CreateQuizModal after successful
extraction.

**Header:**

- "Review Questions" title
- Summary banner: "X questions extracted · Y flagged for review" (yellow
  banner, only shown if Y > 0)

**Question list:**

- Scrollable list of question cards
- Each card contains:
  - Question number (e.g. "Q1")
  - Warning icon + flag reason at the top of the card (yellow, only if
    `flagged: true`)
  - Question text field (editable TextInput)
  - Option rows — each option letter + editable TextInput for option text
  - Correct answer selector — tappable option letters, selected one is
    highlighted
  - Explanation field (editable TextInput, multiline)
- All fields are editable — student can fix anything before saving

**Bottom bar:**

- "Save Quiz" primary button
- On tap: run the existing `jsonValidator` against the (possibly edited)
  data, then call `useCreateQuiz` to save to SQLite, close all modals,
  navigate to QuizDetailScreen

**Back navigation:**

- Back chevron returns to CreateQuizModal (student can re-upload a
  different file)

### 5.5 File size limit

Reject files larger than 10MB before uploading. Show an inline error:
"File is too large. Please use a file under 10MB."

---

## 6. Feature Folder Changes

```
src/features/library/
  services/
    aiImportService.ts          ← NEW: handles file reading + Edge Function call
  screens/
    QuizPreviewScreen.tsx       ← NEW: editable preview before saving
  components/
    FileUploadArea.tsx          ← NEW: tappable upload zone in CreateQuizModal
    ProgressSteps.tsx           ← NEW: multi-step loading indicator
    PreviewQuestionCard.tsx     ← NEW: editable question card in preview
  hooks/
    useAiImport.ts              ← NEW: orchestrates the full import flow,
                                        manages loading state + step progression

supabase/functions/
  extract-questions/
    index.ts                    ← NEW: Edge Function
```

---

## 7. Environment Variables

Add to `.env`:

```
EXPO_PUBLIC_ELARO_SECRET=<generated random string>
```

Add to Supabase project secrets (via Supabase dashboard or CLI):

```
ELARO_SECRET=<same generated random string>
ANTHROPIC_API_KEY=<Anthropic API key>
```

---

## 8. Navigation Changes

- `LibraryStackParamList` needs a new `QuizPreview` screen entry
- Params: `{ parsedQuiz: ParsedQuiz, quizName: string, color: string }`
- `LibraryNavigator.tsx` needs `QuizPreview` registered

---

## 9. What Is NOT Changing

- SQLite schema — completely unchanged
- JSON contract used to save to SQLite — unchanged
- `jsonValidator.ts` — reused as-is to validate edited preview data before save
- `useCreateQuiz` hook — reused as-is to save the confirmed quiz
- All quiz taking, results, and history screens — completely unchanged
- The offline-first nature of everything except this one network call

---

## 10. Questions for Claude Code

Before writing any code, review this spec alongside the existing codebase
and answer:

1. **expo-document-picker:** Is this already installed? If not, what is the
   correct Expo SDK 52 compatible version and does it require any additional
   native config?

2. **expo-file-system:** Is this already installed and used elsewhere? What
   is the correct method to read a picked file as base64?

3. **Edge Function DOCX handling:** Confirm that `mammoth` is available via
   npm: specifier in Deno Edge Functions, or suggest the best alternative
   for extracting plain text from .docx in that environment.

4. **Existing Edge Functions pattern:** Review the existing 98+ Edge
   Functions in `supabase/functions/`. What is the shared utility pattern
   in `supabase/functions/_shared/` and how should the new function follow
   it? Are there existing functions that call external APIs we can use as
   a reference?

5. **Base64 file size:** For a 10MB file, base64 encoding adds ~33% overhead
   (~13.3MB in the request body). Is there any request size limit on Supabase
   Edge Functions or the Claude API that we need to be aware of?

6. **Suggested implementation order:** What is the recommended phase-by-phase
   build order for this feature?
