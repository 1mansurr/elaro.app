import { supabase } from '@/services/supabase';
import { addDays, addHours, setHours, setMinutes } from 'date-fns';

interface ExampleDataResult {
  success: boolean;
  courseId?: string;
  taskIds?: {
    assignmentId: string;
    lectureId: string;
    studySessionId: string;
  };
  error?: string;
}

/**
 * Creates example data for new users to help them understand the app
 * Creates:
 * - 1 sample course ("Getting Started with ELARO")
 * - 1 sample assignment
 * - 1 sample lecture
 * - 1 sample study session
 *
 * All items are marked with is_example: true for easy identification and removal
 */
export async function createExampleData(
  userId: string,
): Promise<ExampleDataResult> {
  try {
    console.log('📚 Creating example data for new user:', userId);

    // Get fresh access token to ensure it's valid
    const { getFreshAccessToken } = await import('@/utils/getFreshAccessToken');
    const accessToken = await getFreshAccessToken();

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Step 1: Create a sample course
    const { data: courseData, error: courseError } =
      await supabase.functions.invoke('create-course-and-lecture', {
        headers: authHeaders,
        body: {
          courseName: 'Getting Started with ELARO',
          courseCode: 'EXAMPLE-101',
          aboutCourse:
            'This is a sample course to help you explore ELARO. Feel free to delete it anytime!',
          is_example: true, // Mark as example
        },
      });

    if (courseError) {
      console.error('Failed to create example course:', courseError);
      throw new Error(courseError.message || 'Failed to create example course');
    }

    const courseId = courseData?.courseId;
    if (!courseId) {
      throw new Error('No course ID returned from example course creation');
    }

    console.log('✅ Created example course:', courseId);

    // Step 2: Create sample assignment (due in 3 days)
    const assignmentDueDate = addDays(new Date(), 3);
    const assignmentDueDateWithTime = setHours(
      setMinutes(assignmentDueDate, 0),
      23,
    ); // 11:00 PM

    const { data: assignmentData, error: assignmentError } =
      await supabase.functions.invoke('create-assignment', {
        headers: authHeaders,
        body: {
          course_id: courseId,
          title: '✨ Complete Your First ELARO Task',
          description:
            'Try marking this task as complete by swiping right on it, or tapping to view details. This is just an example - you can delete it anytime!',
          due_date: assignmentDueDateWithTime.toISOString(),
          submission_method: 'Online',
          is_example: true, // Mark as example
          reminders: [120], // 2-hour reminder
        },
      });

    if (assignmentError) {
      console.error('Failed to create example assignment:', assignmentError);
    }

    const assignmentId = assignmentData?.id;
    console.log('✅ Created example assignment:', assignmentId);

    // Step 3: Create sample lecture (tomorrow at 2 PM)
    const lectureTomorrow = addDays(new Date(), 1);
    const lectureStartTime = setHours(setMinutes(lectureTomorrow, 0), 14); // 2:00 PM
    const lectureEndTime = setHours(setMinutes(lectureTomorrow, 0), 15); // 3:00 PM

    const { data: lectureData, error: lectureError } =
      await supabase.functions.invoke('create-lecture', {
        headers: authHeaders,
        body: {
          course_id: courseId,
          lecture_name: '📖 Introduction to Smart Studying',
          description:
            'This is a sample lecture. Tap to view details or swipe to complete. Example data helps you see how ELARO works!',
          start_time: lectureStartTime.toISOString(),
          end_time: lectureEndTime.toISOString(),
          is_recurring: false,
          recurring_pattern: 'none',
          is_example: true, // Mark as example
          reminders: [30], // 30-minute reminder
        },
      });

    if (lectureError) {
      console.error('Failed to create example lecture:', lectureError);
    }

    const lectureId = lectureData?.id;
    console.log('✅ Created example lecture:', lectureId);

    // Step 4: Create sample study session (today at 4 PM)
    const studySessionToday = new Date();
    const studySessionTime = setHours(setMinutes(studySessionToday, 0), 16); // 4:00 PM

    const { data: studySessionData, error: studySessionError } =
      await supabase.functions.invoke('create-study-session', {
        headers: authHeaders,
        body: {
          course_id: courseId,
          topic: "🎯 Review 'How ELARO Works' Guide",
          notes:
            'This is a sample study session. Check out the "How ELARO Works" section in your Account tab to learn more! This is example data.',
          session_date: studySessionTime.toISOString(),
          has_spaced_repetition: true,
          is_example: true, // Mark as example
          reminders: [15], // 15-minute reminder
        },
      });

    if (studySessionError) {
      console.error(
        'Failed to create example study session:',
        studySessionError,
      );
    }

    const studySessionId = studySessionData?.id;
    console.log('✅ Created example study session:', studySessionId);

    return {
      success: true,
      courseId,
      taskIds: {
        assignmentId: assignmentId || '',
        lectureId: lectureId || '',
        studySessionId: studySessionId || '',
      },
    };
  } catch (error) {
    console.error('❌ Error creating example data:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create example data',
    };
  }
}

/**
 * Removes all example data for a user
 * Finds and deletes all items where is_example: true
 */
export async function clearExampleData(userId: string): Promise<boolean> {
  try {
    console.log('🗑️ Clearing example data for user:', userId);

    // Get current session to ensure we have a valid token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.error('No valid session found for clearing example data');
      return false;
    }

    const authHeaders = {
      Authorization: `Bearer ${session.access_token}`,
    };

    // Note: The backend should handle filtering by is_example flag
    // For now, we'll delete the example course which should cascade delete related tasks

    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, course_code')
      .eq('user_id', userId)
      .eq('course_code', 'EXAMPLE-101');

    if (fetchError) {
      console.error('Error fetching example courses:', fetchError);
      throw fetchError;
    }

    if (courses && courses.length > 0) {
      for (const course of courses) {
        // Use the batch delete function if available, otherwise use soft delete
        const { error: deleteError } = await supabase.functions.invoke(
          'delete-course',
          {
            headers: authHeaders,
            body: { courseId: course.id },
          },
        );

        if (deleteError) {
          console.error('Error deleting example course:', deleteError);
        } else {
          console.log('✅ Deleted example course:', course.id);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error clearing example data:', error);
    return false;
  }
}

/**
 * Check if user has any example data
 */
export async function hasExampleData(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', userId)
      .eq('course_code', 'EXAMPLE-101')
      .limit(1);

    if (error) {
      console.error('Error checking for example data:', error);
      return false;
    }

    return (data && data.length > 0) || false;
  } catch (error) {
    console.error('Error in hasExampleData:', error);
    return false;
  }
}
