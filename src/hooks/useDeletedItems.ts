import { useState, useCallback } from 'react';
import { Course, Assignment, Lecture, StudySession } from '@/types';

export const useDeletedItems = () => {
  const [items] = useState<(Course | Assignment | Lecture | StudySession)[]>(
    [],
  );
  const [isLoading] = useState(false);

  const fetchAllDeletedItems = useCallback(async () => {
    // Offline MVP — deleted items not available
  }, []);

  return { items, isLoading, fetchAllDeletedItems };
};
