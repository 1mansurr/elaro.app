import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the context value
interface CreationFlowContextType<T> {
  data: T;
  updateData: (updates: Partial<T>) => void;
  resetData: () => void;
}

// Create a generic context
export const CreationFlowContext = createContext<CreationFlowContextType<any> | undefined>(undefined);

// Create a generic provider component
export function CreationFlowProvider<T>({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: T;
}) {
  const [data, setData] = useState<T>(initialState);

  const updateData = (updates: Partial<T>) => {
    setData((prevData) => ({ ...prevData, ...updates }));
  };

  const resetData = () => {
    setData(initialState);
  };

  const value = { data, updateData, resetData };

  return (
    <CreationFlowContext.Provider value={value}>
      {children}
    </CreationFlowContext.Provider>
  );
}

// Create a generic hook to use the context
export function useCreationFlow<T>(): CreationFlowContextType<T> {
  const context = useContext(CreationFlowContext);
  if (context === undefined) {
    throw new Error('useCreationFlow must be used within a CreationFlowProvider');
  }
  return context;
}
