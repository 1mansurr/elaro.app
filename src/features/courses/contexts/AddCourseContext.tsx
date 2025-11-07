import React, { ReactNode } from 'react';
import {
  CreationFlowProvider,
  useCreationFlow,
} from '@/contexts/CreationFlowContext';

// 1. Define the specific data structure for this flow
export interface AddCourseData {
  courseName: string;
  courseCode: string;
  courseDescription: string;
  startTime: Date | null;
  endTime: Date | null;
  recurrence: 'none' | 'weekly' | 'bi-weekly';
  reminders: number[];
}

// 2. Define the initial state for this flow
const initialCourseData: AddCourseData = {
  courseName: '',
  courseCode: '',
  courseDescription: '',
  startTime: null,
  endTime: null,
  recurrence: 'none',
  reminders: [30], // Default to a 30-minute reminder
};

// 3. Create the specific provider for this flow
export const AddCourseProvider = ({ children }: { children: ReactNode }) => (
  <CreationFlowProvider initialState={initialCourseData}>
    {children}
  </CreationFlowProvider>
);

// 4. Create the specific hook for this flow
export const useAddCourse = () => {
  const { data, updateData, resetData } = useCreationFlow<AddCourseData>();
  return {
    courseData: data,
    updateCourseData: updateData,
    resetCourseData: resetData,
  };
};
