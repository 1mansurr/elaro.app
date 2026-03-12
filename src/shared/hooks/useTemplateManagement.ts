import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────

export interface TaskTemplate {
  id: string;
  user_id: string;
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// SQLite row type
// ─────────────────────────────────────────────────────────────

interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: string; // JSON string
  is_built_in: number;
  created_at: string;
  updated_at: string;
}

function rowToTemplate(row: TemplateRow): TaskTemplate {
  return {
    id: row.id,
    user_id: row.user_id,
    template_name: row.name,
    task_type: row.task_type,
    template_data: JSON.parse(row.template_data) as Record<string, unknown>,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────
// Built-in template seeding
// ─────────────────────────────────────────────────────────────

const SEEDED_KEY = 'templates_built_in_seeded';

const BUILT_IN_TEMPLATES: Array<{
  name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: string;
}> = [
  {
    name: 'Weekly Assignment',
    task_type: 'assignment',
    template_data: JSON.stringify({
      description: 'Standard weekly assignment',
      priority: 'medium',
    }),
  },
  {
    name: 'Lecture Notes',
    task_type: 'lecture',
    template_data: JSON.stringify({
      description: 'Lecture notes template',
      duration_minutes: 60,
    }),
  },
  {
    name: 'Study Session',
    task_type: 'study_session',
    template_data: JSON.stringify({
      description: 'Focused study session',
      duration_minutes: 90,
    }),
  },
];

async function seedBuiltInTemplates(): Promise<void> {
  const alreadySeeded = await AsyncStorage.getItem(SEEDED_KEY);
  if (alreadySeeded) return;

  const db = await getDatabase();
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM templates WHERE is_built_in = 1',
  );
  if ((count?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    for (const t of BUILT_IN_TEMPLATES) {
      await db.runAsync(
        `INSERT INTO templates (id, user_id, name, task_type, template_data, is_built_in, created_at, updated_at)
         VALUES (?, 'built_in', ?, ?, ?, 1, ?, ?)`,
        [generateUUID(), t.name, t.task_type, t.template_data, now, now],
      );
    }
  }
  await AsyncStorage.setItem(SEEDED_KEY, '1');
}

// ─────────────────────────────────────────────────────────────
// Fetch helper
// ─────────────────────────────────────────────────────────────

async function fetchTemplates(): Promise<TaskTemplate[]> {
  await seedBuiltInTemplates();
  const db = await getDatabase();
  const deviceId = await getOrCreateDeviceId();
  const rows = await db.getAllAsync<TemplateRow>(
    'SELECT * FROM templates WHERE user_id = ? OR is_built_in = 1 ORDER BY created_at DESC',
    [deviceId],
  );
  return rows.map(rowToTemplate);
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useTemplateManagement = () => {
  const queryClient = useQueryClient();

  const { data: templates, isLoading: loading } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000,
  });

  const createTemplate = useMutation({
    mutationFn: async (data: CreateTemplateData): Promise<TaskTemplate> => {
      const db = await getDatabase();
      const deviceId = await getOrCreateDeviceId();
      const now = new Date().toISOString();
      const id = generateUUID();

      await db.runAsync(
        `INSERT INTO templates (id, user_id, name, task_type, template_data, is_built_in, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          id,
          deviceId,
          data.template_name,
          data.task_type,
          JSON.stringify(data.template_data),
          now,
          now,
        ],
      );

      const row = await db.getFirstAsync<TemplateRow>(
        'SELECT * FROM templates WHERE id = ?',
        [id],
      );
      if (!row) throw new Error('Failed to create template');
      return rowToTemplate(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const db = await getDatabase();
      await db.runAsync(
        'DELETE FROM templates WHERE id = ? AND is_built_in = 0',
        [templateId],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const getTemplatesByType = (
    taskType: 'assignment' | 'lecture' | 'study_session',
  ) => {
    return templates?.filter(t => t.task_type === taskType) || [];
  };

  const getAllTemplates = () => {
    return [...(templates || [])].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  };

  const hasTemplates = () => (templates?.length || 0) > 0;

  const hasTemplatesForType = (
    taskType: 'assignment' | 'lecture' | 'study_session',
  ) => templates?.some(t => t.task_type === taskType) || false;

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    getTemplatesByType,
    getAllTemplates,
    hasTemplates,
    hasTemplatesForType,
  };
};
