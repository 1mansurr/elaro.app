import { useMutation, useQueryClient } from '@tanstack/react-query';
import uuid from 'react-native-uuid';
import { validateQuizJson } from '../services/jsonValidator';
import { createBank, createQuiz, createQuestion } from '../services/libraryDb';
import { PreviewQuiz } from '../services/aiImportService';

// ─── Create Bank ──────────────────────────────────────────────────────────────

export function useCreateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; userId: string }) => {
      await createBank({
        id: uuid.v4() as string,
        user_id: params.userId,
        name: params.name.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
}

// ─── Create Quiz ──────────────────────────────────────────────────────────────

export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      color: string;
      userId: string;
      jsonText: string;
    }) => {
      const result = validateQuizJson(params.jsonText);
      if (!result.valid) {
        throw new Error(result.error);
      }

      const quizId = uuid.v4() as string;

      await createQuiz({
        id: quizId,
        user_id: params.userId,
        bank_id: null,
        name: params.name.trim(),
        subject: result.data.subject,
        color: params.color,
        total_questions: result.data.questions.length,
      });

      for (let i = 0; i < result.data.questions.length; i++) {
        const q = result.data.questions[i];
        await createQuestion({
          id: uuid.v4() as string,
          quiz_id: quizId,
          position: i + 1,
          question_text: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          explanation: q.explanation,
          question_type: q.question_type,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
}

// ─── Save from Preview (AI import) ───────────────────────────────────────────

/**
 * Saves a quiz from the AI import preview.
 * Accepts a PreviewQuiz (Edge Function format) and converts to DB format.
 * Returns the new quizId so the caller can navigate to QuizDetailScreen.
 */
export function useSaveQuizFromPreview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      color: string;
      userId: string;
      quiz: PreviewQuiz;
    }): Promise<string> => {
      const quizId = uuid.v4() as string;

      await createQuiz({
        id: quizId,
        user_id: params.userId,
        bank_id: null,
        name: params.name.trim(),
        subject: params.quiz.subject,
        color: params.color,
        total_questions: params.quiz.questions.length,
      });

      for (let i = 0; i < params.quiz.questions.length; i++) {
        const q = params.quiz.questions[i];
        const hasC = q.options.C !== undefined;
        const hasD = q.options.D !== undefined;
        await createQuestion({
          id: uuid.v4() as string,
          quiz_id: quizId,
          position: i + 1,
          question_text: q.question.trim(),
          option_a: q.options.A,
          option_b: q.options.B,
          option_c: hasC ? (q.options.C as string) : null,
          option_d: hasD ? (q.options.D as string) : null,
          correct_option: q.correct_option,
          explanation: q.explanation.trim(),
          question_type: hasC || hasD ? 'multiple_choice' : 'true_false',
        });
      }

      return quizId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
