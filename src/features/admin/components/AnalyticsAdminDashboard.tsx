import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { formatDate } from '@/i18n';

interface AnalyticsAdminDashboardProps {
  onClose?: () => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  scenario: string;
  template_content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BatchProcessingLog {
  id: string;
  processing_date: string;
  total_users: number;
  processed_users: number;
  successful_reports: number;
  failed_reports: number;
  skipped_users: number;
  status: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export const AnalyticsAdminDashboard: React.FC<
  AnalyticsAdminDashboardProps
> = ({ onClose }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'templates' | 'monitoring' | 'logs'
  >('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [batchLogs, setBatchLogs] = useState<BatchProcessingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(
    null,
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadTemplates(), loadBatchLogs()]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load admin data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadBatchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('batch_processing_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBatchLogs(data || []);
    } catch (error) {
      console.error('Error loading batch logs:', error);
    }
  };

  const handleTemplateEdit = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleTemplateSave = async (templateData: Partial<ReportTemplate>) => {
    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('report_templates')
          .insert(templateData);

        if (error) throw error;
      }

      setShowTemplateModal(false);
      setEditingTemplate(null);
      await loadTemplates();
      Alert.alert('Success', 'Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template. Please try again.');
    }
  };

  const handleTemplateStatusChange = async (
    templateId: string,
    newStatus: string,
  ) => {
    try {
      const { error } = await supabase
        .from('report_templates')
        .update({ status: newStatus })
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
      Alert.alert('Success', 'Template status updated!');
    } catch (error) {
      console.error('Error updating template status:', error);
      Alert.alert('Error', 'Failed to update template status.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading admin dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Analytics Admin
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          {
            key: 'templates',
            label: 'Templates',
            icon: 'document-text-outline',
          },
          { key: 'monitoring', label: 'Monitoring', icon: 'analytics-outline' },
          { key: 'logs', label: 'Logs', icon: 'list-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
              {
                borderBottomColor:
                  activeTab === tab.key ? theme.accent : 'transparent',
              },
            ]}
            onPress={() => setActiveTab(tab.key as any)}>
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? theme.accent : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab.key ? theme.accent : theme.textSecondary,
                },
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            onTemplateEdit={handleTemplateEdit}
            onTemplateStatusChange={handleTemplateStatusChange}
            theme={theme}
          />
        )}
        {activeTab === 'monitoring' && (
          <MonitoringTab batchLogs={batchLogs} theme={theme} />
        )}
        {activeTab === 'logs' && (
          <LogsTab batchLogs={batchLogs} theme={theme} />
        )}
      </ScrollView>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onSave={handleTemplateSave}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          theme={theme}
        />
      )}
    </View>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

interface TemplatesTabProps {
  templates: ReportTemplate[];
  onTemplateEdit: (template: ReportTemplate) => void;
  onTemplateStatusChange: (templateId: string, newStatus: string) => void;
  theme: any;
}

const TemplatesTab: React.FC<TemplatesTabProps> = ({
  templates,
  onTemplateEdit,
  onTemplateStatusChange,
  theme,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#4CAF50';
      case 'draft':
        return '#FF9800';
      case 'review':
        return '#2196F3';
      case 'archived':
        return '#9E9E9E';
      default:
        return theme.textSecondary;
    }
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Report Templates
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={() => onTemplateEdit({} as ReportTemplate)}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>New Template</Text>
        </TouchableOpacity>
      </View>

      {templates.map(template => (
        <View
          key={template.id}
          style={[styles.templateCard, { backgroundColor: theme.surface }]}>
          <View style={styles.templateHeader}>
            <View style={styles.templateInfo}>
              <Text style={[styles.templateName, { color: theme.text }]}>
                {template.name}
              </Text>
              <View style={styles.templateMeta}>
                <Text
                  style={[
                    styles.templateCategory,
                    { color: theme.textSecondary },
                  ]}>
                  {template.category} • {template.scenario}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(template.status) + '20' },
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(template.status) },
                    ]}>
                    {template.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.templateActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onTemplateEdit(template)}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={theme.accent}
                />
              </TouchableOpacity>
              {template.status === 'draft' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    onTemplateStatusChange(template.id, 'published')
                  }>
                  <Ionicons
                    name="checkmark-outline"
                    size={20}
                    color="#4CAF50"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text
            style={[styles.templateContent, { color: theme.textSecondary }]}
            numberOfLines={3}>
            {template.template_content}
          </Text>
        </View>
      ))}
    </View>
  );
};

interface MonitoringTabProps {
  batchLogs: BatchProcessingLog[];
  theme: any;
}

const MonitoringTab: React.FC<MonitoringTabProps> = ({ batchLogs, theme }) => {
  const latestLog = batchLogs[0];

  if (!latestLog) {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          System Monitoring
        </Text>
        <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <Ionicons
            name="analytics-outline"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No batch processing data available
          </Text>
        </View>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'running':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'cancelled':
        return '#FF9800';
      default:
        return theme.textSecondary;
    }
  };

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        System Monitoring
      </Text>

      <View style={[styles.monitoringCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.monitoringTitle, { color: theme.text }]}>
          Latest Batch Processing
        </Text>

        <View style={styles.monitoringRow}>
          <Text
            style={[styles.monitoringLabel, { color: theme.textSecondary }]}>
            Status:
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(latestLog.status) + '20' },
            ]}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(latestLog.status) },
              ]}>
              {latestLog.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.monitoringRow}>
          <Text
            style={[styles.monitoringLabel, { color: theme.textSecondary }]}>
            Date:
          </Text>
          <Text style={[styles.monitoringValue, { color: theme.text }]}>
            {formatDate(new Date(latestLog.processing_date))}
          </Text>
        </View>

        <View style={styles.monitoringRow}>
          <Text
            style={[styles.monitoringLabel, { color: theme.textSecondary }]}>
            Total Users:
          </Text>
          <Text style={[styles.monitoringValue, { color: theme.text }]}>
            {latestLog.total_users}
          </Text>
        </View>

        <View style={styles.monitoringRow}>
          <Text
            style={[styles.monitoringLabel, { color: theme.textSecondary }]}>
            Processed:
          </Text>
          <Text style={[styles.monitoringValue, { color: theme.text }]}>
            {latestLog.processed_users}/{latestLog.total_users}
          </Text>
        </View>

        <View style={styles.monitoringRow}>
          <Text
            style={[styles.monitoringLabel, { color: theme.textSecondary }]}>
            Success Rate:
          </Text>
          <Text style={[styles.monitoringValue, { color: theme.text }]}>
            {latestLog.total_users > 0
              ? Math.round(
                  (latestLog.successful_reports / latestLog.total_users) * 100,
                )
              : 0}
            %
          </Text>
        </View>

        {latestLog.error_message && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorLabel, { color: '#F44336' }]}>
              Error:
            </Text>
            <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
              {latestLog.error_message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface LogsTabProps {
  batchLogs: BatchProcessingLog[];
  theme: any;
}

const LogsTab: React.FC<LogsTabProps> = ({ batchLogs, theme }) => {
  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Processing Logs
      </Text>

      {batchLogs.map(log => (
        <View
          key={log.id}
          style={[styles.logCard, { backgroundColor: theme.surface }]}>
          <View style={styles.logHeader}>
            <Text style={[styles.logDate, { color: theme.text }]}>
              {formatDate(new Date(log.started_at))}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(log.status) + '20' },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(log.status) },
                ]}>
                {log.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.logStats}>
            <Text style={[styles.logStat, { color: theme.textSecondary }]}>
              Users: {log.processed_users}/{log.total_users}
            </Text>
            <Text style={[styles.logStat, { color: theme.textSecondary }]}>
              Success: {log.successful_reports}
            </Text>
            <Text style={[styles.logStat, { color: theme.textSecondary }]}>
              Failed: {log.failed_reports}
            </Text>
            <Text style={[styles.logStat, { color: theme.textSecondary }]}>
              Skipped: {log.skipped_users}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// TEMPLATE MODAL
// ============================================================================

interface TemplateModalProps {
  template?: ReportTemplate | null;
  onSave: (templateData: Partial<ReportTemplate>) => void;
  onClose: () => void;
  theme: any;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  template,
  onSave,
  onClose,
  theme,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'general');
  const [scenario, setScenario] = useState(template?.scenario || 'first_week');
  const [content, setContent] = useState(template?.template_content || '');
  const [status, setStatus] = useState(template?.status || 'draft');

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    onSave({
      name: name.trim(),
      category,
      scenario,
      template_content: content.trim(),
      status,
    });
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View
        style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {template ? 'Edit Template' : 'New Template'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Template Name
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: theme.surface, color: theme.text },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter template name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Category
            </Text>
            <View style={styles.radioGroup}>
              {[
                'general',
                'academic_performance',
                'time_management',
                'completion_rates',
              ].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={styles.radioOption}
                  onPress={() => setCategory(cat)}>
                  <Ionicons
                    name={
                      category === cat ? 'radio-button-on' : 'radio-button-off'
                    }
                    size={20}
                    color={
                      category === cat ? theme.accent : theme.textSecondary
                    }
                  />
                  <Text style={[styles.radioLabel, { color: theme.text }]}>
                    {cat.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Scenario
            </Text>
            <View style={styles.radioGroup}>
              {[
                'first_week',
                'high_activity',
                'low_activity',
                'improvement',
                'decline',
              ].map(scen => (
                <TouchableOpacity
                  key={scen}
                  style={styles.radioOption}
                  onPress={() => setScenario(scen)}>
                  <Ionicons
                    name={
                      scenario === scen ? 'radio-button-on' : 'radio-button-off'
                    }
                    size={20}
                    color={
                      scenario === scen ? theme.accent : theme.textSecondary
                    }
                  />
                  <Text style={[styles.radioLabel, { color: theme.text }]}>
                    {scen.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Template Content
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.surface, color: theme.text },
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="Enter template content with {{variables}}"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Status
            </Text>
            <View style={styles.radioGroup}>
              {['draft', 'review', 'published', 'archived'].map(stat => (
                <TouchableOpacity
                  key={stat}
                  style={styles.radioOption}
                  onPress={() => setStatus(stat)}>
                  <Ionicons
                    name={
                      status === stat ? 'radio-button-on' : 'radio-button-off'
                    }
                    size={20}
                    color={status === stat ? theme.accent : theme.textSecondary}
                  />
                  <Text style={[styles.radioLabel, { color: theme.text }]}>
                    {stat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.border }]}
            onPress={onClose}>
            <Text style={[styles.modalButtonText, { color: theme.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.accent }]}
            onPress={handleSave}>
            <Text style={styles.modalButtonText}>Save Template</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateCategory: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  templateContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  monitoringCard: {
    padding: 16,
    borderRadius: 12,
  },
  monitoringTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  monitoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monitoringLabel: {
    fontSize: 14,
  },
  monitoringValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F4433620',
    borderRadius: 8,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  logCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  logStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  logStat: {
    fontSize: 14,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  radioGroup: {
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioLabel: {
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#4CAF50';
    case 'running':
      return '#2196F3';
    case 'failed':
      return '#F44336';
    case 'cancelled':
      return '#FF9800';
    default:
      return '#9E9E9E';
  }
};

export default AnalyticsAdminDashboard;
