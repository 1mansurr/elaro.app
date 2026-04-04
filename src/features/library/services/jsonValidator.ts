/**
 * JSON validation and parsing for quiz import.
 * Pure functions — no side effects, no imports.
 */

export interface ParsedQuizQuestion {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  explanation: string;
  question_type: 'multiple_choice' | 'true_false';
}

export interface ParsedQuiz {
  subject: string;
  questions: ParsedQuizQuestion[];
}

export type ValidationResult =
  | { valid: true; data: ParsedQuiz }
  | { valid: false; error: string };

/**
 * Validates a raw JSON string against the quiz contract (spec §4.2).
 * On success, returns the normalised quiz ready for DB insertion.
 * The `error` field on failure contains a specific message useful for
 * debugging; the UI should show the generic toast regardless.
 */
export function validateQuizJson(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { valid: false, error: 'Invalid JSON syntax' };
  }

  if (typeof parsed !== 'object' || parsed === null || !('quiz' in parsed)) {
    return { valid: false, error: 'Root must have a "quiz" object' };
  }

  const quiz = (parsed as Record<string, unknown>).quiz;

  if (
    typeof quiz !== 'object' ||
    quiz === null ||
    !Array.isArray((quiz as Record<string, unknown>).questions) ||
    ((quiz as Record<string, unknown>).questions as unknown[]).length === 0
  ) {
    return {
      valid: false,
      error: '"quiz.questions" must be a non-empty array',
    };
  }

  const rawQuestions = (quiz as Record<string, unknown>).questions as unknown[];
  const questions: ParsedQuizQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i] as Record<string, unknown>;
    const num = i + 1;

    if (typeof q.question !== 'string' || q.question.trim() === '') {
      return {
        valid: false,
        error: `Question ${num} is missing "question" text`,
      };
    }

    if (
      typeof q.options !== 'object' ||
      q.options === null ||
      typeof (q.options as Record<string, unknown>).A !== 'string' ||
      typeof (q.options as Record<string, unknown>).B !== 'string'
    ) {
      return {
        valid: false,
        error: `Question ${num} must have at least options A and B`,
      };
    }

    const options = q.options as Record<string, unknown>;

    if (
      typeof q.correct_option !== 'string' ||
      typeof options[q.correct_option] !== 'string'
    ) {
      return {
        valid: false,
        error: `Question ${num} has an invalid "correct_option"`,
      };
    }

    if (typeof q.explanation !== 'string' || q.explanation.trim() === '') {
      return {
        valid: false,
        error: `Question ${num} is missing an explanation`,
      };
    }

    const isTrueFalse =
      typeof options.C !== 'string' && typeof options.D !== 'string';

    questions.push({
      question: q.question.trim(),
      option_a: options.A as string,
      option_b: options.B as string,
      option_c: typeof options.C === 'string' ? options.C : null,
      option_d: typeof options.D === 'string' ? options.D : null,
      correct_option: q.correct_option as string,
      explanation: q.explanation.trim(),
      question_type: isTrueFalse ? 'true_false' : 'multiple_choice',
    });
  }

  const rawQuiz = quiz as Record<string, unknown>;
  const subject =
    typeof rawQuiz.subject === 'string' && rawQuiz.subject.trim() !== ''
      ? rawQuiz.subject.trim()
      : '';

  return {
    valid: true,
    data: { subject, questions },
  };
}
