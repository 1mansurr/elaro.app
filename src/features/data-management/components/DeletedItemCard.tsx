import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Course, Assignment, Lecture, StudySession } from '@/types';
import { formatDate } from '@/i18n';

type Item = (Course | Assignment | Lecture | StudySession) & {
  type: string;
  deleted_at: string;
};

interface DeletedItemCardProps {
  item: Item;
  onRestore: (id: string, type: string) => void;
  onDeletePermanently: (id: string, type: string) => void;
  isActionLoading: boolean;
  // New props for selection mode
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const getItemName = (item: Item) => {
  if ('courseName' in item) return item.courseName;
  if ('title' in item) return item.title;
  return 'Unnamed Item';
};

export const DeletedItemCard = memo<DeletedItemCardProps>(
  ({
    item,
    onRestore,
    onDeletePermanently,
    isActionLoading,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
  }) => {
    const handlePress = () => {
      if (isSelectionMode && onToggleSelect) {
        onToggleSelect(item.id);
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          isSelectionMode && styles.selectableContainer,
          isSelected && styles.selectedContainer,
        ]}
        onPress={handlePress}
        activeOpacity={isSelectionMode ? 0.7 : 1}
        disabled={!isSelectionMode}
        accessibilityLabel={
          isSelectionMode
            ? `${getItemName(item)} - ${isSelected ? 'Selected' : 'Not selected'}`
            : getItemName(item)
        }
        accessibilityHint={
          isSelectionMode ? 'Double tap to toggle selection' : undefined
        }
        accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
        accessibilityState={{
          disabled: !isSelectionMode,
          checked: isSelected,
        }}>
        {/* Selection checkbox */}
        {isSelectionMode && (
          <View style={styles.checkboxContainer}>
            <View
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          </View>
        )}

        {/* Item info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemType}>
            {item.type.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.itemName}>{getItemName(item)}</Text>
          <Text style={styles.itemDate}>
            Deleted on: {formatDate(new Date(item.deleted_at))}
          </Text>
        </View>

        {/* Action buttons (only show when not in selection mode) */}
        {!isSelectionMode && (
          <View style={styles.actionsContainer}>
            {isActionLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={() => onRestore(item.id, item.type)}
                  accessibilityLabel="Restore item"
                  accessibilityHint={`Restores ${getItemName(item)} to your active items`}
                  accessibilityRole="button">
                  <Text style={styles.buttonText}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDeletePermanently(item.id, item.type)}
                  accessibilityLabel="Delete permanently"
                  accessibilityHint={`Permanently deletes ${getItemName(item)}. This action cannot be undone.`}
                  accessibilityRole="button">
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  },
);
DeletedItemCard.displayName = 'DeletedItemCard';

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  selectableContainer: {
    backgroundColor: '#F9FAFB',
  },
  selectedContainer: {
    backgroundColor: '#E8F4FD',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
