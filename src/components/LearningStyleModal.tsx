import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, useColorScheme, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface LearningStyleModalProps {
  visible: boolean;
  onClose: () => void;
  onQuickQuiz: () => void;
  onDeepDive: () => void;
}

export const LearningStyleModal: React.FC<LearningStyleModalProps> = ({
  visible,
  onClose,
  onQuickQuiz,
  onDeepDive,
}) => {
  const { theme, isDark } = useTheme();
  const { height } = Dimensions.get('window');

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card, maxHeight: height * 0.85, borderColor: theme.border }]}> 
          <TouchableOpacity onPress={onClose} style={styles.closeIcon} accessibilityLabel="Close modal">
            <Feather name="x" size={24} color={theme.text} />
          </TouchableOpacity>
        
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.emoji}>🧠</Text>
            <Text style={[styles.title, { color: theme.text }]}>Discover Your Learning Style</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>Knowing how you learn helps you build a smarter study system.</Text>

            <TouchableOpacity style={[styles.button, { backgroundColor: theme.purple600 }]} onPress={onQuickQuiz} accessibilityLabel="Start Quick Quiz">
              <Text style={[styles.buttonText, { color: theme.white }]}>✨ Quick Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, { backgroundColor: theme.purple600 }]} onPress={onDeepDive} accessibilityLabel="Start Deep Dive">
              <Text style={[styles.buttonText, { color: theme.white }]}>🔍 Deep Dive</Text>
                  </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 12 } }),
  },
  closeIcon: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    padding: 8,
  },
  content: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  button: {
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    fontWeight: '600',
  },
}); 