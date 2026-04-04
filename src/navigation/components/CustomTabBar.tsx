import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationState } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import {
  ROUTES_HIDING_TAB_BAR,
  NON_RESTORABLE_ROUTES,
} from '@/navigation/utils/RouteGuards';

/**
 * Extracts the root stack active route name from navigation state.
 * This is the single source of truth for tab bar visibility.
 *
 * Traverses the navigation state tree to find the root stack navigator
 * and returns the active route name at that level.
 */
const getRootActiveRouteName = (
  rootState: NavigationState | undefined,
): string | null => {
  if (!rootState || !rootState.routes || rootState.routes.length === 0) {
    return null;
  }

  // Get the active route at the root level
  const activeIndex = rootState.index ?? 0;
  const activeRoute = rootState.routes[activeIndex];

  if (!activeRoute || !activeRoute.name) {
    return null;
  }

  // Return the root route name directly - this is the source of truth
  // We don't recurse into nested routes because we want the root stack route name
  // (e.g., 'PostOnboardingWelcome', 'Main', not 'Home' or 'Calendar')
  return activeRoute.name;
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // HARDENING: Get root active route name immediately and check multiple ways
  let rootActiveRouteName: string | null = null;
  try {
    // Check if getState method exists before calling it
    if (typeof navigation.getState === 'function') {
      const rootState = navigation.getState();
      rootActiveRouteName = getRootActiveRouteName(rootState);
    } else {
      // getState not available - this can happen during initial render
      // Fall back to using tab navigator state
      if (__DEV__) {
        console.log(
          'CustomTabBar: getState not available, using tab navigator state',
        );
      }
    }
  } catch (error) {
    // If we can't get root state, default to showing tab bar (safe fallback)
    if (__DEV__) {
      console.warn('CustomTabBar: Error getting root state:', error);
    }
  }

  // HARDENING: Also check the current route from the tab navigator state
  // This provides a fallback if root state detection fails
  const currentTabRoute = state.routes[state.index]?.name;

  // Check nested stack route within the active tab — detail/taking/results screens
  // should hide the tab bar even though they live inside the Library stack
  const activeTabNestedState = state.routes[state.index]?.state;
  const activeNestedRouteName =
    activeTabNestedState?.routes?.[activeTabNestedState.index ?? 0]?.name;
  const NESTED_SCREENS_HIDING_TAB_BAR = [
    'QuizDetail',
    'QuizTaking',
    'Results',
    'QuizPreview',
  ];
  const shouldHideForNestedRoute =
    typeof activeNestedRouteName === 'string' &&
    NESTED_SCREENS_HIDING_TAB_BAR.includes(activeNestedRouteName);

  // Check if route is in NON_RESTORABLE_ROUTES or ROUTES_HIDING_TAB_BAR
  const isNonRestorable =
    rootActiveRouteName &&
    (NON_RESTORABLE_ROUTES as readonly string[]).includes(rootActiveRouteName);

  const shouldHideForRootRoute =
    rootActiveRouteName &&
    (ROUTES_HIDING_TAB_BAR.includes(rootActiveRouteName as any) ||
      isNonRestorable);

  if (shouldHideForNestedRoute || shouldHideForRootRoute) {
    return null;
  }

  const getIconName = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'Home':
        return focused ? 'home' : 'home-outline';
      case 'Calendar':
        return focused ? 'calendar' : 'calendar-outline';
      case 'Library':
        return focused ? 'library' : 'library-outline';
      default:
        return 'help-outline';
    }
  };

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: 'transparent',
          paddingBottom: Math.max(insets.bottom, SPACING.md),
        },
      ]}>
      <View
        style={[
          styles.capsuleNavBar,
          {
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#F3F4F6',
            ...SHADOWS.lg,
          },
        ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const labelValue =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          // Extract label text - handle both string and function cases
          const label =
            typeof labelValue === 'function'
              ? labelValue({
                  focused: state.index === index,
                  color: '',
                  position: 'below-icon' as any,
                  children: route.name,
                })
              : labelValue;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconName = getIconName(route.name, isFocused);
          const iconColor = isFocused
            ? COLORS.primary
            : isDark
              ? '#6B7280'
              : '#9CA3AF';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                isFocused ? styles.activeTab : styles.inactiveTab,
                {
                  backgroundColor: isFocused
                    ? isDark
                      ? '#1F2937'
                      : `${COLORS.primary}1A`
                    : 'transparent',
                },
              ]}>
              <Ionicons
                name={iconName}
                size={isFocused ? 24 : 28}
                color={
                  isFocused ? (isDark ? '#FFFFFF' : COLORS.primary) : iconColor
                }
              />
              {isFocused && (
                <Text
                  style={[
                    styles.label,
                    {
                      color: isDark ? '#FFFFFF' : COLORS.primary,
                    },
                  ]}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: SPACING.xs,
    backgroundColor: 'transparent',
  },
  capsuleNavBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    height: 72,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 9999, // rounded-full
  },
  inactiveTab: {
    padding: SPACING.md,
    borderRadius: 9999,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
