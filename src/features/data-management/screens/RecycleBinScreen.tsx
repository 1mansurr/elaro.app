import React, { useState } from 'react';
import { FlatList, StyleSheet, Alert } from 'react-native';
import { useDeletedItemsQuery } from '@/hooks/useDeletedItemsQuery';
import { QueryStateWrapper } from '@/shared/components';
import { DeletedItemCard } from '../components/DeletedItemCard';
import { supabase } from '@/services/supabase';

const RecycleBinScreen = () => {
  const { data: items, isLoading, isError, error, refetch, isRefetching } = useDeletedItemsQuery();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRestore = async (itemId: string, itemType: string) => {
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
      Alert.alert('Error', `Failed to restore ${itemType}.`);
    } else {
      Alert.alert('Success', `${itemType.replace('_', ' ')} restored.`);
      await refetch(); // Refresh list
    }
    setActionLoading(null);
  };

  const handleDeletePermanently = (itemId: string, itemType: string) => {
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
              Alert.alert('Error', `Failed to permanently delete ${itemType}.`);
            } else {
              Alert.alert('Success', `${itemType.replace('_', ' ')} permanently deleted.`);
              await refetch(); // Refresh list
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

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
      <FlatList
        data={items}
        keyExtractor={(item, index) => `${(item as any).type || 'unknown'}-${item.id || index}`}
        renderItem={({ item }) => (
          <DeletedItemCard
            item={item as any}
            onRestore={handleRestore}
            onDeletePermanently={handleDeletePermanently}
            isActionLoading={actionLoading === item.id}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </QueryStateWrapper>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flexGrow: 1 },
});

export default RecycleBinScreen;