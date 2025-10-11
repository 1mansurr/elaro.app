import React, { ReactNode } from 'react';
import { Course } from '@/types';
import { CreationFlowProvider, useCreationFlow } from '@/contexts/CreationFlowContext';

// 1. Define the specific data structure for this flow
export interface AddLectureData {
  course: Course | null;
  startTime: Date | null;
  endTime: Date | null;
  recurrence: 'none' | 'weekly' | 'bi-weekly'; // RE-ADDED THIS FIELD
  reminders: number[];
}

// 2. Define the initial state for this flow
const initialLectureData: AddLectureData = {
  course: null,
  startTime: null,
  endTime: null,
  recurrence: 'none', // RE-ADDED THIS FIELD with its default
  reminders: [30], // Default to a 30-minute reminder
};

// 3. Create the specific provider for this flow
export const AddLectureProvider = ({ children }: { children: ReactNode }) => (
  <CreationFlowProvider initialState={initialLectureData}>
    {children}
  </CreationFlowProvider>
);

// 4. Create the specific hook for this flow
export const useAddLecture = () => {
  const { data, updateData, resetData } = useCreationFlow<AddLectureData>();
  return {
    lectureData: data,
    updateLectureData: updateData,
    resetLectureData: resetData,
  };
};
