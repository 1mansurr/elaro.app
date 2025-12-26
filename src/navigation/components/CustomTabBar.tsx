import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationState } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { shouldHideTabBar } from '@/navigation/utils/RouteGuards';

/**
 * Traverses the navigation hierarchy to find the root stack navigator
 * and returns the currently active route name.
 *
 * This is necessary because the tab bar is nested inside MainTabNavigator,
 * which is nested inside the root Stack Navigator. We need to check
 * the root stack to see if a fullscreen modal is active.
 *
 * Navigation hierarchy:
 * - AuthenticatedNavigator (Stack - root)
 *   - Main (screen containing MainTabNavigator)
 *     - MainTabNavigator (Tab Navigator - where CustomTabBar is)
 *   - PostOnboardingWelcome (screen - sibling to Main)
 */
const getRootActiveRouteName = (
  navigation: BottomTabBarProps['navigation'],
): string | null => {
  try {
    // Traverse up the navigation hierarchy to find the root stack navigator
    // Keep going until we reach the top (no more parents)
    let currentNav = navigation.getParent();
    let topmostState: NavigationState | undefined;

    while (currentNav) {
      const navState = currentNav.getState();
      if (navState) {
        topmostState = navState;
        // Continue to the next parent
        const parent = currentNav.getParent();
        if (!parent) {
          // We've reached the root - this is the topmost state
          break;
        }
        currentNav = parent;
      } else {
        break;
      }
    }

    // Extract the active route name from the topmost (root) navigator
    if (topmostState?.routes && topmostState.routes.length > 0) {
      const currentRoute = topmostState.routes[topmostState.index || 0];
      if (currentRoute?.name) {
        // Return the route name (e.g., 'PostOnboardingWelcome', 'Main', etc.)
        // We want the route name itself, not nested routes
        return currentRoute.name;
      }
    }

    return null;
  } catch (error) {
    // Silently fail - if we can't determine the route, show the tab bar
    // This ensures the app remains functional even if navigation state is unexpected
    console.warn('CustomTabBar: Error getting root active route:', error);
    return null;
  }
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Get the active route name from the root stack navigator
  const rootActiveRouteName = getRootActiveRouteName(navigation);

  // Hide tab bar if the active route should hide it (onboarding/fullscreen modals)
  if (rootActiveRouteName && shouldHideTabBar(rootActiveRouteName)) {
    return null;
  }

  const getIconName = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'Home':
        return focused ? 'home' : 'home-outline';
      case 'Calendar':
        return focused ? 'calendar' : 'calendar-outline';
      case 'Account':
        return focused ? 'person' : 'person-outline';
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
            backgroundColor: theme.isDark ? '#000000' : '#FFFFFF',
            borderColor: theme.isDark ? '#1F2937' : '#F3F4F6',
            ...SHADOWS.lg,
          },
        ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

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
            : theme.isDark
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
                    ? theme.isDark
                      ? '#1F2937'
                      : `${COLORS.primary}1A`
                    : 'transparent',
                },
              ]}>
              <Ionicons
                name={iconName}
                size={isFocused ? 24 : 28}
                color={
                  isFocused
                    ? theme.isDark
                      ? '#FFFFFF'
                      : COLORS.primary
                    : iconColor
                }
              />
              {isFocused && (
                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.isDark ? '#FFFFFF' : COLORS.primary,
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    backgroundColor: 'transparent',
  },
  capsuleNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 80,
    borderRadius: 9999, // rounded-full - capsule shape
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
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
