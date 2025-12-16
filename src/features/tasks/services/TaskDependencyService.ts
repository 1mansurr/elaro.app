import { supabase } from '@/services/supabase';

// NOTE: This service uses direct Supabase queries and needs API endpoints created.
// TODO: Create API endpoints in api-v2 for task dependency operations:
//   - POST /api-v2/task-dependencies (create dependency)
//   - GET /api-v2/task-dependencies/:taskId (get dependencies)
//   - DELETE /api-v2/task-dependencies/:id (remove dependency)
//   - POST /api-v2/task-dependencies/validate (validate dependencies)

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

  /**
   * Create a task with dependencies
   */
  async createTaskWithDependencies(
    task: EnhancedTask,
    userId: string,
  ): Promise<EnhancedTask> {
    try {
      // 1. Validate dependencies
      const validation = await this.validateDependencies(
        task.dependencies,
        userId,
      );
      if (!validation.isValid) {
        throw new Error(
          `Invalid dependencies: ${validation.errors.join(', ')}`,
        );
      }

      // 2. Create the task based on type
      const createdTask = await this.createTask(task, userId);

      // 3. Create dependency relationships
      await this.createDependencies(
        createdTask.id,
        task.dependencies,
        task.type,
      );

      // 4. Update dependent task statuses
      await this.updateDependentTaskStatuses(createdTask.id, task.type);

      return createdTask;
    } catch (error) {
      console.error('❌ Error creating task with dependencies:', error);
      throw error;
    }
  }

  /**
   * Complete a task and handle dependencies
   */
  async completeTask(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<void> {
    try {
      // 1. Mark task as completed
      await this.markTaskCompleted(taskId, taskType);

      // 2. Check if any dependent tasks can now be unlocked
      await this.unlockDependentTasks(taskId, taskType);

      // 3. Trigger any auto-completion workflows
      await this.processAutoCompletions(taskId, taskType);
    } catch (error) {
      console.error('❌ Error completing task:', error);
      throw error;
    }
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<TaskDependency[]> {
    try {
      let dependencies: TaskDependency[] = [];

      switch (taskType) {
        case 'assignment':
          const { data: assignmentDeps, error: assignmentError } =
            await supabase
              .from('task_dependencies')
              .select('*')
              .eq('task_id', taskId);

          if (assignmentError) throw assignmentError;
          dependencies = assignmentDeps || [];
          break;

        case 'lecture':
          const { data: lectureDeps, error: lectureError } = await supabase
            .from('lecture_dependencies')
            .select('*')
            .eq('lecture_id', taskId);

          if (lectureError) throw lectureError;
          dependencies = lectureDeps || [];
          break;

        case 'study_session':
          const { data: sessionDeps, error: sessionError } = await supabase
            .from('study_session_dependencies')
            .select('*')
            .eq('study_session_id', taskId);

          if (sessionError) throw sessionError;
          dependencies = sessionDeps || [];
          break;
      }

      return dependencies.map(dep => ({
        id: dep.id,
        taskId: dep.task_id || dep.lecture_id || dep.study_session_id,
        dependsOnTaskId: dep.depends_on_task_id || dep.depends_on_id,
        dependencyType: dep.dependency_type,
        autoComplete: dep.auto_complete,
        createdAt: dep.created_at,
        updatedAt: dep.updated_at,
      }));
    } catch (error) {
      console.error('❌ Error getting task dependencies:', error);
      throw error;
    }
  }

  /**
   * Get dependent tasks (tasks that depend on this one)
   */
  async getDependentTasks(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<EnhancedTask[]> {
    try {
      // This is a complex query that needs to check all dependency tables
      // For now, we'll implement a simplified version
      const dependentTasks: EnhancedTask[] = [];

      // Check assignment dependencies
      const { data: assignmentDeps } = await supabase
        .from('task_dependencies')
        .select('task_id, assignments!inner(id, title, due_date)')
        .eq('depends_on_task_id', taskId);

      if (assignmentDeps) {
        for (const dep of assignmentDeps) {
          const assignment = Array.isArray(dep.assignments)
            ? dep.assignments[0]
            : dep.assignments;
          dependentTasks.push({
            id: assignment?.id,
            type: 'assignment',
            title: assignment?.title,
            status: 'available', // Simplified
            dependencies: [],
            dependentTasks: [],
            dueDate: assignment?.due_date,
          });
        }
      }

      return dependentTasks;
    } catch (error) {
      console.error('❌ Error getting dependent tasks:', error);
      throw error;
    }
  }

  /**
   * Validate dependencies for circular references and validity
   */
  async validateDependencies(
    dependencies: TaskDependency[],
    userId: string,
  ): Promise<DependencyValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const circularDependencies: string[][] = [];

      // Check for self-dependencies
      for (const dep of dependencies) {
        if (dep.taskId === dep.dependsOnTaskId) {
          errors.push(`Task cannot depend on itself: ${dep.taskId}`);
        }
      }

      // Check for circular dependencies
      const circular = this.detectCircularDependencies(dependencies);
      if (circular.length > 0) {
        circularDependencies.push(...circular);
        errors.push(
          `Circular dependencies detected: ${circular.map(c => c.join(' -> ')).join(', ')}`,
        );
      }

      // Check if dependent tasks exist and belong to user
      for (const dep of dependencies) {
        const exists = await this.checkTaskExists(dep.dependsOnTaskId, userId);
        if (!exists) {
          errors.push(
            `Dependent task does not exist or access denied: ${dep.dependsOnTaskId}`,
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        circularDependencies,
      };
    } catch (error) {
      console.error('❌ Error validating dependencies:', error);
      return {
        isValid: false,
        errors: ['Validation failed'],
        warnings: [],
        circularDependencies: [],
      };
    }
  }

  /**
   * Create dependencies for a task
   */
  private async createDependencies(
    taskId: string,
    dependencies: TaskDependency[],
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<void> {
    try {
      for (const dep of dependencies) {
        switch (taskType) {
          case 'assignment':
            await supabase.from('task_dependencies').insert({
              task_id: taskId,
              depends_on_task_id: dep.dependsOnTaskId,
              dependency_type: dep.dependencyType,
              auto_complete: dep.autoComplete,
            });
            break;

          case 'lecture':
            await supabase.from('lecture_dependencies').insert({
              lecture_id: taskId,
              depends_on_id: dep.dependsOnTaskId,
              depends_on_type: 'assignment', // Simplified for now
              dependency_type: dep.dependencyType,
              auto_complete: dep.autoComplete,
            });
            break;

          case 'study_session':
            await supabase.from('study_session_dependencies').insert({
              study_session_id: taskId,
              depends_on_id: dep.dependsOnTaskId,
              depends_on_type: 'assignment', // Simplified for now
              dependency_type: dep.dependencyType,
              auto_complete: dep.autoComplete,
            });
            break;
        }
      }
    } catch (error) {
      console.error('❌ Error creating dependencies:', error);
      throw error;
    }
  }

  /**
   * Create a task based on type
   */
  private async createTask(
    task: EnhancedTask,
    userId: string,
  ): Promise<EnhancedTask> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd call the appropriate task creation function

      const baseTask = {
        id: task.id,
        type: task.type,
        title: task.title,
        status: task.status,
        dependencies: [],
        dependentTasks: [],
        dueDate: task.dueDate,
      };

      return baseTask;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  /**
   * Mark a task as completed
   */
  private async markTaskCompleted(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<void> {
    try {
      const tableName = this.getTableName(taskType);
      const { error } = await supabase
        .from(tableName)
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to mark task as completed: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error marking task as completed:', error);
      throw error;
    }
  }

  /**
   * Unlock dependent tasks when prerequisites are completed
   */
  private async unlockDependentTasks(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<void> {
    try {
      // Get all tasks that depend on this one
      const dependentTasks = await this.getDependentTasks(taskId, taskType);

      for (const dependentTask of dependentTasks) {
        // Check if all prerequisites are now completed
        const allPrerequisitesComplete =
          await this.checkAllPrerequisitesComplete(
            dependentTask.id,
            dependentTask.type,
          );

        if (allPrerequisitesComplete) {
          // Update task status to available
          await this.updateTaskStatus(
            dependentTask.id,
            dependentTask.type,
            'available',
          );
        }
      }
    } catch (error) {
      console.error('❌ Error unlocking dependent tasks:', error);
      throw error;
    }
  }

  /**
   * Process auto-completion workflows
   */
  private async processAutoCompletions(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<void> {
    try {
      // Get dependencies where auto_complete is true
      const dependencies = await this.getTaskDependencies(taskId, taskType);
      const autoCompleteDeps = dependencies.filter(dep => dep.autoComplete);

      for (const dep of autoCompleteDeps) {
        // Auto-complete the dependent task
        await this.completeTask(dep.dependsOnTaskId, taskType);
      }
    } catch (error) {
      console.error('❌ Error processing auto-completions:', error);
      throw error;
    }
  }

  /**
   * Check if a task exists and belongs to the user
   */
  private async checkTaskExists(
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Check all task tables
      const [assignmentResult, lectureResult, sessionResult] =
        await Promise.all([
          supabase
            .from('assignments')
            .select('id')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single(),
          supabase
            .from('lectures')
            .select('id')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single(),
          supabase
            .from('study_sessions')
            .select('id')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single(),
        ]);

      return !!(
        assignmentResult.data ||
        lectureResult.data ||
        sessionResult.data
      );
    } catch (error) {
      console.error('❌ Error checking task existence:', error);
      return false;
    }
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(
    dependencies: TaskDependency[],
  ): string[][] {
    const graph = new Map<string, string[]>();
    const circular: string[][] = [];

    // Build adjacency list
    for (const dep of dependencies) {
      if (!graph.has(dep.taskId)) {
        graph.set(dep.taskId, []);
      }
      graph.get(dep.taskId)!.push(dep.dependsOnTaskId);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        circular.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path, node]);
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return circular;
  }

  /**
   * Check if all prerequisites are completed
   */
  private async checkAllPrerequisitesComplete(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<boolean> {
    try {
      const dependencies = await this.getTaskDependencies(taskId, taskType);
      const blockingDeps = dependencies.filter(
        dep => dep.dependencyType === 'blocking',
      );

      for (const dep of blockingDeps) {
        const isCompleted = await this.isTaskCompleted(
          dep.dependsOnTaskId,
          taskType,
        );
        if (!isCompleted) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking prerequisites:', error);
      return false;
    }
  }

  /**
   * Check if a task is completed
   */
  private async isTaskCompleted(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<boolean> {
    try {
      const tableName = this.getTableName(taskType);
      const { data, error } = await supabase
        .from(tableName)
        .select('completed_at')
        .eq('id', taskId)
        .single();

      if (error || !data) {
        return false;
      }

      return !!data.completed_at;
    } catch (error) {
      console.error('❌ Error checking task completion:', error);
      return false;
    }
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
    status: string,
  ): Promise<void> {
    try {
      const tableName = this.getTableName(taskType);
      const { error } = await supabase
        .from(tableName)
        .update({ status })
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to update task status: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      throw error;
    }
  }

  /**
   * Get table name for task type
   */
  private getTableName(
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): string {
    switch (taskType) {
      case 'assignment':
        return 'assignments';
      case 'lecture':
        return 'lectures';
      case 'study_session':
        return 'study_sessions';
      default:
        throw new Error(`Invalid task type: ${taskType}`);
    }
  }

  /**
   * Update dependent task statuses
   */
  private async updateDependentTaskStatuses(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
  ): Promise<void> {
    try {
      // This would update the status of tasks that depend on the newly created task
      // Implementation depends on your specific business logic
      console.log(`Updating dependent task statuses for ${taskId}`);
    } catch (error) {
      console.error('❌ Error updating dependent task statuses:', error);
      throw error;
    }
  }
}
