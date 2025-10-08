// FILE: src/hooks/useDataQueries.ts
// ACTION: Create a new file for our custom React Query hooks.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase'; // Assuming this is your Supabase client instance
import { Course, Assignment, Lecture, StudySession, HomeScreenData, CalendarData } from '../types';

// --- Courses Hook ---

// Define the function that will fetch the data.
// React Query uses this function to get the data for the query.
const fetchCourses = async (): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching courses:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// Create the custom hook.
export const useCourses = () => {
  return useQuery<Course[], Error>({
    // 'queryKey' is a unique identifier for this query.
    // React Query uses it for caching.
    queryKey: ['courses'],
    // 'queryFn' is the function that fetches the data.
    queryFn: fetchCourses,
  });
};

// --- Assignments Hook ---

const fetchAssignments = async (): Promise<Assignment[]> => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching assignments:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const useAssignments = () => {
  return useQuery<Assignment[], Error>({
    queryKey: ['assignments'],
    queryFn: fetchAssignments,
  });
};

// --- Lectures Hook ---

const fetchLectures = async (): Promise<Lecture[]> => {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .order('lecture_date', { ascending: true });

  if (error) {
    console.error('Error fetching lectures:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const useLectures = () => {
  return useQuery<Lecture[], Error>({
    queryKey: ['lectures'],
    queryFn: fetchLectures,
  });
};

// --- Study Sessions Hook ---

const fetchStudySessions = async (): Promise<StudySession[]> => {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .order('session_date', { ascending: true });

  if (error) {
    console.error('Error fetching study sessions:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const useStudySessions = () => {
  return useQuery<StudySession[], Error>({
    queryKey: ['studySessions'],
    queryFn: fetchStudySessions,
  });
};

// --- Home Screen Data Hook ---

const fetchHomeScreenData = async (): Promise<HomeScreenData | null> => {
  const { data, error } = await supabase.functions.invoke('get-home-screen-data');

  if (error) {
    console.error('Error fetching home screen data:', error);
    throw new Error(error.message);
  }
  return data;
};

export const useHomeScreenData = () => {
  return useQuery<HomeScreenData | null, Error>({
    queryKey: ['homeScreenData'],
    queryFn: fetchHomeScreenData,
  });
};

// --- Calendar Screen Data Hook ---

const fetchCalendarData = async (date: Date): Promise<CalendarData> => {
  const { data, error } = await supabase.functions.invoke('get-calendar-data-for-week', {
    body: { date: date.toISOString() },
  });

  if (error) {
    console.error('Error fetching calendar data:', error);
    throw new Error(error.message);
  }
  return data || {};
};

export const useCalendarData = (date: Date) => {
  return useQuery<CalendarData, Error>({
    queryKey: ['calendarData', date.toDateString()],
    queryFn: () => fetchCalendarData(date),
  });
};
