import { useQuery } from '@tanstack/react-query';
import { getDeletedTasks, DeletedTaskRow } from '@/services/database';

export type DeletedItem = DeletedTaskRow & {
  type: string; // widened to string to accommodate custom type IDs
};

export const useDeletedItemsQuery = () => {
  return useQuery<DeletedItem[], Error>({
    queryKey: ['deletedItems'],
    queryFn: async () => {
      const rows = await getDeletedTasks();
      return rows as DeletedItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
