import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '@/types';

export type DraftType = 'assignment' | 'lecture' | 'study_session';

export interface DraftData {
  taskType: DraftType;
  title: string;
  course: Course | null;
  dateTime: Date | string; // Will be serialized to string
  description?: string;
  // Assignment-specific
  submissionMethod?: 'Online' | 'In-person' | null;
  submissionLink?: string;
  // Lecture-specific
  endTime?: Date | string;
  recurrence?: 'none' | 'weekly' | 'bi-weekly';
  venue?: string;
  // Study Session-specific
  hasSpacedRepetition?: boolean;
  // Common
  reminders?: number[];
  savedAt: string; // Timestamp when draft was saved
}

const DRAFT_KEY_PREFIX = '@draft_';

/**
 * Save a draft for a specific task type
 */
export async function saveDraft(
  taskType: DraftType,
  data: Partial<DraftData>,
): Promise<void> {
  try {
    const draft: DraftData = {
      ...data,
      taskType,
      title: data.title || '',
      course: data.course || null,
      dateTime: data.dateTime || new Date().toISOString(),
      savedAt: new Date().toISOString(),
    };

    const key = `${DRAFT_KEY_PREFIX}${taskType}`;
    await AsyncStorage.setItem(key, JSON.stringify(draft));
    console.log(`💾 Draft saved for ${taskType}`);
  } catch (error) {
    console.error('Error saving draft:', error);
  }
}

/**
 * Get a draft for a specific task type
 */
export async function getDraft(taskType: DraftType): Promise<DraftData | null> {
  try {
    const key = `${DRAFT_KEY_PREFIX}${taskType}`;
    const draftJson = await AsyncStorage.getItem(key);

    if (
      !draftJson ||
      !draftJson.trim() ||
      draftJson === 'undefined' ||
      draftJson === 'null'
    ) {
      return null;
    }

    let draft: DraftData;
    try {
      draft = JSON.parse(draftJson) as DraftData;
    } catch {
      return null;
    }

    // Convert string dates back to Date objects
    if (draft.dateTime) {
      draft.dateTime = new Date(draft.dateTime);
    }
    if (draft.endTime) {
      draft.endTime = new Date(draft.endTime);
    }

    console.log(`📖 Draft loaded for ${taskType}`);
    return draft;
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
}

/**
 * Clear a draft for a specific task type
 */
export async function clearDraft(taskType: DraftType): Promise<void> {
  try {
    const key = `${DRAFT_KEY_PREFIX}${taskType}`;
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ Draft cleared for ${taskType}`);
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
}

/**
 * Get all saved drafts
 */
export async function getAllDrafts(): Promise<DraftData[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_KEY_PREFIX));

    if (draftKeys.length === 0) return [];

    const drafts = await AsyncStorage.multiGet(draftKeys);

    return drafts
      .map(([_, value]) => {
        if (!value) return null;
        try {
          // Guard: Only parse if value is valid
          if (
            !value ||
            !value.trim() ||
            value === 'undefined' ||
            value === 'null'
          ) {
            return null;
          }

          let draft: DraftData;
          try {
            draft = JSON.parse(value) as DraftData;
          } catch {
            return null;
          }
          // Convert string dates back to Date objects
          if (draft.dateTime) {
            draft.dateTime = new Date(draft.dateTime);
          }
          if (draft.endTime) {
            draft.endTime = new Date(draft.endTime);
          }
          return draft;
        } catch {
          return null;
        }
      })
      .filter((draft): draft is DraftData => draft !== null)
      .sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
  } catch (error) {
    console.error('Error getting all drafts:', error);
    return [];
  }
}

/**
 * Get count of all saved drafts
 */
export async function getDraftCount(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_KEY_PREFIX));
    return draftKeys.length;
  } catch (error) {
    console.error('Error getting draft count:', error);
    return 0;
  }
}

/**
 * Clear all drafts
 */
export async function clearAllDrafts(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_KEY_PREFIX));

    if (draftKeys.length > 0) {
      await AsyncStorage.multiRemove(draftKeys);
      console.log(`🗑️ Cleared ${draftKeys.length} drafts`);
    }
  } catch (error) {
    console.error('Error clearing all drafts:', error);
  }
}
