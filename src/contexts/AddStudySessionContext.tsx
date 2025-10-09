import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course } from '../types';

// Define the shape of our study session data
export interface AddStudySessionData {
  course: Course | null;
  topic: string;
  description: string;
  sessionDate: Date | null;
  hasSpacedRepetition: boolean;
  reminders: number[];
}

// Define the shape of the context value
interface AddStudySessionContextType {
  sessionData: AddStudySessionData;
  updateSessionData: (updates: Partial<AddStudySessionData>) => void;
  resetSessionData: () => void;
}

// Create the context
const AddStudySessionContext = createContext<AddStudySessionContextType | undefined>(undefined);

// Define the initial state
const initialState: AddStudySessionData = {
  course: null,
  topic: '',
  description: '',
  sessionDate: null,
  hasSpacedRepetition: false,
  reminders: [15], // Default to a 15-minute reminder
};

// Create the provider component
export const AddStudySessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionData, setSessionData] = useState<AddStudySessionData>(initialState);

  const updateSessionData = (updates: Partial<AddStudySessionData>) => {
    setSessionData(prevData => ({ ...prevData, ...updates }));
  };

  const resetSessionData = () => {
    setSessionData(initialState);
  };

  const value = {
    sessionData,
    updateSessionData,
    resetSessionData,
  };

  return (
    <AddStudySessionContext.Provider value={value}>
      {children}
    </AddStudySessionContext.Provider>
  );
};

// Create the custom hook to use the context
export const useAddStudySession = () => {
  const context = useContext(AddStudySessionContext);
  if (context === undefined) {
    throw new Error('useAddStudySession must be used within an AddStudySessionProvider');
  }
  return context;
};
