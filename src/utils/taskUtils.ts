// FILE: src/utils/taskUtils.ts
// ACTION: Create a new utility file with a function to count tasks in the current week.

import { isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { Task } from '../types';

// Minimal shared shape for counting purposes
type AnyTask = {
  created_at: string;
};

export const countTasksInCurrentWeek = (
  data: { lectures?: AnyTask[]; assignments?: AnyTask[]; studySessions?: AnyTask[] }
): number => {
  const now = new Date();
  // Setting weekStartsOn: 1 makes Monday the first day of the week
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const allTasks: AnyTask[] = [
    ...(data.lectures || []),
    ...(data.assignments || []),
    ...(data.studySessions || []),
  ];

  const tasksInCurrentWeek = allTasks.filter(task => {
    if (!task.created_at) return false;
    const taskDate = new Date(task.created_at);
    return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
  });

  return tasksInCurrentWeek.length;
};

export const countTasksInCurrentMonth = (
  data: { lectures?: AnyTask[]; assignments?: AnyTask[]; studySessions?: AnyTask[] }
): number => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const allTasks: AnyTask[] = [
    ...(data.lectures || []),
    ...(data.assignments || []),
    ...(data.studySessions || []),
  ];

  const tasksInCurrentMonth = allTasks.filter(task => {
    if (!task.created_at) return false;
    const taskDate = new Date(task.created_at);
    return isWithinInterval(taskDate, { start: monthStart, end: monthEnd });
  });

  return tasksInCurrentMonth.length;
};


