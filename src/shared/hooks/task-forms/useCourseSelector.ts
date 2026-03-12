import { useState, useEffect, useCallback } from 'react';
import { Course } from '@/types';
import { coursesApi } from '@/features/courses/services/queries';

export interface UseCourseSelectorReturn {
  courses: Course[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useCourseSelector = (): UseCourseSelectorReturn => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const page = await coursesApi.getAll();
      setCourses(page.courses);
    } catch (err) {
      const e =
        err instanceof Error ? err : new Error('Failed to fetch courses');
      setError(e);
      console.error('Error fetching courses:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    isLoading,
    error,
    refetch: fetchCourses,
  };
};
