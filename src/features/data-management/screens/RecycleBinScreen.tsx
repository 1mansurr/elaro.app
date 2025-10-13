import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useDeletedItems } from '@/hooks/useDeletedItems';
import { DeletedItemCard } from '../components/DeletedItemCard';
import { supabase } from '@/services/supabase';

const RecycleBinScreen = () => {
  const { items, isLoading, fetchAllDeletedItems } = useDeletedItems();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAllDeletedItems();
  }, [fetchAllDeletedItems]);

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
      fetchAllDeletedItems(); // Refresh list
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
              fetchAllDeletedItems(); // Refresh list
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (items.length === 0) {
    return <View style={styles.centered}><Text>Your trash can is empty.</Text></View>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      renderItem={({ item }) => (
        <DeletedItemCard
          item={item}
          onRestore={handleRestore}
          onDeletePermanently={handleDeletePermanently}
          isActionLoading={actionLoading === item.id}
        />
      )}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flexGrow: 1 },
});

export default RecycleBinScreen;