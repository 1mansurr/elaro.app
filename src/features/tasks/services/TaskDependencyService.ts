// Offline MVP stub — all Supabase calls removed

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'blocking' | 'suggested' | 'parallel';
  autoComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrossTaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  dependsOnType: 'assignment' | 'lecture' | 'study_session';
  dependencyType: 'blocking' | 'suggested' | 'parallel';
  autoComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedTask {
  id: string;
  type: 'assignment' | 'lecture' | 'study_session';
  title: string;
  status: 'blocked' | 'available' | 'in_progress' | 'completed';
  dependencies: TaskDependency[];
  dependentTasks: EnhancedTask[];
  completionDate?: string;
  dueDate?: string;
}

export interface DependencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  circularDependencies: string[][];
}

export class TaskDependencyService {
  private static instance: TaskDependencyService;

  public static getInstance(): TaskDependencyService {
    if (!TaskDependencyService.instance) {
      TaskDependencyService.instance = new TaskDependencyService();
    }
    return TaskDependencyService.instance;
  }

  async createTaskWithDependencies(_task: EnhancedTask, _userId: string): Promise<EnhancedTask> {
    throw new Error('TaskDependencyService not available in offline mode');
  }

  async completeTask(_taskId: string, _taskType: 'assignment' | 'lecture' | 'study_session'): Promise<void> {
    throw new Error('TaskDependencyService not available in offline mode');
  }

  async getTaskDependencies(
    _taskId: string,
    _taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<TaskDependency[]> {
    return [];
  }

  async getDependentTasks(
    _taskId: string,
    _taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<EnhancedTask[]> {
    return [];
  }

  async validateDependencies(
    _dependencies: TaskDependency[],
    _userId: string,
  ): Promise<DependencyValidationResult> {
    return { isValid: true, errors: [], warnings: [], circularDependencies: [] };
  }
}
