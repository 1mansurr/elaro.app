import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { CalendarItem, EVENT_COLORS_DARKENED } from '../../constants/calendar';
import { Button } from '../index';

interface CalendarItemModalProps {
  visible: boolean;
  item: CalendarItem | null;
  onClose: () => void;
  onToggleComplete: (item: CalendarItem) => void;
  onDelete: (item: CalendarItem) => void;
}

export const CalendarItemModal: React.FC<CalendarItemModalProps> = ({
  visible,
  item,
  onClose,
  onToggleComplete,
  onDelete,
}) => {
  if (!item) return null;

  const colors = EVENT_COLORS_DARKENED[item.type];
  const isAllDay = item.time === 'All Day';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={colors.gradient}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.titleSection}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.timeSection}>
                  <Ionicons 
                    name={isAllDay ? "time-outline" : "time"} 
                    size={20} 
                    color={COLORS.white} 
                  />
                  <Text style={styles.timeText}>
                    {isAllDay ? 'All Day' : item.time}
                    {item.endTime && !isAllDay && ` - ${item.endTime}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {item.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>Type: {item.type}</Text>
                </View>
                
                {item.hasSpacedRepetition && (
                  <View style={styles.detailItem}>
                    <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      Spaced Repetition: {item.srRemaining}/{item.srTotal}
                    </Text>
                  </View>
                )}

                {item.isRepeating && (
                  <View style={styles.detailItem}>
                    <Feather name="repeat" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{item.repeatPattern}</Text>
                  </View>
                )}

                <View style={styles.detailItem}>
                  <Ionicons 
                    name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={item.completed ? COLORS.success : COLORS.textSecondary} 
                  />
                  <Text style={styles.detailText}>
                    Status: {item.completed ? 'Completed' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={item.completed ? 'Mark Incomplete' : 'Mark Complete'}
              variant="secondary"
              onPress={() => onToggleComplete(item)}
              style={styles.actionButton}
              icon={
                <Ionicons 
                  name={item.completed ? "refresh" : "checkmark"} 
                  size={20} 
                  color={COLORS.white} 
                />
              }
              iconPosition="left"
            />
            <Button
              title="Delete"
              variant="danger"
              onPress={() => onDelete(item)}
              style={{ ...styles.actionButton, marginLeft: 12 }}
              icon={<Ionicons name="trash" size={20} color={COLORS.white} />}
              iconPosition="left"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    width: '100%',
    maxHeight: '80%',
    ...SHADOWS.xl,
  },
  header: {
    padding: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.white,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.md,
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.md * 1.5,
  },
  detailsGrid: {
    gap: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 