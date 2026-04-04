// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
// @ts-expect-error - Deno URL imports are valid at runtime
import { encode as encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinalQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C?: string; D?: string };
  correct_option: string;
  explanation: string;
  flagged: boolean;
  flag_reason?: string;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const COMBINED_SYSTEM_PROMPT = `You are an academic question extractor and tutor. Your job is to read past exam papers, extract all multiple choice and true/false questions, and write a clear explanation for each correct answer.

For each question you must:
1. Extract the question text exactly as written
2. Extract all answer options (A, B, C, D for multiple choice; A=True, B=False for true/false)
3. Identify the correct answer option
4. Write a concise explanation (2-4 sentences) for why the correct answer is correct — explain the underlying concept, not just restate the answer, in plain English suitable for a university student

If you cannot extract a question with confidence (e.g. the image is blurry, the question is cut off, or the format is ambiguous), still include it but set "flagged": true and add a "flag_reason" string.

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
      "explanation": "<explanation text>",
      "flagged": <true|false>,
      "flag_reason": "<reason string or omit if not flagged>"
    }
  ]
}`;

// ─── Streaming JSON parser ────────────────────────────────────────────────────
//
// Parses question objects out of Claude's streamed JSON token by token.
// Emits a complete FinalQuestion as soon as its closing "}" is received —
// no need to wait for the full response.

class QuestionStreamParser {
  private accumulated = '';
  private inQuestionsArray = false;
  private questionBuffer = '';
  private braceDepth = 0;
  private inString = false;
  private escaped = false;
  subject = '';

  feed(text: string): FinalQuestion[] {
    const questions: FinalQuestion[] = [];

    if (!this.inQuestionsArray) {
      this.accumulated += text;

      // Try to extract subject from accumulated text
      if (!this.subject) {
        const m = this.accumulated.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (m) this.subject = m[1];
      }

      // Find the start of the questions array
      const idx = this.accumulated.indexOf('"questions"');
      if (idx === -1) return questions;
      const arrIdx = this.accumulated.indexOf('[', idx + 11);
      if (arrIdx === -1) return questions;

      this.inQuestionsArray = true;
      const remaining = this.accumulated.slice(arrIdx + 1);
      this.accumulated = '';
      this._parseChars(remaining, questions);
    } else {
      this._parseChars(text, questions);
    }

    return questions;
  }

  private _parseChars(text: string, out: FinalQuestion[]) {
    for (const ch of text) {
      if (this.escaped) {
        this.escaped = false;
        if (this.braceDepth > 0) this.questionBuffer += ch;
        continue;
      }
      if (ch === '\\' && this.inString) {
        this.escaped = true;
        if (this.braceDepth > 0) this.questionBuffer += ch;
        continue;
      }
      if (ch === '"') {
        this.inString = !this.inString;
        if (this.braceDepth > 0) this.questionBuffer += ch;
        continue;
      }
      if (this.inString) {
        if (this.braceDepth > 0) this.questionBuffer += ch;
        continue;
      }
      if (ch === '{') {
        this.braceDepth++;
        this.questionBuffer += ch;
      } else if (ch === '}') {
        this.questionBuffer += ch;
        this.braceDepth--;
        if (this.braceDepth === 0 && this.questionBuffer) {
          try {
            const q = JSON.parse(this.questionBuffer) as FinalQuestion;
            if (q.id != null && q.question) out.push(q);
          } catch {
            // Malformed — skip
          }
          this.questionBuffer = '';
        }
      } else if (this.braceDepth > 0) {
        this.questionBuffer += ch;
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(
  origin: string | null,
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  // 1. Validate shared secret
  const secret = req.headers.get('x-elaro-secret');
  // @ts-expect-error - Deno.env is available at runtime
  if (!secret || secret !== Deno.env.get('ELARO_SECRET')) {
    return jsonResponse(origin, 401, { success: false, error: 'Unauthorized' });
  }

  // 2. Parse and validate request body
  let body: { storagePath?: string; mimeType?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(origin, 400, {
      success: false,
      error: 'Invalid JSON body',
    });
  }

  const { storagePath, mimeType, fileName } = body;
  if (!storagePath || !mimeType || !fileName) {
    return jsonResponse(origin, 400, {
      success: false,
      error: 'Missing required fields: storagePath, mimeType, fileName',
    });
  }

  // 3. Download file from storage using service role key
  const supabase = createClient(
    // @ts-expect-error - Deno.env is available at runtime
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-expect-error - Deno.env is available at runtime
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('quiz-imports')
    .download(storagePath);

  if (downloadError || !fileBlob) {
    console.error('Storage download error:', downloadError);
    return jsonResponse(origin, 500, {
      success: false,
      error: 'Failed to retrieve uploaded file',
      failedAt: 'extraction',
    });
  }

  // 4. Delete file from storage (cleanup — do not await)
  supabase.storage
    .from('quiz-imports')
    .remove([storagePath])
    .catch((err: unknown) => {
      console.error('Storage delete error:', err);
    });

  // 5. Build Claude content block
  const arrayBuffer = await fileBlob.arrayBuffer();
  let claudeMessageContent: unknown[];

  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    let extractedText: string;
    try {
      // @ts-ignore
      const mammoth = await import('npm:mammoth');
      const result = await mammoth.default.extractRawText({ arrayBuffer });
      extractedText = result.value;
    } catch (err) {
      console.error('mammoth extraction error:', err);
      return jsonResponse(origin, 500, {
        success: false,
        error: 'Failed to read Word document',
        failedAt: 'extraction',
      });
    }
    claudeMessageContent = [
      {
        type: 'text',
        text: `File name: ${fileName}\n\nContent:\n${extractedText}`,
      },
    ];
  } else {
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = encodeBase64(bytes);
    if (mimeType === 'application/pdf') {
      claudeMessageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: mimeType, data: base64 },
          title: fileName,
        },
      ];
    } else {
      claudeMessageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 },
        },
      ];
    }
  }

  // 6. Stream Claude's response and parse questions in real time
  // @ts-expect-error - Deno.env is available at runtime
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const writeSSE = (event: object) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  (async () => {
    let questionCount = 0;
    try {
      // Start streaming Claude call
      const claudeResponse = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 16000,
            stream: true,
            system: COMBINED_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: claudeMessageContent }],
          }),
        },
      );

      if (!claudeResponse.ok) {
        const err = await claudeResponse.text();
        throw new Error(`Claude API error ${claudeResponse.status}: ${err}`);
      }

      const reader = claudeResponse.body!.getReader();
      const decoder = new TextDecoder();
      const parser = new QuestionStreamParser();
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part
            .split('\n')
            .find((l: string) => l.startsWith('data: '));
          if (!dataLine) continue;
          const data = dataLine.slice(6);
          if (data === '[DONE]') continue;

          let event: { type: string; delta?: { type: string; text?: string } };
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }
          if (
            event.type !== 'content_block_delta' ||
            event.delta?.type !== 'text_delta'
          )
            continue;

          const newQuestions = parser.feed(event.delta.text ?? '');
          for (const q of newQuestions) {
            questionCount++;
            await writeSSE({
              type: 'question',
              question: {
                id: q.id,
                question: q.question,
                options: q.options,
                correct_option: q.correct_option,
                explanation: q.explanation ?? '',
                flagged: q.flagged ?? false,
                flag_reason: q.flag_reason,
              },
            });
          }
        }
      }

      if (questionCount === 0) {
        await writeSSE({
          type: 'error',
          error: 'No questions could be extracted from the file',
        });
      } else {
        await writeSSE({ type: 'done', subject: parser.subject });
      }
    } catch (err) {
      console.error('Streaming error:', err);
      try {
        await writeSSE({
          type: 'error',
          error: 'Failed to extract questions from file',
        });
      } catch {}
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...getCorsHeaders(origin),
    },
  });
});
