import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course } from '../types';

// Define the shape of our lecture data
export interface AddLectureData {
  course: Course | null;
  startTime: Date | null;
  endTime: Date | null;
  recurrence: 'none' | 'weekly' | 'bi-weekly'; // RE-ADDED THIS FIELD
  reminders: number[];
}

// Define the shape of the context value
interface AddLectureContextType {
  lectureData: AddLectureData;
  updateLectureData: (updates: Partial<AddLectureData>) => void;
  resetLectureData: () => void;
}

// Create the context
const AddLectureContext = createContext<AddLectureContextType | undefined>(undefined);

// Define the initial state
const initialState: AddLectureData = {
  course: null,
  startTime: null,
  endTime: null,
  recurrence: 'none', // RE-ADDED THIS FIELD with its default
  reminders: [30], // Default to a 30-minute reminder
};

// Create the provider component
export const AddLectureProvider = ({ children }: { children: ReactNode }) => {
  const [lectureData, setLectureData] = useState<AddLectureData>(initialState);

  const updateLectureData = (updates: Partial<AddLectureData>) => {
    setLectureData(prevData => ({ ...prevData, ...updates }));
  };

  const resetLectureData = () => {
    setLectureData(initialState);
  };

  const value = {
    lectureData,
    updateLectureData,
    resetLectureData,
  };

  return (
    <AddLectureContext.Provider value={value}>
      {children}
    </AddLectureContext.Provider>
  );
};

// Create the custom hook to use the context
export const useAddLecture = () => {
  const context = useContext(AddLectureContext);
  if (context === undefined) {
    throw new Error('useAddLecture must be used within an AddLectureProvider');
  }
  return context;
};
