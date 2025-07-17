import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  LAYOUT,
  SHADOWS,
} from '../constants/theme';
import { TEXT } from '../constants/text';
import { INITIAL_CHECKLIST, GUIDE_SECTIONS, ChecklistItem as ChecklistItemType } from '../constants/checklist';
import { useFadeIn } from '../hooks/useFadeIn';
import { Button, Card } from '../components';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { AddOptionModal } from '../components/AddOptionModal';
import PlanBadge from '../components/PlanBadge';
import UsageTracker from '../components/UsageTracker';
import SpacedRepetitionBadge from '../components/SpacedRepetitionBadge';
import { LearningStyleModal } from '../components/LearningStyleModal';
import { useAuth } from '../contexts/AuthContext';
import { useSoftLaunch } from '../contexts/SoftLaunchContext';
import { ChecklistModal } from '../components/ChecklistModal';
import { useTheme } from '../contexts/ThemeContext';
import { LearningStylePromptModal } from '../components/LearningStylePromptModal';
import { guideSections } from '../data/guideSections';

import AddTaskModal from '../components/modals/AddTaskModal';
import AddStudySessionModal from '../components/modals/AddStudySessionModal';
import { srService, sessionService, taskService } from '../services/supabase';
import { SpacedRepetitionReminder, StudySession, TaskEvent } from '../types';
import { featureGates, PlanType } from '../config/featureGates';
import AddOddityModal from '../components/AddOddityModal';
import { CelebrationModal } from '../components/account/CelebrationModal';
import { useSubscription } from '../hooks/useSubscription';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthModal } from '../components/AuthModal';

const { width } = Dimensions.get('window');

// Enhanced animated components
const AnimatedCard = ({ children, style, delay = 0, ...props }: {
  children: React.ReactNode;
  style?: any;
  delay?: number;
  [key: string]: any;
}) => {
  const fadeAnim = useFadeIn(delay);
  
  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

const StreakCounter = ({ streak, isOddity }: { streak: number; isOddity: boolean }) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const isZero = streak === 0;
  useEffect(() => {
    if (streak > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [streak]);
  return (
    <Animated.View
      style={[
        styles.streakBadge,
        isOddity && styles.streakBadgeOddity,
        { transform: [{ scale: pulseAnim }] },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Streak: ${streak} days`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={[
            styles.streakNumber,
            isZero ? { color: '#a3a3a3' } : {},
          ]}
        >
          {streak}
        </Text>
        <MaterialCommunityIcons
          name="fire"
          size={24}
          color={isZero ? '#a3a3a3' : COLORS.orange600}
          style={{ marginLeft: 2 }}
          accessibilityLabel={isZero ? 'No streak yet' : 'Streak active'}
        />
      </View>
    </Animated.View>
  );
};

const ChecklistItemComponent = ({ icon, title, completed, onPress, delay = 0 }: {
  icon: string;
  title: string;
  completed: boolean;
  onPress: () => void;
  delay?: number;
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [completedAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (completed) {
      Animated.timing(completedAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [completed]);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress]);

  if (completed) {
    return (
      <Animated.View 
        style={[
          styles.checklistItem,
          styles.checklistItemCompleted,
          {
            opacity: completedAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.7],
            }),
            transform: [
              { scale: scaleAnim },
              {
                translateX: completedAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10],
                }),
              },
            ],
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`Completed: ${title}`}
      >
        <View style={styles.checklistIcon}>
          <Text style={styles.checklistIconCompleted}>✅</Text>
        </View>
        <Text style={styles.checklistTitleCompleted}>{title}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={styles.checklistItem} 
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint="Double tap to complete this setup step"
      >
        <View style={styles.checklistIcon}>
          <Text style={styles.checklistIconText}>{icon}</Text>
        </View>
        <Text style={styles.checklistTitle}>{title}</Text>
        <Feather name="chevron-right" size={20} color={COLORS.purple600} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const FeatureCard = ({ children, gradient, borderColor, shadow = true, ...props }: {
  children: React.ReactNode;
  gradient?: [string, string];
  borderColor?: string;
  shadow?: boolean;
  [key: string]: any;
}) => (
  <View style={[styles.cardContainer, shadow && styles.cardShadow]} {...props}>
    {gradient ? (
      <LinearGradient
        colors={gradient}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    ) : (
      <View style={[styles.card, borderColor && { borderColor }]}>
        {children}
      </View>
    )}
  </View>
);

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, loading } = useAuth();
  console.log('HomeScreen loading:', loading, 'user:', user);
  useEffect(() => {
    console.log('HomeScreen useEffect: user:', user, 'loading:', loading);
  }, [user, loading]);
  const { blockPremiumFeature } = useSoftLaunch();
  const { theme, isDark } = useTheme();
  const { isSubscribed } = useSubscription();
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState<boolean | null>(null);
  
  // Check walkthrough flag on mount
  useEffect(() => {
    const checkWalkthrough = async () => {
      const flag = await AsyncStorage.getItem('has_seen_walkthrough');
      setHasSeenWalkthrough(flag === 'true');
    };
    checkWalkthrough();
  }, []);

  // Trigger tour after login/signup if not seen
  useEffect(() => {
    if (hasSeenWalkthrough === false) {
      // start(); // Removed Copilot start
    }
  }, [hasSeenWalkthrough]); // Removed start from dependency array

  // Listen for tour finish/skip and set flag
  useEffect(() => {
    const handleStop = async () => {
      await AsyncStorage.setItem('has_seen_walkthrough', 'true');
      setHasSeenWalkthrough(true);
    };
    // copilotEvents.on('stop', handleStop); // Removed copilotEvents
    return () => {
      // copilotEvents.off('stop', handleStop); // Removed copilotEvents
    };
  }, []); // Removed copilotEvents from dependency array

  // Function to replay the tour (can be passed to Account/Profile screen)
  const replayTour = () => {
    // start(); // Removed Copilot start
  };
  
  // Use actual plan based on subscription
  const userPlan: PlanType = user?.is_subscribed_to_oddity ? 'oddity' : 'origin';
  // Remove static values for usedTasks and streak
  const [usedTasks, setUsedTasks] = useState(0);
  const [activeReminders, setActiveReminders] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todayTasks, setTodayTasks] = useState<TaskEvent[]>([]);
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [todaySRReviews, setTodaySRReviews] = useState<SpacedRepetitionReminder[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  // Refactor: extract fetchUsage so it can be called on demand
  const fetchUsage = useCallback(async () => {
    if (!user) return;
    
    // Add a flag to prevent multiple simultaneous calls
    let isMounted = true;
    
    try {
      const [tasks, sessions, reminders, weekly, active] = await Promise.all([
        taskService.getUserTasks(user.id),
        sessionService.getUserSessions(user.id),
        srService.getUserReminders(user.id),
        taskService.getWeeklyTaskCount(user.id),
        taskService.getActiveTasks(user.id),
      ]);
      
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      // Filter for today
      const todayStr = new Date().toISOString().split('T')[0];
      setTodayTasks(tasks.filter(t => t.date_time.startsWith(todayStr) && !t.completed));
      setTodaySessions(sessions.filter(s => s.date_time.startsWith(todayStr) && !s.completed));
      setTodaySRReviews(reminders.filter(r => r.scheduled_date.startsWith(todayStr) && !r.completed));
      setWeeklyCount(weekly);
      setActiveCount(active);
    } catch (e) {
      console.error('Error fetching usage data:', e);
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      // Set default values on error to prevent UI issues
      setTodayTasks([]);
      setTodaySessions([]);
      setTodaySRReviews([]);
      setWeeklyCount(0);
      setActiveCount(0);
    }
    
    return () => { isMounted = false; };
  }, [user?.id]); // Use user.id instead of user object to prevent unnecessary re-renders

  useEffect(() => {
    if (user?.id) {
      fetchUsage();
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Reset all state to prevent stale data
      setTodayTasks([]);
      setTodaySessions([]);
      setTodaySRReviews([]);
      setWeeklyCount(0);
      setActiveCount(0);
      setSRReminders([]);
      setSessionsById({});
      setLoadingSR(false);
    };
  }, [user?.id]); // Use user.id instead of fetchUsage to prevent dependency loops
  
  // Enforce feature limits based on plan
  const maxTasks = userPlan === 'origin' ? 14 : Infinity;
  const maxReminders = userPlan === 'origin' ? 40 : Infinity;
  const allowedSRDays = userPlan === 'origin' ? [0, 1, 3, 7] : [0, 1, 3, 7, 14, 30, 60, 90, 180];

  const [showAddModal, setShowAddModal] = useState(false);
  const [showLearningStyleModal, setShowLearningStyleModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddStudySessionModal, setShowAddStudySessionModal] = useState(false);
  const [showOddityModal, setShowOddityModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Checklist state with constants
  const [checklist, setChecklist] = useState(
    INITIAL_CHECKLIST.map(item => ({ ...item, completed: false }))
  );

  // Memoized computed values with error handling
  const isOddity = useMemo(() => userPlan === 'oddity', [userPlan]);
  const isLoggedIn = useMemo(() => !!user, [user]);
  const completedCount = useMemo(() => {
    try {
      return checklist.filter(item => item.completed).length;
    } catch (error) {
      console.error('Error computing completed count:', error);
      return 0;
    }
  }, [checklist]);
  const allCompleted = useMemo(() => {
    try {
      return completedCount === checklist.length;
    } catch (error) {
      console.error('Error computing all completed:', error);
      return false;
    }
  }, [completedCount, checklist.length]);

  // Navigation helper with premium feature blocking
  const goTo = useCallback((screen: string) => {
    // Block premium screens during soft launch
    const premiumScreens = ['GuideSection', 'ScheduleSR']; // Removed 'SpacedRepetitionScreen'
    if (premiumScreens.includes(screen)) {
      blockPremiumFeature(screen.toLowerCase().replace('screen', ''));
      return;
    }
    
    navigation.dispatch(CommonActions.navigate(screen as never));
  }, [navigation, blockPremiumFeature]);

  const handleChecklistItemPress = useCallback((id: number) => {
    setShowOnboardingModal(false); // Always close modal first
    
    // Use a single timeout with proper cleanup
    const timeoutId = setTimeout(() => {
      // Before opening any modal, set all others to false to prevent stacking
      setShowAddModal(false);
      setShowAddTaskModal(false);
      setShowAddStudySessionModal(false);
      setShowLearningStyleModal(false);
      setShowOddityModal(false);
      setShowCelebration(false);
      
      switch (id) {
        case 1: // Learn How ELARO works
          goTo('ExplainerVideo');
          break;
        case 2: // Add a study session
          setShowAddModal(true);
          // Use a separate timeout for the nested modal
          setTimeout(() => setShowAddStudySessionModal(true), 250);
          break;
        case 3: // Add a task or event
          setShowAddModal(true);
          // Use a separate timeout for the nested modal
          setTimeout(() => setShowAddTaskModal(true), 250);
          break;
        case 4: // Discover your learning style
          setShowLearningStyleModal(true);
          break;
        default:
          setChecklist(prev => 
            prev.map(item => 
              item.id === id ? { ...item, completed: !item.completed } : item
            )
          );
      }
    }, 300); // Delay to allow modal to close smoothly
    
    // Return cleanup function
    return () => clearTimeout(timeoutId);
  }, [goTo]);
  
  // TODO: Consider refactoring timeout cleanup to use a more robust pattern
  // Current pattern with return statements in setTimeout callbacks works but could be improved

  const handleAddSession = useCallback(() => {
    setShowAddModal(false);
    goTo('AddStudy');
  }, [goTo]);

  const handleAddEvent = useCallback(() => {
    setShowAddModal(false);
    goTo('AddTaskEvent');
  }, [goTo]);

  // Learning Style Prompt Modal State
  const [promptModalVisible, setPromptModalVisible] = useState<null | 'quick' | 'deep'>(null);

  // Static prompt texts
  const QUICK_QUIZ_PROMPT = `🎯 GENERATE A 10-QUESTION LEARNING STYLE QUIZ FOR MY FIELD

**My Field:** [Enter your field – e.g., "Computer Science", "Medicine", "Business"]

Create a complete learning style quiz with instant results. Structure:
- 3 Likert scale questions (1–5 scale: Strongly Disagree to Strongly Agree)
- 7 multiple-choice questions (allow multiple selections)
- All questions use realistic scenarios from my field

**Question Requirements:**
- Use authentic field-specific tools, challenges, and concepts
- Write for students/beginners in accessible language
- Include these learning style tags in answers:
  - VARK: Visual, Aural, Read-Write, Kinesthetic
  - Kolb: Concrete Experience, Abstract Conceptualization, Active Experimentation, Reflective Observation
  - Felder-Solomon: Active/Reflective, Sensing/Intuitive, Visual/Verbal, Sequential/Global
  - Gardner: Spatial, Linguistic, Logical-Mathematical, Bodily-Kinesthetic, Interpersonal, Intrapersonal

**After I answer all questions, provide:**
1. **My Learning Style Profile:** Creative title + emoji + 2-paragraph summary
2. **Top 3 Study Strategies:** Specific to my field and learning style
3. **Recommended Tools:** 2–3 tools that match my style
4. **Memory Techniques:** How to retain information based on my preferences
5. **Quick Action Plan:** 3 concrete steps to improve my learning

**Start with the quiz now!**`;

  const DEEP_DIVE_PROMPT = `🎯 CREATE A COMPREHENSIVE 20-QUESTION LEARNING ASSESSMENT FOR MY FIELD

**My Field:** [Enter your field – e.g., "Computer Science", "Medicine", "Business"]

Generate a detailed learning style assessment with comprehensive results:
- 4 Likert scale questions (1–5 scale)
- 16 multiple-choice questions (multiple selections allowed)
- Cover: learning approach, information processing, knowledge application, learning environment

**Requirements:**
- Authentic field scenarios using real tools and challenges
- Tag answers with 8 learning models: VARK, Kolb, Felder-Solomon, Gardner, Honey-Mumford, Dunn-Dunn, Gregorc, MBTI-based
- No repetitive concepts across questions

**After I complete all 20 questions, provide my:**
1. **Detailed Learning Profile:** Creative title + emoji + comprehensive 3-paragraph analysis
2. **Top 5 Personalized Strategies:** Field-specific techniques matching my style
3. **Memory Mastery System:** Advanced retention techniques for my learning type
4. **Tool Recommendations:** 4–5 tools (free + premium) aligned with my preferences
5. **Learning Environment Setup:** Optimal conditions for my style
6. **Progress Tracking System:** How to monitor and improve my learning
7. **Field-Specific Action Plan:** Concrete implementation steps

**Generate the assessment now – I’ll answer each question as we go!**`;

  // Spaced Repetition Modal State
  const [showSRModal, setShowSRModal] = useState(false);
  const [srReminders, setSRReminders] = useState<SpacedRepetitionReminder[]>([]);
  const [sessionsById, setSessionsById] = useState<Record<string, StudySession>>({});
  const [loadingSR, setLoadingSR] = useState(false);

  // Fetch today's reminders and group by course/topic
  const fetchTodayReminders = useCallback(async () => {
    if (!user) return;
    
    // Add a flag to prevent multiple simultaneous calls
    let isMounted = true;
    
    setLoadingSR(true);
    try {
      const allReminders = await srService.getUserReminders(user.id);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todaysReminders = allReminders.filter(r => r.scheduled_date.startsWith(todayStr));
      
      // Fetch sessions for grouping
      const sessions = await sessionService.getUserSessions(user.id);
      const sessionMap: Record<string, StudySession> = {};
      sessions.forEach(s => { sessionMap[s.id] = s; });
      
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      setSessionsById(sessionMap);
      setSRReminders(todaysReminders);
    } catch (e) {
      console.error('Error fetching today\'s reminders:', e);
      
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      setSRReminders([]);
      setSessionsById({});
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted) {
        setLoadingSR(false);
      }
    }
    
    return () => { isMounted = false; };
  }, [user?.id]); // Use user.id instead of user object

  // Global unhandled promise rejection logger is now in App.tsx for freeze/debugging

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  // Remove the 'if (!user)' block that showed the sign-in prompt

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header */}
        <AnimatedCard style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text }}>Ready to learn?</Text>
            </View>
            <StreakCounter streak={streak} isOddity={isOddity} />
          </View>
          <Text style={{ fontSize: 18, color: theme.textSecondary, marginTop: 8, fontWeight: '500' }}>Let's Make Today Count</Text>
          {/* Removed the first CTA button 'Learn how ELARO works' as requested */}
        </AnimatedCard>

        {/* Show checklist button if not all completed and modal is closed */}
        {!allCompleted && (
          <View style={styles.checklistButtonContainer}>
            {/* Removed the 'Learn how ELARO works' button as per new onboarding */}
          </View>
        )}

        {/* Success State */}
        {allCompleted && (
          <AnimatedCard delay={100} style={styles.successSection}>
            <FeatureCard gradient={['#d1fae5', '#a7f3d0']}>
              <View style={styles.successContent}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>You're all set for today!</Text>
                <Text style={styles.successSubtitle}>Let's stay consistent and keep building momentum.</Text>
              </View>
            </FeatureCard>
          </AnimatedCard>
        )}

        {/* Today's Overview */}
        <AnimatedCard delay={200} style={styles.overviewSection}>
          <FeatureCard borderColor={COLORS.blue200}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Today's Overview</Text>
              <TouchableOpacity
                onPress={() => goTo('Calendar')}
                accessibilityRole="button"
                accessibilityLabel="Go to Calendar"
                style={styles.calendarIconButton}
              >
                <Feather name="calendar" size={20} color={COLORS.blue600} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>{todayTasks.length + todaySessions.length}</Text>
                <Text style={styles.overviewLabel}>Tasks Due</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>{todaySessions.length}</Text>
                <Text style={styles.overviewLabel}>Study Sessions</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>{todaySRReviews.length}</Text>
                <Text style={styles.overviewLabel}>SR Reviews</Text>
              </View>
            </View>

            {!isOddity && (
              <View style={styles.usageChip}>
                <Text style={styles.usageText}>
                  {usedTasks} of 14 tasks used this week
                </Text>
              </View>
            )}
          </FeatureCard>
        </AnimatedCard>

        {/* Spaced Repetition */}
        <AnimatedCard delay={300} style={styles.srSection}>
          <FeatureCard gradient={['#f0fdf4', '#dcfce7']}>
            <View style={styles.srHeader}>
              <Text style={styles.srTitle}>Spaced Repetition</Text>
              <SpacedRepetitionBadge type="basic" size="small" />
            </View>
            <Text style={styles.srDescription}>
              2 reviews due today
            </Text>
            <View style={styles.srButtons}>
              <Button
                title="Check Today’s Reminders"
                onPress={() => { fetchTodayReminders(); setShowSRModal(true); }}
                style={styles.srPrimaryButton}
              />
            </View>
          </FeatureCard>
        </AnimatedCard>

        {/* Learning Style Discovery (moved up, always available) */}
        <AnimatedCard delay={350} style={styles.learningSection}>
          <FeatureCard gradient={['#faf5ff', '#f3e8ff']}>
            <View style={styles.learningHeader}>
              <Text style={styles.learningIcon}>🧠</Text>
              <View style={styles.learningTitleContainer}>
                <Text style={styles.learningTitle}>Discover Your Learning Style</Text>
                <Text style={styles.learningSubtitle}>Take a quick AI-powered quiz</Text>
              </View>
            </View>
            <Button
              title="Start Discovery"
              onPress={() => setShowLearningStyleModal(true)}
              style={styles.learningButton}
            />
          </FeatureCard>
        </AnimatedCard>

        {/* AI Study Guide */}
        <AnimatedCard delay={400} style={styles.guideSection}>
          <FeatureCard 
            gradient={isOddity ? ['#fefce8', '#fef3c7'] : undefined}
            borderColor={isOddity ? COLORS.yellow200 : COLORS.gray300}
          >
            <View style={styles.guideHeader}>
              <Text style={styles.guideTitle}>📚 AI Study Guide</Text>
            </View>
            {/* Section titles in a vertical list with padlocks on the left */}
            <View style={{ flexDirection: 'column', marginBottom: 8 }}>
              {guideSections.map((section) => (
                <View
                  key={section.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Locked: ${section.title}`}
                    onPress={() => blockPremiumFeature('study-guide')}
                    style={{ marginRight: 8 }}
                  >
                    <Text style={{ fontSize: 16 }}>🔒</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, color: COLORS.text, fontWeight: '500', flexShrink: 1 }}>{section.title}</Text>
                </View>
              ))}
            </View>
            <Button 
              title="Become an Oddity"
              onPress={() => setShowOddityModal(true)}
              style={{ backgroundColor: COLORS.primary }}
              textStyle={{ color: '#fff' }}
            />
          </FeatureCard>
        </AnimatedCard>
      </ScrollView>

      <FloatingAddButton 
        onPress={() => {
          if (!user) {
            setShowAuthModal(true);
          } else {
            setShowAddModal(true);
          }
        }}
        icon="plus"
        size="large"
        backgroundColor={theme.blue600}
        iconColor={theme.white}
        accessibilityLabel="Add new item"
      />

      <AddOptionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddSession={() => {
          // Before opening, set all modals to false to prevent stacking
          setShowAddModal(false);
          setShowAddTaskModal(false);
          setShowAddStudySessionModal(false);
          // Use simple timeout without complex cleanup
          setTimeout(() => setShowAddStudySessionModal(true), 250);
        }}
        onAddEvent={() => {
          // Before opening, set all modals to false to prevent stacking
          setShowAddModal(false);
          setShowAddTaskModal(false);
          setShowAddStudySessionModal(false);
          // Use simple timeout without complex cleanup
          setTimeout(() => setShowAddTaskModal(true), 250);
        }}
      />

      {/* Study Session Input Modal (bottom sheet, wide) */}
      <AddStudySessionModal
        visible={showAddStudySessionModal}
        onClose={() => setShowAddStudySessionModal(false)}
        onSubmit={() => { setShowAddStudySessionModal(false); fetchUsage(); }}
        isOddity={isSubscribed}
      />
      {/* Task/Event Input Modal (bottom sheet, wide) */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSubmit={() => { setShowAddTaskModal(false); fetchUsage(); }}
        isOddity={isSubscribed}
        weeklyCount={weeklyCount}
        activeCount={activeCount}
      />

      <LearningStyleModal
        visible={showLearningStyleModal}
        onClose={() => setShowLearningStyleModal(false)}
        onQuickQuiz={() => {
          setShowLearningStyleModal(false);
          setPromptModalVisible('quick');
        }}
        onDeepDive={() => {
          setShowLearningStyleModal(false);
          setPromptModalVisible('deep');
        }}
      />
      <LearningStylePromptModal
        visible={promptModalVisible !== null}
        onClose={() => setPromptModalVisible(null)}
        prompt={
          promptModalVisible === 'quick'
            ? QUICK_QUIZ_PROMPT
            : promptModalVisible === 'deep'
            ? DEEP_DIVE_PROMPT
            : ''
        }
        isGuest={!user}
        title={
          promptModalVisible === 'quick'
            ? 'Quick Quiz Prompt'
            : promptModalVisible === 'deep'
            ? 'Deep Dive Prompt'
            : ''
        }
      />

      {/* Welcome Modal */}
      <Modal visible={showWelcomeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.welcomeModal}>
            <Text style={styles.welcomeIcon}>🎉</Text>
            <Text style={styles.welcomeTitle}>Welcome to ELARO!</Text>
            <Text style={styles.welcomeSubtitle}>
              Your academic co-pilot is ready to help you build better study habits and achieve your goals.
            </Text>
            <Button
              title="Get Started"
              onPress={() => {
                setShowWelcomeModal(false);
              }}
              style={styles.welcomeButton}
            />
          </View>
        </View>
      </Modal>

      {/* Onboarding Checklist Modal */}
      {/* <ChecklistModal
        visible={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        items={checklist}
        onItemPress={item => handleChecklistItemPress(item.id as number)}
        completedCount={completedCount}
        totalCount={checklist.length}
      /> */}

      {/* Spaced Repetition Reminders Modal */}
      <Modal
        visible={showSRModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSRModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.white, borderRadius: 20, width: '100%', maxHeight: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Today’s Reviews</Text>
              <TouchableOpacity onPress={() => setShowSRModal(false)} accessibilityLabel="Close reminders modal">
                <Text style={{ fontSize: 22, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingSR ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : srReminders.length === 0 ? (
              <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 32 }}>No reviews due today!</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {/* Group reminders by course/topic */}
                {Object.entries(
                  srReminders.reduce((acc: Record<string, SpacedRepetitionReminder[]>, r: SpacedRepetitionReminder) => {
                    const session = (sessionsById && typeof r.session_id === 'string') ? sessionsById[r.session_id] : undefined;
                    const group = session ? `${session.course || 'General'}${session.topic ? ' - ' + session.topic : ''}` : 'Other';
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(r);
                    return acc;
                  }, {} as Record<string, SpacedRepetitionReminder[]>)
                ).map(([group, reminders]) => (
                  <View key={group} style={{ marginBottom: 18 }}>
                    <Text style={{ fontWeight: '600', fontSize: 16, color: theme.text, marginBottom: 6 }}>{group}</Text>
                    {reminders.map((r: SpacedRepetitionReminder) => (
                      <View key={r.id} style={{ backgroundColor: theme.background, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.gray100 }}>
                        <Text style={{ color: theme.text }}>{new Date(r.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{r.completed ? 'Completed' : 'Pending'}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Oddity Modal and Celebration Modal */}
      <AddOddityModal
        visible={showOddityModal}
        onClose={() => setShowOddityModal(false)}
        onSuccess={() => setShowCelebration(true)}
      />
      <CelebrationModal
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
      />

      {/* AuthModal for guest sign-in prompt */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign In Required"
        message="Please sign in to add study sessions or tasks."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  
  // Header Styles
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  greeting: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.gray600,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  
  // Streak Counter
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange50,
    borderColor: COLORS.orange200,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: COLORS.orange200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  streakBadgeOddity: {
    backgroundColor: COLORS.yellow50,
    borderColor: COLORS.yellow400,
    shadowColor: COLORS.yellow400,
  },
  streakNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.orange600,
    marginRight: SPACING.xs,
  },
  streakIcon: {
    fontSize: FONT_SIZES.lg,
  },
  
  // Card Components
  cardContainer: {
    marginBottom: SPACING.md,
  },
  cardShadow: {
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  
  // Setup Section
  setupSection: {
    marginBottom: SPACING.lg,
  },
  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  setupTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.gray800,
  },
  progressIndicator: {
    backgroundColor: COLORS.purple100,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.purple600,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.purple500,
    borderRadius: 3,
  },
  
  // Checklist Items
  checklistContainer: {
    gap: SPACING.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checklistItemCompleted: {
    backgroundColor: COLORS.green50,
    borderColor: COLORS.green200,
  },
  checklistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.purple50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  checklistIconText: {
    fontSize: FONT_SIZES.lg,
  },
  checklistIconCompleted: {
    fontSize: FONT_SIZES.lg,
  },
  checklistTitle: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  checklistTitleCompleted: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.green700,
    textDecorationLine: 'line-through',
  },
  
  // Success Section
  successSection: {
    marginBottom: SPACING.lg,
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  successTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.green800,
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.green700,
    textAlign: 'center',
  },
  
  // Overview Section
  overviewSection: {
    marginBottom: SPACING.lg,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  calendarIconButton: {
    padding: 4,
    borderRadius: 16,
  },
  overviewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  overviewGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.blue600,
  },
  overviewLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  overviewDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.gray300,
    marginHorizontal: SPACING.md,
  },
  usageChip: {
    backgroundColor: COLORS.blue50,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: 'center',
    flexDirection: 'column',
  },
  usageText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.blue700,
    marginBottom: 2,
    textAlign: 'center',
  },
  upgradeHint: {
    marginTop: 4,
    backgroundColor: COLORS.blue100,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  upgradeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.blue600,
    fontWeight: FONT_WEIGHTS.semibold as any,
    textAlign: 'center',
  },
  
  // Spaced Repetition Section
  srSection: {
    marginBottom: SPACING.lg,
  },
  srHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  srTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  srDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  srButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  srPrimaryButton: {
    flex: 1,
    backgroundColor: COLORS.green600,
  },
  srSecondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: COLORS.green400,
    borderWidth: 1,
  },
  
  // Guide Section
  guideSection: {
    marginBottom: SPACING.lg,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  guideTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  guideSections: {
    marginBottom: SPACING.md,
  },
  guideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  guideSectionUnlocked: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.green700,
    fontWeight: FONT_WEIGHTS.medium as any,
    marginHorizontal: SPACING.xs,
  },
  lockedSection: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  guideSectionLocked: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  guideButtonOrigin: {
    backgroundColor: COLORS.yellow600,
  },
  guideButtonOddity: {
    backgroundColor: COLORS.green600,
  },
  
  // Learning Section
  learningSection: {
    marginBottom: SPACING.lg,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  learningIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  learningTitleContainer: {
    flex: 1,
  },
  learningTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  learningSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  learningButton: {
    backgroundColor: COLORS.purple600,
    shadowColor: COLORS.purple200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Analytics Section (Oddity Only)
  analyticsSection: {
    marginBottom: SPACING.lg,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  analyticsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  analyticsNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.blue600,
    marginBottom: SPACING.xs,
  },
  analyticsLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  analyticsDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.gray300,
    marginHorizontal: SPACING.md,
  },
  analyticsButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  
  // Bottom Spacing
  bottomSpacing: {
    height: 100, // Space for floating add button
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Welcome Modal
  welcomeModal: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  welcomeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  
  // Onboarding Modal
  onboardingModal: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    margin: SPACING.lg,
    maxHeight: '80%',
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  onboardingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.purple600,
    flex: 1,
  },
  onboardingProgressText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.purple600,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginLeft: SPACING.md,
    marginRight: SPACING.md,
  },
  onboardingProgress: {
    alignItems: 'center',
  },
  onboardingProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  onboardingProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  checklistButtonContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  checklistButton: {
    backgroundColor: COLORS.purple600,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  checklistButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    textAlign: 'center',
  },
});

