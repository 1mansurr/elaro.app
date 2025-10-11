import React, { ReactNode } from 'react';
import { Course } from '@/types';
import { CreationFlowProvider, useCreationFlow } from '@/contexts/CreationFlowContext';

export type SubmissionMethod = 'Online' | 'In-person' | null;

// 1. Define the specific data structure for this flow
export interface AddAssignmentData {
  course: Course | null;
  title: string;
  description: string;
  dueDate: Date | null;
  submissionMethod: SubmissionMethod;
  submissionLink: string;
  reminders: number[];
}

// 2. Define the initial state for this flow
const initialAssignmentData: AddAssignmentData = {
  course: null,
  title: '',
  description: '',
  dueDate: null,
  submissionMethod: null,
  submissionLink: '',
  reminders: [120], // Default to a 2-hour reminder
};

// 3. Create the specific provider for this flow
export const AddAssignmentProvider = ({ children }: { children: ReactNode }) => (
  <CreationFlowProvider initialState={initialAssignmentData}>
    {children}
  </CreationFlowProvider>
);

// 4. Create the specific hook for this flow
export const useAddAssignment = () => {
  const { data, updateData, resetData } = useCreationFlow<AddAssignmentData>();
  return {
    assignmentData: data,
    updateAssignmentData: updateData,
    resetAssignmentData: resetData,
  };
};
