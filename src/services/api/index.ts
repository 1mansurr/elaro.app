import { coursesApi } from '@/features/courses/services/queries';
import { assignmentsApi } from '@/features/assignments/services/queries';
import { lecturesApi } from '@/features/lectures/services/queries';
import { studySessionsApi } from '@/features/studySessions/services/queries';
import { homeScreenApi } from './queries/homeScreen';
import { calendarApi } from './queries/calendar';
import { notificationPreferencesApi } from './queries/notificationPreferences';
import { assignmentsApiMutations } from '@/features/assignments/services/mutations';
import { lecturesApiMutations } from '@/features/lectures/services/mutations';
import { studySessionsApiMutations } from '@/features/studySessions/services/mutations';
import { notificationPreferencesApiMutations } from './mutations/notificationPreferences';

export const api = {
  // Queries
  courses: coursesApi,
  assignments: assignmentsApi,
  lectures: lecturesApi,
  studySessions: studySessionsApi,
  homeScreen: homeScreenApi,
  calendar: calendarApi,
  notificationPreferences: notificationPreferencesApi,

  // Mutations
  mutations: {
    assignments: assignmentsApiMutations,
    lectures: lecturesApiMutations,
    studySessions: studySessionsApiMutations,
    notificationPreferences: notificationPreferencesApiMutations,
  },
};
