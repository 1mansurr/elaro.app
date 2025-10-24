/**
 * Event-Driven Architecture for Business Logic
 * 
 * This module provides a centralized event-driven system for handling
 * business logic that was previously embedded in database triggers.
 */

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UserCreatedEvent extends BaseEvent {
  type: 'user_created';
  data: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscriptionTier: string;
  };
}

export interface CourseDeletedEvent extends BaseEvent {
  type: 'course_deleted';
  data: {
    courseId: string;
    userId: string;
    courseName: string;
    cascadeCount: number;
  };
}

export interface TaskCompletedEvent extends BaseEvent {
  type: 'task_completed';
  data: {
    taskId: string;
    taskType: 'assignment' | 'lecture' | 'study_session';
    userId: string;
    completedAt: string;
  };
}

export interface SubscriptionChangedEvent extends BaseEvent {
  type: 'subscription_changed';
  data: {
    userId: string;
    oldTier: string;
    newTier: string;
    changedAt: string;
  };
}

export type AppEvent = 
  | UserCreatedEvent 
  | CourseDeletedEvent 
  | TaskCompletedEvent 
  | SubscriptionChangedEvent;

export interface EventHandler<T extends AppEvent = AppEvent> {
  eventType: string;
  handler: (event: T) => Promise<void>;
  priority?: number;
  retryCount?: number;
  timeout?: number;
}

export interface EventProcessor {
  processEvent(event: AppEvent): Promise<void>;
  registerHandler(handler: EventHandler): void;
  unregisterHandler(eventType: string, handler: EventHandler): void;
}

/**
 * Central Event Processor
 */
export class CentralEventProcessor implements EventProcessor {
  private handlers: Map<string, EventHandler[]> = new Map();
  private processingQueue: AppEvent[] = [];
  private isProcessing = false;

  constructor() {
    this.startProcessing();
  }

  /**
   * Register an event handler
   */
  registerHandler(handler: EventHandler): void {
    const existing = this.handlers.get(handler.eventType) || [];
    existing.push(handler);
    
    // Sort by priority (higher priority first)
    existing.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    this.handlers.set(handler.eventType, existing);
  }

  /**
   * Unregister an event handler
   */
  unregisterHandler(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    const filtered = existing.filter(h => h !== handler);
    this.handlers.set(eventType, filtered);
  }

  /**
   * Process a single event
   */
  async processEvent(event: AppEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    
    for (const handler of handlers) {
      try {
        await this.executeHandler(handler, event);
      } catch (error) {
        console.error(`Error processing event ${event.type} with handler:`, error);
        
        // Retry logic
        if (handler.retryCount && handler.retryCount > 0) {
          await this.retryHandler(handler, event, handler.retryCount);
        }
      }
    }
  }

  /**
   * Execute a handler with timeout
   */
  private async executeHandler(handler: EventHandler, event: AppEvent): Promise<void> {
    const timeout = handler.timeout || 30000; // 30 seconds default
    
    return Promise.race([
      handler.handler(event),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Handler timeout')), timeout)
      )
    ]);
  }

  /**
   * Retry a failed handler
   */
  private async retryHandler(
    handler: EventHandler, 
    event: AppEvent, 
    retryCount: number
  ): Promise<void> {
    for (let i = 0; i < retryCount; i++) {
      try {
        await this.executeHandler(handler, event);
        return; // Success
      } catch (error) {
        console.error(`Retry ${i + 1}/${retryCount} failed for event ${event.type}:`, error);
        
        if (i === retryCount - 1) {
          throw error; // Final retry failed
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  /**
   * Start processing events from the queue
   */
  private startProcessing(): void {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        const event = this.processingQueue.shift();
        if (event) {
          await this.processEvent(event);
        }
      } catch (error) {
        console.error('Error processing event from queue:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Queue an event for processing
   */
  queueEvent(event: AppEvent): void {
    this.processingQueue.push(event);
  }
}

/**
 * Event Emitter for Database Events
 */
export class DatabaseEventEmitter {
  constructor(private supabaseClient: any) {}

  /**
   * Emit a user created event
   */
  async emitUserCreated(userData: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const event: UserCreatedEvent = {
      id: crypto.randomUUID(),
      type: 'user_created',
      timestamp: new Date().toISOString(),
      userId: userData.userId,
      data: {
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        subscriptionTier: 'free'
      }
    };

    // Store event in database
    await this.supabaseClient
      .from('user_events')
      .insert({
        user_id: userData.userId,
        event_type: event.type,
        event_data: event.data
      });

    // Emit to event processor
    globalEventProcessor.queueEvent(event);
  }

  /**
   * Emit a course deleted event
   */
  async emitCourseDeleted(courseData: {
    courseId: string;
    userId: string;
    courseName: string;
    cascadeCount: number;
  }): Promise<void> {
    const event: CourseDeletedEvent = {
      id: crypto.randomUUID(),
      type: 'course_deleted',
      timestamp: new Date().toISOString(),
      userId: courseData.userId,
      data: {
        courseId: courseData.courseId,
        userId: courseData.userId,
        courseName: courseData.courseName,
        cascadeCount: courseData.cascadeCount
      }
    };

    // Store event in database
    await this.supabaseClient
      .from('user_events')
      .insert({
        user_id: courseData.userId,
        event_type: event.type,
        event_data: event.data
      });

    // Emit to event processor
    globalEventProcessor.queueEvent(event);
  }

  /**
   * Emit a task completed event
   */
  async emitTaskCompleted(taskData: {
    taskId: string;
    taskType: 'assignment' | 'lecture' | 'study_session';
    userId: string;
    completedAt: string;
  }): Promise<void> {
    const event: TaskCompletedEvent = {
      id: crypto.randomUUID(),
      type: 'task_completed',
      timestamp: new Date().toISOString(),
      userId: taskData.userId,
      data: {
        taskId: taskData.taskId,
        taskType: taskData.taskType,
        userId: taskData.userId,
        completedAt: taskData.completedAt
      }
    };

    // Store event in database
    await this.supabaseClient
      .from('user_events')
      .insert({
        user_id: taskData.userId,
        event_type: event.type,
        event_data: taskData
      });

    // Emit to event processor
    globalEventProcessor.queueEvent(event);
  }
}

/**
 * Business Logic Event Handlers
 */
export class BusinessLogicHandlers {
  constructor(private supabaseClient: any) {}

  /**
   * Handle user created events
   */
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    console.log('Processing user created event:', event.data);

    // Setup notification preferences
    await this.supabaseClient
      .from('notification_preferences')
      .insert({
        user_id: event.data.userId,
        email_notifications: true,
        push_notifications: true,
        reminder_notifications: true,
        marketing_notifications: false
      });

    // Send welcome email (async, don't wait)
    this.sendWelcomeEmail(event.data).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    // Initialize user analytics
    await this.supabaseClient
      .from('user_analytics')
      .insert({
        user_id: event.data.userId,
        signup_date: new Date().toISOString(),
        subscription_tier: event.data.subscriptionTier
      });

    console.log('User created event processed successfully');
  }

  /**
   * Handle course deleted events
   */
  async handleCourseDeleted(event: CourseDeletedEvent): Promise<void> {
    console.log('Processing course deleted event:', event.data);

    // Log the deletion for analytics
    await this.supabaseClient
      .from('deletion_analytics')
      .insert({
        user_id: event.data.userId,
        item_type: 'course',
        item_id: event.data.courseId,
        cascade_count: event.data.cascadeCount,
        deleted_at: new Date().toISOString()
      });

    // Send notification to user (if enabled)
    await this.sendDeletionNotification(event.data);

    console.log('Course deleted event processed successfully');
  }

  /**
   * Handle task completed events
   */
  async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    console.log('Processing task completed event:', event.data);

    // Update user streaks
    await this.updateUserStreak(event.data.userId);

    // Update analytics
    await this.supabaseClient
      .from('task_completion_analytics')
      .insert({
        user_id: event.data.userId,
        task_id: event.data.taskId,
        task_type: event.data.taskType,
        completed_at: event.data.completedAt
      });

    // Check for achievement unlocks
    await this.checkAchievements(event.data.userId);

    console.log('Task completed event processed successfully');
  }

  /**
   * Send welcome email (placeholder)
   */
  private async sendWelcomeEmail(userData: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    // This would integrate with your email service
    console.log('Sending welcome email to:', userData.email);
  }

  /**
   * Send deletion notification (placeholder)
   */
  private async sendDeletionNotification(data: {
    userId: string;
    courseName: string;
    cascadeCount: number;
  }): Promise<void> {
    // This would integrate with your notification service
    console.log('Sending deletion notification for course:', data.courseName);
  }

  /**
   * Update user streak
   */
  private async updateUserStreak(userId: string): Promise<void> {
    // Implementation for updating user streaks
    console.log('Updating streak for user:', userId);
  }

  /**
   * Check for achievement unlocks
   */
  private async checkAchievements(userId: string): Promise<void> {
    // Implementation for checking achievements
    console.log('Checking achievements for user:', userId);
  }
}

/**
 * Global Event Processor Instance
 */
export const globalEventProcessor = new CentralEventProcessor();

/**
 * Initialize Event-Driven Architecture
 */
export function initializeEventDrivenArchitecture(supabaseClient: any): void {
  const businessHandlers = new BusinessLogicHandlers(supabaseClient);

  // Register event handlers
  globalEventProcessor.registerHandler({
    eventType: 'user_created',
    handler: businessHandlers.handleUserCreated.bind(businessHandlers),
    priority: 1,
    retryCount: 3,
    timeout: 30000
  });

  globalEventProcessor.registerHandler({
    eventType: 'course_deleted',
    handler: businessHandlers.handleCourseDeleted.bind(businessHandlers),
    priority: 2,
    retryCount: 2,
    timeout: 15000
  });

  globalEventProcessor.registerHandler({
    eventType: 'task_completed',
    handler: businessHandlers.handleTaskCompleted.bind(businessHandlers),
    priority: 3,
    retryCount: 1,
    timeout: 10000
  });

  console.log('Event-driven architecture initialized');
}

/**
 * Event-Driven Architecture Utilities
 */
export const EventUtils = {
  /**
   * Create a standardized event
   */
  createEvent<T extends AppEvent>(
    type: T['type'],
    data: T['data'],
    userId?: string,
    metadata?: Record<string, any>
  ): T {
    return {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      userId,
      data,
      metadata
    } as T;
  },

  /**
   * Validate event structure
   */
  validateEvent(event: any): event is AppEvent {
    return (
      event &&
      typeof event.id === 'string' &&
      typeof event.type === 'string' &&
      typeof event.timestamp === 'string' &&
      typeof event.data === 'object'
    );
  },

  /**
   * Get event statistics
   */
  async getEventStatistics(supabaseClient: any): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEvents: any[];
  }> {
    const { data: events } = await supabaseClient
      .from('user_events')
      .select('event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const totalEvents = events?.length || 0;
    const eventsByType = events?.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalEvents,
      eventsByType,
      recentEvents: events?.slice(0, 10) || []
    };
  }
};
