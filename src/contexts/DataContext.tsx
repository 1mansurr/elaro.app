import React, { createContext, useState, useContext, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Course, Task } from '../types';

interface OverviewData {
  lectures: number;
  study_sessions: number;
  assignments: number;
  reviews: number;
}

interface HomeData {
  nextUpcomingTask: any; // Replace with proper Task type when available
  todayOverview: OverviewData | null;
  weeklyTaskCount: number;
}

interface CalendarData {
  [date: string]: Task[];
}

interface DataContextType {
  homeData: HomeData | null;
  courses: Course[];
  calendarData: CalendarData;
  loading: boolean;
  fetchInitialData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [homeDataRes, coursesRes, calendarRes] = await Promise.all([
        supabase.functions.invoke('get-home-screen-data'),
        supabase.from('courses').select('*'),
        supabase.functions.invoke('get-calendar-data-for-week', {
          body: { date: new Date().toISOString() },
        }),
      ]);

      if (homeDataRes.error) throw homeDataRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (calendarRes.error) throw calendarRes.error;

      setHomeData(homeDataRes.data);
      setCourses(coursesRes.data || []);
      setCalendarData(calendarRes.data || {});
    } catch (error) {
      console.error("Failed to fetch initial app data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = { homeData, courses, calendarData, loading, fetchInitialData };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
