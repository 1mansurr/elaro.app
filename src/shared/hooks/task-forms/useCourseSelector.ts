import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Course } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export interface UseCourseSelectorReturn {
  courses: Course[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useCourseSelector = (): UseCourseSelectorReturn => {
  const { user, session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourses = async () => {
    if (!session || !user) {
      setCourses([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('id, course_name, course_code, about_course');

      if (fetchError) throw fetchError;

      const formattedCourses = (data || []).map(course => ({
        id: course.id,
        courseName: course.course_name,
        courseCode: course.course_code,
        aboutCourse: course.about_course,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) as Course[];

      setCourses(formattedCourses);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to fetch courses');
      setError(error);
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [session, user?.id]);

  return {
    courses,
    isLoading,
    error,
    refetch: fetchCourses,
  };
};
