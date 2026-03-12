// Offline MVP stub — Supabase edge function calls removed

interface ExampleDataResult {
  success: boolean;
  courseId?: string;
  taskIds?: {
    assignmentId: string;
    lectureId: string;
    studySessionId: string;
  };
  error?: string;
}

export async function createExampleData(
  _userId: string,
): Promise<ExampleDataResult> {
  return { success: false, error: 'Not available in offline mode' };
}

export async function clearExampleData(_userId: string): Promise<boolean> {
  return false;
}

export async function hasExampleData(_userId: string): Promise<boolean> {
  return false;
}
