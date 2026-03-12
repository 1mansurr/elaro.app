// Offline MVP — unified api facade backed by SQLite services
import { coursesApi } from '@/features/courses/services/queries';
import { assignmentsApi } from '@/features/assignments/services/queries';
import { lecturesApi } from '@/features/lectures/services/queries';
import { studySessionsApi } from '@/features/studySessions/services/queries';
import { assignmentsApiMutations } from '@/features/assignments/services/mutations';
import { lecturesApiMutations } from '@/features/lectures/services/mutations';
import { studySessionsApiMutations } from '@/features/studySessions/services/mutations';

export const api = {
  courses: coursesApi,
  assignments: assignmentsApi,
  lectures: lecturesApi,
  studySessions: studySessionsApi,
  homeScreen: {
    async getData() {
      return null;
    },
  },
  calendar: {
    async getData(_date: Date) {
      return {};
    },
    async getMonthData(_year: number, _month: number) {
      return {};
    },
  },
  mutations: {
    assignments: assignmentsApiMutations,
    lectures: lecturesApiMutations,
    studySessions: studySessionsApiMutations,
  },
};
