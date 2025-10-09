import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course } from '../types';

export type SubmissionMethod = 'Online' | 'In-person' | null;

// Define the shape of our assignment data
export interface AddAssignmentData {
  course: Course | null;
  title: string;
  description: string;
  dueDate: Date | null;
  submissionMethod: SubmissionMethod;
  submissionLink: string;
  reminders: number[];
}

// Define the shape of the context value
interface AddAssignmentContextType {
  assignmentData: AddAssignmentData;
  updateAssignmentData: (updates: Partial<AddAssignmentData>) => void;
  resetAssignmentData: () => void;
}

// Create the context
const AddAssignmentContext = createContext<AddAssignmentContextType | undefined>(undefined);

// Define the initial state
const initialState: AddAssignmentData = {
  course: null,
  title: '',
  description: '',
  dueDate: null,
  submissionMethod: null,
  submissionLink: '',
  reminders: [120], // Default to a 2-hour reminder
};

// Create the provider component
export const AddAssignmentProvider = ({ children }: { children: ReactNode }) => {
  const [assignmentData, setAssignmentData] = useState<AddAssignmentData>(initialState);

  const updateAssignmentData = (updates: Partial<AddAssignmentData>) => {
    setAssignmentData(prevData => ({ ...prevData, ...updates }));
  };

  const resetAssignmentData = () => {
    setAssignmentData(initialState);
  };

  const value = {
    assignmentData,
    updateAssignmentData,
    resetAssignmentData,
  };

  return (
    <AddAssignmentContext.Provider value={value}>
      {children}
    </AddAssignmentContext.Provider>
  );
};

// Create the custom hook to use the context
export const useAddAssignment = () => {
  const context = useContext(AddAssignmentContext);
  if (context === undefined) {
    throw new Error('useAddAssignment must be used within an AddAssignmentProvider');
  }
  return context;
};
