import { coursesApi } from './queries/courses';
import { assignmentsApi } from './queries/assignments';
import { lecturesApi } from './queries/lectures';
import { studySessionsApi } from './queries/studySessions';
import { homeScreenApi } from './queries/homeScreen';
import { calendarApi } from './queries/calendar';
import { notificationPreferencesApi } from './queries/notificationPreferences';
import { assignmentsApiMutations } from './mutations/assignments';
import { lecturesApiMutations } from './mutations/lectures';
import { studySessionsApiMutations } from './mutations/studySessions';
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
