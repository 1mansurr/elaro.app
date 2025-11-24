import { useState, useCallback } from 'react';
import {
  AdvancedTemplateService,
  AdvancedTaskTemplate,
  TemplateCategory,
  TemplateShare,
  TemplateRating,
  TemplateUsage,
  CreateTemplateRequest,
  CreateTaskFromTemplateRequest,
  ShareTemplateRequest,
  RateTemplateRequest,
  TemplateSearchFilters,
  PublicTemplateQueryOptions,
  PublicTemplatesPage,
} from '../services/AdvancedTemplateService';

export interface UseAdvancedTemplatesReturn {
  createTemplate: (
    userId: string,
    request: CreateTemplateRequest,
  ) => Promise<AdvancedTaskTemplate | null>;
  getUserTemplates: (userId: string) => Promise<AdvancedTaskTemplate[]>;
  getPublicTemplates: (
    options?: PublicTemplateQueryOptions,
  ) => Promise<PublicTemplatesPage>;
  getSharedTemplates: (userId: string) => Promise<AdvancedTaskTemplate[]>;
  getTemplateCategories: () => Promise<TemplateCategory[]>;
  createTaskFromTemplate: (
    userId: string,
    request: CreateTaskFromTemplateRequest,
  ) => Promise<string | null>;
  createTemplateFromTask: (
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session',
    templateName: string,
    description?: string,
    category?: string,
    tags?: string[],
    isPublic?: boolean,
  ) => Promise<string | null>;
  shareTemplate: (
    userId: string,
    request: ShareTemplateRequest,
  ) => Promise<TemplateShare[]>;
  rateTemplate: (
    userId: string,
    request: RateTemplateRequest,
  ) => Promise<TemplateRating | null>;
  getTemplateRatings: (templateId: string) => Promise<TemplateRating[]>;
  getTemplateUsage: (templateId: string) => Promise<TemplateUsage[]>;
  updateTemplate: (
    templateId: string,
    updates: Partial<CreateTemplateRequest>,
  ) => Promise<AdvancedTaskTemplate | null>;
  deleteTemplate: (templateId: string) => Promise<void>;
  getTemplateStats: (templateId: string) => Promise<{
    usageCount: number;
    averageRating: number;
    totalRatings: number;
    recentUsage: number;
  } | null>;
  loading: boolean;
  error: string | null;
}

export const useAdvancedTemplates = (): UseAdvancedTemplatesReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advancedTemplateService = AdvancedTemplateService.getInstance();

  const createTemplate = useCallback(
    async (
      userId: string,
      request: CreateTemplateRequest,
    ): Promise<AdvancedTaskTemplate | null> => {
      try {
        setLoading(true);
        setError(null);

        return await advancedTemplateService.createTemplate(userId, request);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create template';
        setError(errorMessage);
        console.error('❌ Error creating template:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const getUserTemplates = useCallback(
    async (userId: string): Promise<AdvancedTaskTemplate[]> => {
      try {
        setError(null);
        return await advancedTemplateService.getUserTemplates(userId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get user templates';
        setError(errorMessage);
        console.error('❌ Error getting user templates:', err);
        return [];
      }
    },
    [advancedTemplateService],
  );

  const getPublicTemplates = useCallback(
    async (
      options?: PublicTemplateQueryOptions,
    ): Promise<PublicTemplatesPage> => {
      try {
        setError(null);
        return await advancedTemplateService.getPublicTemplates(options);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get public templates';
        setError(errorMessage);
        console.error('❌ Error getting public templates:', err);
        return { templates: [], nextOffset: undefined, hasMore: false };
      }
    },
    [advancedTemplateService],
  );

  const getSharedTemplates = useCallback(
    async (userId: string): Promise<AdvancedTaskTemplate[]> => {
      try {
        setError(null);
        return await advancedTemplateService.getSharedTemplates(userId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get shared templates';
        setError(errorMessage);
        console.error('❌ Error getting shared templates:', err);
        return [];
      }
    },
    [advancedTemplateService],
  );

  const getTemplateCategories = useCallback(async (): Promise<
    TemplateCategory[]
  > => {
    try {
      setError(null);
      return await advancedTemplateService.getTemplateCategories();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to get template categories';
      setError(errorMessage);
      console.error('❌ Error getting template categories:', err);
      return [];
    }
  }, [advancedTemplateService]);

  const createTaskFromTemplate = useCallback(
    async (
      userId: string,
      request: CreateTaskFromTemplateRequest,
    ): Promise<string | null> => {
      try {
        setLoading(true);
        setError(null);

        return await advancedTemplateService.createTaskFromTemplate(
          userId,
          request,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create task from template';
        setError(errorMessage);
        console.error('❌ Error creating task from template:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const createTemplateFromTask = useCallback(
    async (
      taskId: string,
      taskType: 'assignment' | 'lecture' | 'study_session',
      templateName: string,
      description: string = '',
      category: string = 'personal',
      tags: string[] = [],
      isPublic: boolean = false,
    ): Promise<string | null> => {
      try {
        setLoading(true);
        setError(null);

        return await advancedTemplateService.createTemplateFromTask(
          taskId,
          taskType,
          templateName,
          description,
          category,
          tags,
          isPublic,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create template from task';
        setError(errorMessage);
        console.error('❌ Error creating template from task:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const shareTemplate = useCallback(
    async (
      userId: string,
      request: ShareTemplateRequest,
    ): Promise<TemplateShare[]> => {
      try {
        setLoading(true);
        setError(null);

        return await advancedTemplateService.shareTemplate(userId, request);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to share template';
        setError(errorMessage);
        console.error('❌ Error sharing template:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const rateTemplate = useCallback(
    async (
      userId: string,
      request: RateTemplateRequest,
    ): Promise<TemplateRating | null> => {
      try {
        setLoading(true);
        setError(null);

        return await advancedTemplateService.rateTemplate(userId, request);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to rate template';
        setError(errorMessage);
        console.error('❌ Error rating template:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const getTemplateRatings = useCallback(
    async (templateId: string): Promise<TemplateRating[]> => {
      try {
        setError(null);
        return await advancedTemplateService.getTemplateRatings(templateId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get template ratings';
        setError(errorMessage);
        console.error('❌ Error getting template ratings:', err);
        return [];
      }
    },
    [advancedTemplateService],
  );

  const getTemplateUsage = useCallback(
    async (templateId: string): Promise<TemplateUsage[]> => {
      try {
        setError(null);
        return await advancedTemplateService.getTemplateUsage(templateId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get template usage';
        setError(errorMessage);
        console.error('❌ Error getting template usage:', err);
        return [];
      }
    },
    [advancedTemplateService],
  );

  const updateTemplate = useCallback(
    async (
      templateId: string,
      updates: Partial<CreateTemplateRequest>,
    ): Promise<AdvancedTaskTemplate | null> => {
      try {
        setLoading(true);
        setError(null);

        return await advancedTemplateService.updateTemplate(
          templateId,
          updates,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update template';
        setError(errorMessage);
        console.error('❌ Error updating template:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const deleteTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        await advancedTemplateService.deleteTemplate(templateId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete template';
        setError(errorMessage);
        console.error('❌ Error deleting template:', err);
      } finally {
        setLoading(false);
      }
    },
    [advancedTemplateService],
  );

  const getTemplateStats = useCallback(
    async (
      templateId: string,
    ): Promise<{
      usageCount: number;
      averageRating: number;
      totalRatings: number;
      recentUsage: number;
    } | null> => {
      try {
        setError(null);
        return await advancedTemplateService.getTemplateStats(templateId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get template stats';
        setError(errorMessage);
        console.error('❌ Error getting template stats:', err);
        return null;
      }
    },
    [advancedTemplateService],
  );

  return {
    createTemplate,
    getUserTemplates,
    getPublicTemplates,
    getSharedTemplates,
    getTemplateCategories,
    createTaskFromTemplate,
    createTemplateFromTask,
    shareTemplate,
    rateTemplate,
    getTemplateRatings,
    getTemplateUsage,
    updateTemplate,
    deleteTemplate,
    getTemplateStats,
    loading,
    error,
  };
};
