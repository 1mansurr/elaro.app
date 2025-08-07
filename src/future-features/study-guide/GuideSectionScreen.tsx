import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  ProgressDots,
  GuideCard,
  ProgressBar,
  NavigationButtons,
} from '../components/guide';
import { guideSections } from '../data/guideSections';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const GuideSectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { theme } = useTheme();
  const currentGuide = guideSections[currentIndex];

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const next = () => {
    if (currentIndex < guideSections.length - 1) {
      goToIndex(currentIndex + 1);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.text === '#000000' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.primary}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={theme.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.white }]}>
            {currentGuide.title}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            {currentGuide.subtitle}
          </Text>
        </View>

        <ProgressBar
          currentIndex={currentIndex}
          totalSections={guideSections.length}
        />
      </View>

      {/* Progress Dots */}
      <ProgressDots
        totalSections={guideSections.length}
        currentIndex={currentIndex}
        onDotPress={goToIndex}
      />

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <GuideCard section={currentGuide} />
      </ScrollView>

      {/* Navigation Buttons */}
      <NavigationButtons
        currentIndex={currentIndex}
        totalSections={guideSections.length}
        onPrevious={prev}
        onNext={next}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
  },
  header: {
    // backgroundColor: COLORS.primary,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    // color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    // color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for navigation buttons
  },
});

export default GuideSectionScreen;
