import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDeletedItemsQuery } from '@/hooks/useDeletedItemsQuery';
import { QueryStateWrapper } from '@/shared/components';
import { DeletedItemCard } from '../components/DeletedItemCard';
import { supabase } from '@/services/supabase';
import { useBatchAction, BatchItem } from '@/hooks/useBatchAction';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

const RecycleBinScreen = () => {
  const navigation = useNavigation();
  const { data: items, isLoading, isError, error, refetch, isRefetching } = useDeletedItemsQuery();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch action mutation
  const batchMutation = useBatchAction();

  // Configure header buttons
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (isSelectionMode) {
              // Exit selection mode
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            } else {
              // Enter selection mode
              setIsSelectionMode(true);
            }
          }}
          style={{ marginRight: 16 }}
        >
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>
            {isSelectionMode ? 'Cancel' : 'Select'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSelectionMode]);

  // Toggle item selection
  const handleToggleSelect = useCallback((itemId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Select all items
  const handleSelectAll = useCallback(() => {
    if (items) {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  }, [items]);

  // Deselect all items
  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Batch restore selected items
  const handleBatchRestore = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select items to restore.');
      return;
    }

    Alert.alert(
      'Restore Selected Items',
      `Are you sure you want to restore ${selectedIds.size} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            const batchItems: BatchItem[] = items!
              .filter(item => selectedIds.has(item.id))
              .map(item => ({
                id: item.id,
                type: (item as any).type,
              }));

            try {
              const result = await batchMutation.mutateAsync({
                action: 'RESTORE',
                items: batchItems,
              });

              // Show results
              if (result.results.failed === 0) {
                Alert.alert('Success', result.message);
              } else {
                Alert.alert(
                  'Partially Complete',
                  `${result.results.succeeded} items restored successfully.\n${result.results.failed} items failed.`
                );
              }

              // Exit selection mode and clear selection
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            } catch (error) {
              const errorTitle = getErrorTitle(error);
              const errorMessage = mapErrorCodeToMessage(error);
              Alert.alert(errorTitle, errorMessage);
            }
          },
        },
      ]
    );
  }, [selectedIds, items, batchMutation]);

  // Batch delete selected items permanently
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select items to delete.');
      return;
    }

    Alert.alert(
      'Delete Selected Items',
      `Are you sure you want to permanently delete ${selectedIds.size} item(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const batchItems: BatchItem[] = items!
              .filter(item => selectedIds.has(item.id))
              .map(item => ({
                id: item.id,
                type: (item as any).type,
              }));

            try {
              const result = await batchMutation.mutateAsync({
                action: 'DELETE_PERMANENTLY',
                items: batchItems,
              });

              // Show results
              if (result.results.failed === 0) {
                Alert.alert('Success', result.message);
              } else {
                Alert.alert(
                  'Partially Complete',
                  `${result.results.succeeded} items deleted successfully.\n${result.results.failed} items failed.`
                );
              }

              // Exit selection mode and clear selection
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            } catch (error) {
              const errorTitle = getErrorTitle(error);
              const errorMessage = mapErrorCodeToMessage(error);
              Alert.alert(errorTitle, errorMessage);
            }
          },
        },
      ]
    );
  }, [selectedIds, items, batchMutation]);

  const handleRestore = useCallback(async (itemId: string, itemType: string) => {
    setActionLoading(itemId);
    const functionName = `restore-${itemType.replace('_', '-')}`;
    
    // Map item type to the correct parameter name expected by backend
    const getParameterName = (type: string) => {
      switch (type) {
        case 'course': return 'courseId';
        case 'assignment': return 'assignmentId';
        case 'lecture': return 'lectureId';
        case 'study_session': return 'studySessionId';
        default: return 'id';
      }
    };
    
    const parameterName = getParameterName(itemType);
    const { error } = await supabase.functions.invoke(functionName, { 
      body: { [parameterName]: itemId } 
    });
    
    if (error) {
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } else {
      Alert.alert('Success', `${itemType.replace('_', ' ')} restored.`);
      await refetch(); // Refresh list
    }
    setActionLoading(null);
  }, [refetch]);

  const handleDeletePermanently = useCallback((itemId: string, itemType: string) => {
    Alert.alert(
      'Delete Permanently',
      'This action is irreversible. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(itemId);
            const functionName = `delete-${itemType.replace('_', '-')}-permanently`;
            
            // Map item type to the correct parameter name expected by backend
            const getParameterName = (type: string) => {
              switch (type) {
                case 'course': return 'courseId';
                case 'assignment': return 'assignmentId';
                case 'lecture': return 'lectureId';
                case 'study_session': return 'studySessionId';
                default: return 'id';
              }
            };
            
            const parameterName = getParameterName(itemType);
            const { error } = await supabase.functions.invoke(functionName, { 
              body: { [parameterName]: itemId } 
            });
            
            if (error) {
              const errorTitle = getErrorTitle(error);
              const errorMessage = mapErrorCodeToMessage(error);
              Alert.alert(errorTitle, errorMessage);
            } else {
              Alert.alert('Success', `${itemType.replace('_', ' ')} permanently deleted.`);
              await refetch(); // Refresh list
            }
            setActionLoading(null);
          },
        },
      ]
    );
  }, [refetch]);

  return (
    <QueryStateWrapper
      isLoading={isLoading}
      isError={isError}
      error={error}
      data={items}
      refetch={refetch}
      isRefetching={isRefetching}
      onRefresh={refetch}
      emptyTitle="Trash can is empty"
      emptyMessage="Deleted items will appear here. Items are automatically deleted after 30 days."
      emptyIcon="trash-outline"
    >
      <View style={styles.container}>
        {/* Selection toolbar */}
        {isSelectionMode && (
          <View style={styles.selectionToolbar}>
            <View style={styles.toolbarLeft}>
              <TouchableOpacity onPress={handleSelectAll} style={styles.toolbarButton}>
                <Text style={styles.toolbarButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeselectAll} style={styles.toolbarButton}>
                <Text style={styles.toolbarButtonText}>Deselect All</Text>
              </TouchableOpacity>
              <Text style={styles.selectedCount}>
                {selectedIds.size} selected
              </Text>
            </View>
          </View>
        )}

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${(item as any).type || 'unknown'}-${item.id || index}`}
          renderItem={({ item }) => (
            <DeletedItemCard
              item={item as any}
              onRestore={handleRestore}
              onDeletePermanently={handleDeletePermanently}
              isActionLoading={actionLoading === item.id}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
            />
          )}
          contentContainerStyle={styles.list}
        />

        {/* Batch action buttons */}
        {isSelectionMode && selectedIds.size > 0 && (
          <View style={styles.batchActionsContainer}>
            <TouchableOpacity
              style={[styles.batchButton, styles.restoreBatchButton]}
              onPress={handleBatchRestore}
              disabled={batchMutation.isPending}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.batchButtonText}>
                Restore ({selectedIds.size})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.batchButton, styles.deleteBatchButton]}
              onPress={handleBatchDelete}
              disabled={batchMutation.isPending}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.batchButtonText}>
                Delete ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </QueryStateWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toolbarButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  batchActionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  batchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  restoreBatchButton: {
    backgroundColor: '#007AFF',
  },
  deleteBatchButton: {
    backgroundColor: '#FF3B30',
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RecycleBinScreen;