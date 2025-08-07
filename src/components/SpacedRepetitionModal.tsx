import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export interface RepetitionItem {
  id: string;
  title: string;
  time?: string;
  completed: boolean;
}

interface SpacedRepetitionModalProps {
  visible: boolean;
  onClose: () => void;
  items: RepetitionItem[];
  onToggleComplete: (id: string) => void;
}

export const SpacedRepetitionModal: React.FC<SpacedRepetitionModalProps> = ({
  visible,
  onClose,
  items,
  onToggleComplete,
}) => {
  const { theme, isDark } = useTheme();
  const hasItems = items.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={onClose}
            accessibilityLabel="Close modal">
            <Feather name="x" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>
            📚 Spaced Repetition
          </Text>

          {hasItems ? (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onToggleComplete(item.id)}
                  style={[
                    styles.item,
                    { borderBottomColor: theme.border },
                    item.completed && {
                      backgroundColor: isDark ? theme.green700 : theme.green50,
                    },
                  ]}
                  accessibilityLabel={
                    item.completed ? 'Mark as incomplete' : 'Mark as complete'
                  }>
                  <Text
                    style={[
                      styles.itemText,
                      {
                        color: item.completed
                          ? isDark
                            ? theme.green300
                            : theme.green700
                          : theme.text,
                      },
                      item.completed && styles.itemTextDone,
                    ]}>
                    {item.title} {item.time ? `• ${item.time}` : ''}
                  </Text>
                  {item.completed && (
                    <Feather
                      name="check"
                      size={20}
                      color={isDark ? theme.green300 : theme.green700}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              🎉 You’ve completed all your spaced repetition for today!
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
    borderWidth: 1,
  },
  closeIcon: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  item: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  itemTextDone: {
    textDecorationLine: 'line-through',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
