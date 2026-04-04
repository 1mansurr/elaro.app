import { useQuery } from '@tanstack/react-query';
import { getBanks, getQuizzes } from '../services/libraryDb';

export function useLibrary(userId: string | null) {
  return useQuery({
    queryKey: ['library', userId],
    queryFn: async () => {
      const [banks, quizzes] = await Promise.all([
        getBanks(userId!),
        getQuizzes(userId!),
      ]);
      return { banks, quizzes };
    },
    enabled: !!userId,
  });
}
