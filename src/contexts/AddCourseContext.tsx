import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of our course and lecture data
export interface AddCourseData {
  courseName: string;
  courseDescription: string;
  startTime: Date | null;
  endTime: Date | null;
  recurrence: 'none' | 'weekly' | 'bi-weekly';
  reminders: number[];
}

// Define the shape of the context value
interface AddCourseContextType {
  courseData: AddCourseData;
  updateCourseData: (updates: Partial<AddCourseData>) => void;
  resetCourseData: () => void;
}

// Create the context
const AddCourseContext = createContext<AddCourseContextType | undefined>(undefined);

// Define the initial state
const initialState: AddCourseData = {
  courseName: '',
  courseDescription: '',
  startTime: null,
  endTime: null,
  recurrence: 'none',
  reminders: [30], // Default to a 30-minute reminder
};

// Create the provider component
export const AddCourseProvider = ({ children }: { children: ReactNode }) => {
  const [courseData, setCourseData] = useState<AddCourseData>(initialState);

  const updateCourseData = (updates: Partial<AddCourseData>) => {
    setCourseData(prevData => ({ ...prevData, ...updates }));
  };

  const resetCourseData = () => {
    setCourseData(initialState);
  };

  const value = {
    courseData,
    updateCourseData,
    resetCourseData,
  };

  return (
    <AddCourseContext.Provider value={value}>
      {children}
    </AddCourseContext.Provider>
  );
};

// Create the custom hook to use the context
export const useAddCourse = () => {
  const context = useContext(AddCourseContext);
  if (context === undefined) {
    throw new Error('useAddCourse must be used within an AddCourseProvider');
  }
  return context;
};
