// constants/checklist.ts
export interface ChecklistItem {
  id: number;
  icon: string;
  title: string;
  completed: boolean;
}

export const INITIAL_CHECKLIST: Omit<ChecklistItem, 'completed'>[] = [
  { id: 1, icon: '🎬', title: 'Learn How ELARO works' },
  { id: 2, icon: '📚', title: 'Add a study session' },
  { id: 3, icon: '📋', title: 'Add a task or event' },
  { id: 4, icon: '🧠', title: 'Discover your learning style' },
];

export const GUIDE_SECTIONS = [
  'Study Techniques',
  'Memory Methods', 
  'Time Management',
  'Note-Taking'
]; 