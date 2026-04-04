import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import uuid from 'react-native-uuid';

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL: string =
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as
    | string
    | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');

const SUPABASE_ANON_KEY: string =
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as
    | string
    | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '');

const ELARO_SECRET: string =
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_ELARO_SECRET as
    | string
    | undefined) ||
  (process.env.EXPO_PUBLIC_ELARO_SECRET ?? '');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C?: string; D?: string };
  correct_option: string;
  explanation: string;
  flagged: boolean;
  flag_reason?: string;
}

export interface PreviewQuiz {
  subject: string;
  questions: PreviewQuestion[];
}

// ─── Live question store ──────────────────────────────────────────────────────
//
// The streaming continues after the modal closes and QuizPreviewScreen mounts.
// This tiny module-level store lets the still-running stream push questions to
// whoever is currently listening — no React lifecycle dependency.

type QuestionListener = (q: PreviewQuestion) => void;
type DoneListener = (subject: string) => void;
type ErrorListener = (msg: string) => void;

let _onQuestion: QuestionListener | null = null;
let _onDone: DoneListener | null = null;
let _onError: ErrorListener | null = null;

export const liveQuestionStore = {
  register(
    onQ: QuestionListener,
    onDone: DoneListener,
    onError: ErrorListener,
  ) {
    _onQuestion = onQ;
    _onDone = onDone;
    _onError = onError;
  },
  unregister() {
    _onQuestion = null;
    _onDone = null;
    _onError = null;
  },
  _emit(q: PreviewQuestion) {
    _onQuestion?.(q);
  },
  _done(subject: string) {
    _onDone?.(subject);
  },
  _error(msg: string) {
    _onError?.(msg);
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      throw new Error(`Unsupported file type: .${ext || '(unknown)'}`);
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadQuizFile(
  fileUri: string,
  fileName: string,
  deviceId: string,
): Promise<string> {
  const mimeType = getMimeType(fileName);
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin';
  const fileId = uuid.v4() as string;
  const storagePath = `uploads/${deviceId}/${fileId}.${ext}`;
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/quiz-imports/${storagePath}`;

  const result = await FileSystem.uploadAsync(storageUrl, fileUri, {
    httpMethod: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': mimeType,
      apikey: SUPABASE_ANON_KEY,
    },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Upload failed (${result.status}). Please check your connection.`,
    );
  }

  return storagePath;
}

// ─── Extract (streaming SSE) ──────────────────────────────────────────────────
//
// Connects to the Edge Function SSE stream.
// - Calls onFirstQuestion once with the first arrived question so the caller
//   can trigger navigation immediately.
// - Subsequent questions are pushed via liveQuestionStore to whoever registered
//   (QuizPreviewScreen after navigation).
// - Resolves when the stream ends.

export async function streamExtractQuestions(
  storagePath: string,
  fileName: string,
  onFirstQuestion: (q: PreviewQuestion) => void,
): Promise<void> {
  const mimeType = getMimeType(fileName);
  const functionUrl = `${SUPABASE_URL}/functions/v1/extract-questions`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-elaro-secret': ELARO_SECRET,
    },
    body: JSON.stringify({ storagePath, mimeType, fileName }),
  });

  if (
    !response.ok ||
    !response.headers.get('content-type')?.includes('text/event-stream')
  ) {
    let result: { error?: string; message?: string; failedAt?: string } = {};
    try {
      result = await response.json();
    } catch {}
    const detail = result.error ?? result.message ?? `HTTP ${response.status}`;
    const stage = result.failedAt ? ` [${result.failedAt}]` : '';
    throw new Error(`Import failed: ${detail}${stage}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';
  let isFirst = true;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const parts = sseBuffer.split('\n\n');
    sseBuffer = parts.pop() ?? '';

    for (const part of parts) {
      const dataLine = part.split('\n').find(l => l.startsWith('data: '));
      if (!dataLine) continue;
      const dataStr = dataLine.slice(6).trim();
      if (!dataStr) continue;

      let event: {
        type: string;
        question?: PreviewQuestion;
        subject?: string;
        error?: string;
        failedAt?: string;
      };
      try {
        event = JSON.parse(dataStr);
      } catch {
        continue;
      }

      if (event.type === 'question' && event.question) {
        if (isFirst) {
          isFirst = false;
          onFirstQuestion(event.question); // triggers navigation
        } else {
          liveQuestionStore._emit(event.question); // goes to QuizPreviewScreen
        }
      } else if (event.type === 'done') {
        liveQuestionStore._done(event.subject ?? '');
      } else if (event.type === 'error') {
        const stage = event.failedAt ? ` [${event.failedAt}]` : '';
        const msg = `${event.error ?? 'Import failed'}${stage}`;
        liveQuestionStore._error(msg);
        throw new Error(msg);
      }
    }
  }
}
