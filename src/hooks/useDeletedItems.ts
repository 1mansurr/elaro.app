import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Course, Assignment, Lecture, StudySession } from '@/types';

export const useDeletedItems = () => {
  const [items, setItems] = useState<
    (Course | Assignment | Lecture | StudySession)[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllDeletedItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const [courses, assignments, lectures, studySessions] = await Promise.all(
        [
          supabase.from('courses').select('*').not('deleted_at', 'is', null),
          supabase
            .from('assignments')
            .select('*')
            .not('deleted_at', 'is', null),
          supabase.from('lectures').select('*').not('deleted_at', 'is', null),
          supabase
            .from('study_sessions')
            .select('*')
            .not('deleted_at', 'is', null),
        ],
      );

      const allItems = [
        ...(courses.data || []).map(item => ({ ...item, type: 'course' })),
        ...(assignments.data || []).map(item => ({
          ...item,
          type: 'assignment',
        })),
        ...(lectures.data || []).map(item => ({ ...item, type: 'lecture' })),
        ...(studySessions.data || []).map(item => ({
          ...item,
          type: 'study_session',
        })),
      ].sort(
        (a, b) =>
          new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime(),
      );

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { items, isLoading, fetchAllDeletedItems };
};
