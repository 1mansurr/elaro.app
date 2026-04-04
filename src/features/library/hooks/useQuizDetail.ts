import { useQuery } from '@tanstack/react-query';
import {
  getQuizById,
  getQuizStats,
  getAttemptsByQuiz,
  getWrongAnswerQuestionIds,
} from '../services/libraryDb';

export function useQuizDetail(quizId: string) {
  return useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const [quiz, stats, attempts] = await Promise.all([
        getQuizById(quizId),
        getQuizStats(quizId),
        getAttemptsByQuiz(quizId),
      ]);

      const mostRecentAttempt = attempts[0] ?? null;
      const wrongIds = mostRecentAttempt
        ? await getWrongAnswerQuestionIds(mostRecentAttempt.id)
        : [];

      return { quiz, stats, attempts, mostRecentAttempt, wrongIds };
    },
  });
}
