import { supabase } from '@/services/supabase';

// NOTE: This service uses direct Supabase queries and needs API endpoints created.
// TODO: Create API endpoints in api-v2 for advanced template operations:
//   - POST /api-v2/templates (create template)
//   - GET /api-v2/templates (list templates)
//   - PUT /api-v2/templates/:id (update template)
//   - DELETE /api-v2/templates/:id (delete template)
//   - POST /api-v2/templates/:id/use (create task from template)

export interface TemplateField {
  name: string;
  type: 'text' | 'date' | 'time' | 'select' | 'number' | 'textarea' | 'boolean';
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean | Date;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  placeholder?: string;
  helpText?: string;
}

export interface AdvancedTaskTemplate {
  id: string;
  userId: string;
  templateName: string;
  description: string;
  taskType: 'assignment' | 'lecture' | 'study_session';
  category:
    | 'academic'
    | 'work'
    | 'personal'
    | 'study'
    | 'project'
    | 'maintenance';
  fields: TemplateField[];
  defaultValues: Record<string, any>;
  validationRules: Record<string, any>;
  isPublic: boolean;
  tags: string[];
  version: number;
  parentTemplateId?: string;
  usageCount: number;
  rating?: number;
  createdBy?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isSystem: boolean;
  createdAt: string;
}

export interface TemplateShare {
  id: string;
  templateId: string;
  sharedWithUserId: string;
  sharedByUserId: string;
  permission: 'view' | 'use' | 'edit';
  createdAt: string;
}

export interface TemplateRating {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  reviewText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateUsage {
  id: string;
  templateId: string;
  userId: string;
  taskId: string;
  taskType: 'assignment' | 'lecture' | 'study_session';
  usedAt: string;
}

export interface CreateTemplateRequest {
  templateName: string;
  description: string;
  taskType: 'assignment' | 'lecture' | 'study_session';
  category: string;
  fields: TemplateField[];
  defaultValues: Record<string, any>;
  validationRules: Record<string, any>;
  tags: string[];
  isPublic: boolean;
  parentTemplateId?: string;
}

export interface CreateTaskFromTemplateRequest {
  templateId: string;
  customizations: Record<string, any>;
}

export interface ShareTemplateRequest {
  templateId: string;
  sharedWithUserIds: string[];
  permission: 'view' | 'use' | 'edit';
}

export interface RateTemplateRequest {
  templateId: string;
  rating: number;
  reviewText?: string;
}

export interface TemplateSearchFilters {
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  minRating?: number;
  taskType?: 'assignment' | 'lecture' | 'study_session';
  searchQuery?: string;
}

export interface PublicTemplateQueryOptions extends TemplateSearchFilters {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'usage_count' | 'rating' | 'created_at';
  sortAscending?: boolean;
}

export interface PublicTemplatesPage {
  templates: AdvancedTaskTemplate[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export class AdvancedTemplateService {
  private static instance: AdvancedTemplateService;

  public static getInstance(): AdvancedTemplateService {
    if (!AdvancedTemplateService.instance) {
      AdvancedTemplateService.instance = new AdvancedTemplateService();
    }
    return AdvancedTemplateService.instance;
  }

  /**
   * Create a new advanced template
   */
  async createTemplate(
    userId: string,
    request: CreateTemplateRequest,
  ): Promise<AdvancedTaskTemplate> {
    try {
      const { data: template, error } = await supabase
        .from('task_templates')
        .insert({
          user_id: userId,
          template_name: request.templateName,
          task_type: request.taskType,
          template_data: {
            fields: request.fields,
            defaultValues: request.defaultValues,
            validationRules: request.validationRules,
          },
          description: request.description,
          category: request.category,
          tags: request.tags,
          is_public: request.isPublic,
          parent_template_id: request.parentTemplateId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`);
      }

      return this.mapTemplateFromDB(template);
    } catch (error) {
      console.error('❌ Error creating advanced template:', error);
      throw error;
    }
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId: string): Promise<AdvancedTaskTemplate[]> {
    try {
      const { data: templates, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get user templates: ${error.message}`);
      }

      return (templates || []).map(template =>
        this.mapTemplateFromDB(template),
      );
    } catch (error) {
      console.error('❌ Error getting user templates:', error);
      throw error;
    }
  }

  /**
   * Get public templates with pagination
   * @param options - Query options including pagination, sorting, and filters
   * @returns Paginated templates with metadata
   */
  async getPublicTemplates(
    options?: PublicTemplateQueryOptions,
  ): Promise<PublicTemplatesPage> {
    try {
      const {
        pageParam = 0,
        pageSize = 50,
        sortBy = 'usage_count',
        sortAscending = false,
        category,
        tags,
        taskType,
        minRating,
        searchQuery,
      } = options || {};

      let query = supabase
        .from('task_templates')
        .select('*', { count: 'exact' })
        .eq('is_public', true);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      if (taskType) {
        query = query.eq('task_type', taskType);
      }

      if (minRating) {
        query = query.gte('rating', minRating);
      }

      if (searchQuery) {
        query = query.or(
          `template_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`,
        );
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortAscending });

      // Apply pagination
      const from = pageParam;
      const to = pageParam + pageSize - 1;
      query = query.range(from, to);

      const { data: templates, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get public templates: ${error.message}`);
      }

      const mappedData = (templates || []).map(template =>
        this.mapTemplateFromDB(template),
      );
      const hasMore = count ? pageParam + pageSize < count : false;
      const nextOffset = hasMore ? pageParam + pageSize : undefined;

      return {
        templates: mappedData,
        nextOffset,
        hasMore,
      };
    } catch (error) {
      console.error('❌ Error getting public templates:', error);
      throw error;
    }
  }

  /**
   * Get public templates (backward compatibility - use getPublicTemplates with options for pagination)
   * @deprecated Consider using getPublicTemplates() with pagination options for better performance
   */
  async getPublicTemplatesLegacy(
    filters?: TemplateSearchFilters,
  ): Promise<AdvancedTaskTemplate[]> {
    const result = await this.getPublicTemplates({
      ...filters,
      pageParam: 0,
      pageSize: 1000, // Large page size for backward compatibility
    });
    return result.templates;
  }

  /**
   * Get shared templates
   */
  async getSharedTemplates(userId: string): Promise<AdvancedTaskTemplate[]> {
    try {
      const { data: templates, error } = await supabase
        .from('task_templates')
        .select(
          `
          *,
          template_shares!inner(permission)
        `,
        )
        .eq('template_shares.shared_with_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get shared templates: ${error.message}`);
      }

      return (templates || []).map(template =>
        this.mapTemplateFromDB(template),
      );
    } catch (error) {
      console.error('❌ Error getting shared templates:', error);
      throw error;
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(): Promise<TemplateCategory[]> {
    try {
      const { data: categories, error } = await supabase
        .from('template_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to get template categories: ${error.message}`);
      }

      return (categories || []).map(category =>
        this.mapCategoryFromDB(category),
      );
    } catch (error) {
      console.error('❌ Error getting template categories:', error);
      throw error;
    }
  }

  /**
   * Create task from template
   */
  async createTaskFromTemplate(
    userId: string,
    request: CreateTaskFromTemplateRequest,
  ): Promise<string> {
    try {
      const { data: taskId, error } = await supabase.rpc(
        'create_task_from_template',
        {
          p_template_id: request.templateId,
          p_customizations: request.customizations,
        },
      );

      if (error) {
        throw new Error(
          `Failed to create task from template: ${error.message}`,
        );
      }

      return taskId;
    } catch (error) {
      console.error('❌ Error creating task from template:', error);
      throw error;
    }
  }

  /**
   * Create template from existing task
   */
  async createTemplateFromTask(
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
    templateName: string,
    description: string = '',
    category: string = 'personal',
    tags: string[] = [],
    isPublic: boolean = false,
  ): Promise<string> {
    try {
      const { data: templateId, error } = await supabase.rpc(
        'create_template_from_task',
        {
          p_task_id: taskId,
          p_task_type: taskType,
          p_template_name: templateName,
          p_description: description,
          p_category: category,
          p_tags: tags,
          p_is_public: isPublic,
        },
      );

      if (error) {
        throw new Error(
          `Failed to create template from task: ${error.message}`,
        );
      }

      return templateId;
    } catch (error) {
      console.error('❌ Error creating template from task:', error);
      throw error;
    }
  }

  /**
   * Share template with other users
   */
  async shareTemplate(
    userId: string,
    request: ShareTemplateRequest,
  ): Promise<TemplateShare[]> {
    try {
      const shares = request.sharedWithUserIds.map(sharedWithUserId => ({
        template_id: request.templateId,
        shared_with_user_id: sharedWithUserId,
        shared_by_user_id: userId,
        permission: request.permission,
      }));

      const { data: createdShares, error } = await supabase
        .from('template_shares')
        .insert(shares)
        .select();

      if (error) {
        throw new Error(`Failed to share template: ${error.message}`);
      }

      return (createdShares || []).map(share => this.mapShareFromDB(share));
    } catch (error) {
      console.error('❌ Error sharing template:', error);
      throw error;
    }
  }

  /**
   * Rate a template
   */
  async rateTemplate(
    userId: string,
    request: RateTemplateRequest,
  ): Promise<TemplateRating> {
    try {
      const { data: rating, error } = await supabase
        .from('template_ratings')
        .upsert({
          template_id: request.templateId,
          user_id: userId,
          rating: request.rating,
          review_text: request.reviewText,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to rate template: ${error.message}`);
      }

      return this.mapRatingFromDB(rating);
    } catch (error) {
      console.error('❌ Error rating template:', error);
      throw error;
    }
  }

  /**
   * Get template ratings
   */
  async getTemplateRatings(templateId: string): Promise<TemplateRating[]> {
    try {
      const { data: ratings, error } = await supabase
        .from('template_ratings')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get template ratings: ${error.message}`);
      }

      return (ratings || []).map(rating => this.mapRatingFromDB(rating));
    } catch (error) {
      console.error('❌ Error getting template ratings:', error);
      throw error;
    }
  }

  /**
   * Get template usage history
   */
  async getTemplateUsage(templateId: string): Promise<TemplateUsage[]> {
    try {
      const { data: usage, error } = await supabase
        .from('template_usage')
        .select('*')
        .eq('template_id', templateId)
        .order('used_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get template usage: ${error.message}`);
      }

      return (usage || []).map(usage => this.mapUsageFromDB(usage));
    } catch (error) {
      console.error('❌ Error getting template usage:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<CreateTemplateRequest>,
  ): Promise<AdvancedTaskTemplate> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.templateName) updateData.template_name = updates.templateName;
      if (updates.description) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.isPublic !== undefined)
        updateData.is_public = updates.isPublic;

      if (updates.fields || updates.defaultValues || updates.validationRules) {
        const { data: currentTemplate } = await supabase
          .from('task_templates')
          .select('template_data')
          .eq('id', templateId)
          .single();

        if (currentTemplate) {
          const templateData = currentTemplate.template_data;
          if (updates.fields) templateData.fields = updates.fields;
          if (updates.defaultValues)
            templateData.defaultValues = updates.defaultValues;
          if (updates.validationRules)
            templateData.validationRules = updates.validationRules;
          updateData.template_data = templateData;
        }
      }

      const { data: updatedTemplate, error } = await supabase
        .from('task_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update template: ${error.message}`);
      }

      return this.mapTemplateFromDB(updatedTemplate);
    } catch (error) {
      console.error('❌ Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    usageCount: number;
    averageRating: number;
    totalRatings: number;
    recentUsage: number; // Usage in last 30 days
  }> {
    try {
      const [template, ratings, recentUsage] = await Promise.all([
        supabase
          .from('task_templates')
          .select('usage_count, rating')
          .eq('id', templateId)
          .single(),
        supabase
          .from('template_ratings')
          .select('rating')
          .eq('template_id', templateId),
        supabase
          .from('template_usage')
          .select('id')
          .eq('template_id', templateId)
          .gte(
            'used_at',
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          ),
      ]);

      const templateData = template.data;
      const ratingsData = ratings.data || [];
      const recentUsageData = recentUsage.data || [];

      const averageRating =
        ratingsData.length > 0
          ? ratingsData.reduce((sum, r) => sum + r.rating, 0) /
            ratingsData.length
          : 0;

      return {
        usageCount: templateData?.usage_count || 0,
        averageRating,
        totalRatings: ratingsData.length,
        recentUsage: recentUsageData.length,
      };
    } catch (error) {
      console.error('❌ Error getting template stats:', error);
      throw error;
    }
  }

  /**
   * Map database template to AdvancedTaskTemplate interface
   */
  private mapTemplateFromDB(
    dbTemplate: Record<string, unknown>,
  ): AdvancedTaskTemplate {
    const templateData = (dbTemplate.template_data as Record<string, unknown>) || {};

    return {
      id: dbTemplate.id as string,
      userId: dbTemplate.user_id as string,
      templateName: dbTemplate.template_name as string,
      description: (dbTemplate.description as string) || '',
      taskType: dbTemplate.task_type as 'assignment' | 'lecture' | 'study_session',
      category: dbTemplate.category as 'academic' | 'work' | 'personal' | 'study' | 'project' | 'maintenance',
      fields: (templateData.fields as TemplateField[]) || [],
      defaultValues: (templateData.defaultValues as Record<string, any>) || {},
      validationRules: (templateData.validationRules as Record<string, any>) || {},
      isPublic: (dbTemplate.is_public ?? false) as boolean,
      tags: (dbTemplate.tags as string[]) || [],
      version: dbTemplate.version as number,
      parentTemplateId: dbTemplate.parent_template_id as string | undefined,
      usageCount: dbTemplate.usage_count as number,
      rating: dbTemplate.rating as number | undefined,
      createdBy: dbTemplate.created_by as string | undefined,
      lastUsedAt: dbTemplate.last_used_at as string | undefined,
      createdAt: dbTemplate.created_at as string,
      updatedAt: dbTemplate.updated_at as string,
    };
  }

  /**
   * Map database category to TemplateCategory interface
   */
  private mapCategoryFromDB(
    dbCategory: Record<string, unknown>,
  ): TemplateCategory {
    return {
      id: dbCategory.id as string,
      name: dbCategory.name as string,
      description: dbCategory.description as string,
      icon: dbCategory.icon as string,
      color: dbCategory.color as string,
      isSystem: (dbCategory.is_system ?? false) as boolean,
      createdAt: dbCategory.created_at as string,
    };
  }

  /**
   * Map database share to TemplateShare interface
   */
  private mapShareFromDB(dbShare: Record<string, unknown>): TemplateShare {
    return {
      id: dbShare.id as string,
      templateId: dbShare.template_id as string,
      sharedWithUserId: dbShare.shared_with_user_id as string,
      sharedByUserId: dbShare.shared_by_user_id as string,
      permission: dbShare.permission as 'view' | 'use' | 'edit',
      createdAt: dbShare.created_at as string,
    };
  }

  /**
   * Map database rating to TemplateRating interface
   */
  private mapRatingFromDB(dbRating: Record<string, unknown>): TemplateRating {
    return {
      id: dbRating.id as string,
      templateId: dbRating.template_id as string,
      userId: dbRating.user_id as string,
      rating: dbRating.rating as number,
      reviewText: dbRating.review_text as string | undefined,
      createdAt: dbRating.created_at as string,
      updatedAt: dbRating.updated_at as string,
    };
  }

  /**
   * Map database usage to TemplateUsage interface
   */
  private mapUsageFromDB(dbUsage: Record<string, unknown>): TemplateUsage {
    return {
      id: dbUsage.id as string,
      templateId: dbUsage.template_id as string,
      userId: dbUsage.user_id as string,
      taskId: dbUsage.task_id as string,
      taskType: dbUsage.task_type as 'assignment' | 'lecture' | 'study_session',
      usedAt: dbUsage.used_at as string,
    };
  }
}
