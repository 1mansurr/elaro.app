import { useState, useCallback } from 'react';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { Course, Assignment, Lecture, StudySession } from '@/types';

export const useDeletedItems = () => {
  const [items, setItems] = useState<
    (Course | Assignment | Lecture | StudySession)[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllDeletedItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await versionedApiClient.getDeletedItems();

      if (response.error) {
        throw new Error(
          response.message || response.error || 'Failed to fetch deleted items',
        );
      }

      setItems(response.data || []);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { items, isLoading, fetchAllDeletedItems };
};
