// constants/calendar.ts

import tinycolor from 'tinycolor2';

// Type definitions
export interface CalendarItem {
  id: string;
  title: string;
  type: 'study' | 'assignment' | 'exam' | 'lecture' | 'program';
  time: string;
  endTime?: string;
  date: string;
  completed: boolean;
  hasSpacedRepetition: boolean;
  srRemaining?: number;
  srTotal?: number;
  description?: string;
  isRepeating?: boolean;
  repeatPattern?: string;
}

// Enhanced color system with gradients
export const EVENT_COLORS: Record<
  CalendarItem['type'],
  {
    primary: string;
    secondary: string;
    gradient: [string, string];
  }
> = {
  study: {
    primary: '#10B981',
    secondary: '#34D399',
    gradient: ['#10B981', '#34D399'],
  },
  assignment: {
    primary: '#F59E0B',
    secondary: '#FCD34D',
    gradient: ['#F59E0B', '#FCD34D'],
  },
  exam: {
    primary: '#EF4444',
    secondary: '#F87171',
    gradient: ['#EF4444', '#F87171'],
  },
  lecture: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  program: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
};

// Utility to darken a color until it meets AA contrast with white
function darkenToAA(color: string, minContrast = 4.5) {
  let c = tinycolor(color);
  let tries = 0;
  while (tinycolor.readability(c, '#fff') < minContrast && tries < 20) {
    c = c.darken(5);
    tries++;
  }
  return c.toHexString();
}

// Generate darkened secondary colors for gradients
export const EVENT_COLORS_DARKENED: Record<
  CalendarItem['type'],
  {
    primary: string;
    secondary: string;
    gradient: [string, string];
  }
> = Object.fromEntries(
  Object.entries(EVENT_COLORS).map(([type, val]) => [
    type,
    {
      primary: val.primary,
      secondary: darkenToAA(val.secondary),
      gradient: [val.primary, darkenToAA(val.secondary)],
    },
  ]),
) as any;

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
