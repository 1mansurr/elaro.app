// Offline MVP stub — all Supabase calls removed

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

  async createTemplate(
    _userId: string,
    _request: CreateTemplateRequest,
  ): Promise<AdvancedTaskTemplate> {
    throw new Error('AdvancedTemplateService not available in offline mode');
  }

  async getUserTemplates(_userId: string): Promise<AdvancedTaskTemplate[]> {
    return [];
  }

  async getPublicTemplates(
    _options?: PublicTemplateQueryOptions,
  ): Promise<PublicTemplatesPage> {
    return { templates: [], nextOffset: undefined, hasMore: false };
  }

  async getPublicTemplatesLegacy(
    _filters?: TemplateSearchFilters,
  ): Promise<AdvancedTaskTemplate[]> {
    return [];
  }

  async getSharedTemplates(_userId: string): Promise<AdvancedTaskTemplate[]> {
    return [];
  }

  async getTemplateCategories(): Promise<TemplateCategory[]> {
    return [];
  }

  async createTaskFromTemplate(
    _userId: string,
    _request: CreateTaskFromTemplateRequest,
  ): Promise<string> {
    throw new Error('AdvancedTemplateService not available in offline mode');
  }

  async createTemplateFromTask(
    _taskId: string,
    _taskType: 'assignment' | 'lecture' | 'study_session',
    _templateName: string,
    _description?: string,
    _category?: string,
    _tags?: string[],
    _isPublic?: boolean,
  ): Promise<string> {
    throw new Error('AdvancedTemplateService not available in offline mode');
  }

  async shareTemplate(
    _userId: string,
    _request: ShareTemplateRequest,
  ): Promise<TemplateShare[]> {
    return [];
  }

  async rateTemplate(
    _userId: string,
    _request: RateTemplateRequest,
  ): Promise<TemplateRating> {
    throw new Error('AdvancedTemplateService not available in offline mode');
  }

  async getTemplateRatings(_templateId: string): Promise<TemplateRating[]> {
    return [];
  }

  async getTemplateUsage(_templateId: string): Promise<TemplateUsage[]> {
    return [];
  }

  async updateTemplate(
    _templateId: string,
    _updates: Partial<CreateTemplateRequest>,
  ): Promise<AdvancedTaskTemplate> {
    throw new Error('AdvancedTemplateService not available in offline mode');
  }

  async deleteTemplate(_templateId: string): Promise<void> {
    throw new Error('AdvancedTemplateService not available in offline mode');
  }

  async getTemplateStats(_templateId: string): Promise<{
    usageCount: number;
    averageRating: number;
    totalRatings: number;
    recentUsage: number;
  }> {
    return { usageCount: 0, averageRating: 0, totalRatings: 0, recentUsage: 0 };
  }
}
