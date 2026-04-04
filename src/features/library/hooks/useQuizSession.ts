import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import uuid from 'react-native-uuid';
import { Question } from '@/types';
import { saveAttemptWithAnswers } from '../services/libraryDb';

interface SessionAnswer {
  selectedOption: string;
  isCorrect: boolean;
}

interface FinishResult {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
}

export function useQuizSession(
  questions: Question[],
  userId: string,
  isRetake: boolean,
) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SessionAnswer>>({});
  const [isFinishing, setIsFinishing] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasStarted = Object.keys(answers).length > 0;

  const selectAnswer = useCallback(
    (questionId: string, option: string) => {
      setAnswers(prev => {
        if (prev[questionId]) return prev;
        const question = questions.find(q => q.id === questionId);
        if (!question) return prev;
        return {
          ...prev,
          [questionId]: {
            selectedOption: option,
            isCorrect: option === question.correct_option,
          },
        };
      });
    },
    [questions],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentIndex(index);
      }
    },
    [questions.length],
  );

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);

  const finishSession = useCallback(
    async (quizId: string): Promise<FinishResult> => {
      setIsFinishing(true);
      const attemptId = uuid.v4() as string;
      const score = questions.filter(q => answers[q.id]?.isCorrect).length;
      const total = questions.length;
      const percentage = total > 0 ? (score / total) * 100 : 0;

      const answerRecords = questions.map(q => ({
        id: uuid.v4() as string,
        question_id: q.id,
        selected_option: answers[q.id]?.selectedOption ?? null,
        is_correct: answers[q.id]?.isCorrect ? 1 : 0,
      }));

      await saveAttemptWithAnswers(
        {
          id: attemptId,
          user_id: userId,
          quiz_id: quizId,
          score,
          total,
          percentage,
          is_retake: isRetake ? 1 : 0,
          attempted_at: new Date().toISOString(),
        },
        answerRecords,
      );

      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      return { attemptId, score, total, percentage };
    },
    [questions, answers, userId, isRetake, queryClient],
  );

  return {
    currentQuestion,
    currentIndex,
    answers,
    isLastQuestion,
    hasStarted,
    isFinishing,
    selectAnswer,
    goToIndex,
    goNext,
    finishSession,
  };
}
