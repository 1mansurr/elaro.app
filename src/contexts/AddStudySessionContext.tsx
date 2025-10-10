import React, { ReactNode } from 'react';
import { Course } from '../types';
import { CreationFlowProvider, useCreationFlow } from './CreationFlowContext';

// 1. Define the specific data structure for this flow
export interface AddStudySessionData {
  course: Course | null;
  topic: string;
  description: string;
  sessionDate: Date | null;
  hasSpacedRepetition: boolean;
  reminders: number[];
}

// 2. Define the initial state for this flow
const initialStudySessionData: AddStudySessionData = {
  course: null,
  topic: '',
  description: '',
  sessionDate: null,
  hasSpacedRepetition: false,
  reminders: [15], // Default to a 15-minute reminder
};

// 3. Create the specific provider for this flow
export const AddStudySessionProvider = ({ children }: { children: ReactNode }) => (
  <CreationFlowProvider initialState={initialStudySessionData}>
    {children}
  </CreationFlowProvider>
);

// 4. Create the specific hook for this flow
export const useAddStudySession = () => {
  const { data, updateData, resetData } = useCreationFlow<AddStudySessionData>();
  return {
    sessionData: data,
    updateSessionData: updateData,
    resetSessionData: resetData,
  };
};
