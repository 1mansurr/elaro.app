import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Course, Assignment, Lecture, StudySession } from '@/types';

type Item = (Course | Assignment | Lecture | StudySession) & { type: string; deleted_at: string };

interface DeletedItemCardProps {
  item: Item;
  onRestore: (id: string, type: string) => void;
  onDeletePermanently: (id: string, type: string) => void;
  isActionLoading: boolean;
}

const getItemName = (item: Item) => {
  if ('courseName' in item) return item.courseName;
  if ('title' in item) return item.title;
  return 'Unnamed Item';
};

export const DeletedItemCard: React.FC<DeletedItemCardProps> = ({ item, onRestore, onDeletePermanently, isActionLoading }) => {
  return (
    <View style={styles.itemContainer}>
      <View>
        <Text style={styles.itemType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.itemName}>{getItemName(item)}</Text>
        <Text style={styles.itemDate}>Deleted on: {new Date(item.deleted_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.actionsContainer}>
        {isActionLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <>
            <TouchableOpacity style={styles.restoreButton} onPress={() => onRestore(item.id, item.type)}>
              <Text style={styles.buttonText}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => onDeletePermanently(item.id, item.type)}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  itemType: { 
    fontSize: 12, 
    color: '#8E8E93', 
    textTransform: 'capitalize' 
  },
  itemName: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginVertical: 2 
  },
  itemDate: { 
    fontSize: 12, 
    color: '#8E8E93' 
  },
  actionsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  restoreButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    marginRight: 8 
  },
  deleteButton: { 
    backgroundColor: '#FF3B30', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8 
  },
  buttonText: { 
    color: 'white', 
    fontWeight: '600' 
  },
});
