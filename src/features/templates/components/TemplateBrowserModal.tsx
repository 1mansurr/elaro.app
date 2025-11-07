import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTemplates } from '@/hooks/useTemplates';
import { TaskTemplate } from '@/hooks/useTemplates';

interface TemplateBrowserModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TaskTemplate) => void;
  currentTaskType: 'assignment' | 'lecture' | 'study_session';
}

interface FilterButtonProps {
  title: string;
  isSelected: boolean;
  onPress: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  title,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      isSelected ? styles.filterButtonSelected : styles.filterButtonUnselected,
    ]}
    onPress={onPress}>
    <Text
      style={[
        styles.filterButtonText,
        isSelected
          ? styles.filterButtonTextSelected
          : styles.filterButtonTextUnselected,
      ]}>
      {title}
    </Text>
  </TouchableOpacity>
);

interface TemplateItemProps {
  template: TaskTemplate;
  onSelect: (template: TaskTemplate) => void;
  onDelete: (template: TaskTemplate) => void;
}

const TemplateItem: React.FC<TemplateItemProps> = ({
  template,
  onSelect,
  onDelete,
}) => {
  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'assignment':
        return '📝';
      case 'lecture':
        return '👨‍🏫';
      case 'study_session':
        return '📚';
      default:
        return '📝';
    }
  };

  const handleLongPress = () => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete '${template.template_name}'?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => onDelete(template),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={styles.templateItem}
      onPress={() => onSelect(template)}
      onLongPress={handleLongPress}>
      <Text style={styles.templateIcon}>
        {getTaskTypeIcon(template.task_type)}
      </Text>
      <Text style={styles.templateName}>{template.template_name}</Text>
    </TouchableOpacity>
  );
};

export const TemplateBrowserModal: React.FC<TemplateBrowserModalProps> = ({
  visible,
  onClose,
  onSelectTemplate,
  currentTaskType,
}) => {
  const { data: templates, isLoading: loading } = useTemplates();
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'assignment' | 'lecture' | 'study_session'
  >('all');
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>(
    [],
  );

  // Filter templates based on selected filter
  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredTemplates(templates || []);
    } else {
      setFilteredTemplates(
        templates?.filter(template => template.task_type === selectedFilter) ||
          [],
      );
    }
  }, [templates, selectedFilter]);

  const handleFilterChange = (
    filter: 'all' | 'assignment' | 'lecture' | 'study_session',
  ) => {
    setSelectedFilter(filter);
  };

  const handleTemplateSelect = (template: TaskTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleTemplateDelete = async (template: TaskTemplate) => {
    try {
      // await deleteTemplate.mutateAsync(template.id);
    } catch (error) {
      console.error('Error deleting template:', error);
      Alert.alert('Error', 'Failed to delete template. Please try again.');
    }
  };

  const renderEmptyState = () => {
    if (selectedFilter === 'all') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You don't have any templates. You can add a template using the
            toggle at the latter part of the task addition.
          </Text>
        </View>
      );
    } else {
      const taskTypeName =
        selectedFilter === 'assignment'
          ? 'Assignments'
          : selectedFilter === 'lecture'
            ? 'Lectures'
            : 'Study Sessions';
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You have no templates for {taskTypeName}
          </Text>
        </View>
      );
    }
  };

  const renderTemplateItem = ({ item }: { item: TaskTemplate }) => (
    <TemplateItem
      template={item}
      onSelect={handleTemplateSelect}
      onDelete={handleTemplateDelete}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Templates</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <FilterButton
            title="All"
            isSelected={selectedFilter === 'all'}
            onPress={() => handleFilterChange('all')}
          />
          <FilterButton
            title="Assignments"
            isSelected={selectedFilter === 'assignment'}
            onPress={() => handleFilterChange('assignment')}
          />
          <FilterButton
            title="Lectures"
            isSelected={selectedFilter === 'lecture'}
            onPress={() => handleFilterChange('lecture')}
          />
          <FilterButton
            title="Study Sessions"
            isSelected={selectedFilter === 'study_session'}
            onPress={() => handleFilterChange('study_session')}
          />
        </View>

        {/* Template List */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading templates...</Text>
            </View>
          ) : filteredTemplates.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={filteredTemplates}
              renderItem={renderTemplateItem}
              keyExtractor={item => item.id}
              style={styles.templateList}
              showsVerticalScrollIndicator={false}
              // Performance optimizations
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonUnselected: {
    backgroundColor: '#fff',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextSelected: {
    color: '#fff',
  },
  filterButtonTextUnselected: {
    color: '#007AFF',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  templateList: {
    flex: 1,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  templateIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  templateName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
