import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useTheme } from '@/contexts/ThemeContext';
import { QueryStateWrapper } from '@/shared/components';

interface ListItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  isSubItem?: boolean;
  disabled?: boolean;
}

const ListItem: React.FC<ListItemProps> = ({ 
  icon, 
  label, 
  onPress, 
  rightContent, 
  isSubItem = false, 
  disabled = false 
}) => {
  const { theme } = useTheme();
  
  const containerStyle = [
    styles.listItem,
    isSubItem && styles.subListItem,
    disabled && styles.disabledItem
  ];

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={isSubItem ? theme.textSecondary : theme.text} 
        style={styles.listItemIcon} 
      />
      <Text style={[
        styles.listItemLabel,
        isSubItem && styles.subListItemLabel,
        { color: isSubItem ? theme.textSecondary : theme.text }
      ]}>
        {label}
      </Text>
      {rightContent && (
        <View style={styles.rightContent}>
          {rightContent}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const NotificationSettings: React.FC = () => {
  const { preferences, isLoading, isError, updatePreferences, isUpdating } = useNotificationPreferences();
  const { theme } = useTheme();

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    if (preferences) {
      updatePreferences({ [key]: value });
    }
  };

  return (
    <QueryStateWrapper
      isLoading={isLoading}
      isError={isError}
      error={new Error('Could not load notification settings')}
      data={preferences}
      emptyTitle="No Settings Available"
      emptyMessage="Unable to load notification preferences."
      emptyIcon="settings-outline"
    >
      <View style={styles.container}>
      {/* Master Reminders Toggle */}
      <ListItem
        label="Enable All Reminders"
        icon="notifications-outline"
        rightContent={
          <Switch
            value={preferences.reminders_enabled}
            onValueChange={(value) => handleToggle('reminders_enabled', value)}
            disabled={isUpdating}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor={preferences.reminders_enabled ? '#FFFFFF' : '#FFFFFF'}
          />
        }
      />

      {/* Sub-settings - Only show when master toggle is on */}
      {preferences.reminders_enabled && (
        <View style={[styles.subSettingsContainer, { borderLeftColor: theme.border }]}>
          <ListItem
            label="Spaced Repetition"
            icon="repeat-outline"
            isSubItem={true}
            rightContent={
              <Switch
                value={preferences.srs_reminders_enabled}
                onValueChange={(value) => handleToggle('srs_reminders_enabled', value)}
                disabled={isUpdating}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={preferences.srs_reminders_enabled ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
          <ListItem
            label="Assignment Due Dates"
            icon="document-text-outline"
            isSubItem={true}
            rightContent={
              <Switch
                value={preferences.assignment_reminders_enabled}
                onValueChange={(value) => handleToggle('assignment_reminders_enabled', value)}
                disabled={isUpdating}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={preferences.assignment_reminders_enabled ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
          <ListItem
            label="Upcoming Lectures"
            icon="time-outline"
            isSubItem={true}
            rightContent={
              <Switch
                value={preferences.lecture_reminders_enabled}
                onValueChange={(value) => handleToggle('lecture_reminders_enabled', value)}
                disabled={isUpdating}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={preferences.lecture_reminders_enabled ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Summary Notifications */}
      <ListItem
        label="Morning Summary"
        icon="sunny-outline"
        rightContent={
          <Switch
            value={preferences.morning_summary_enabled}
            onValueChange={(value) => handleToggle('morning_summary_enabled', value)}
            disabled={isUpdating}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor={preferences.morning_summary_enabled ? '#FFFFFF' : '#FFFFFF'}
          />
        }
      />
      <ListItem
        label="Evening Capture"
        icon="moon-outline"
        rightContent={
          <Switch
            value={preferences.evening_capture_enabled}
            onValueChange={(value) => handleToggle('evening_capture_enabled', value)}
            disabled={isUpdating}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor={preferences.evening_capture_enabled ? '#FFFFFF' : '#FFFFFF'}
          />
        }
      />
    </View>
    </QueryStateWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  subListItem: {
    paddingLeft: 36, // Indent sub-items
  },
  disabledItem: {
    opacity: 0.5,
  },
  listItemIcon: {
    marginRight: 12,
    width: 24,
  },
  listItemLabel: {
    fontSize: 16,
    flex: 1,
  },
  subListItemLabel: {
    fontSize: 15,
  },
  rightContent: {
    marginLeft: 12,
  },
  subSettingsContainer: {
    borderLeftWidth: 2,
    marginLeft: 20,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 16,
  },
});
