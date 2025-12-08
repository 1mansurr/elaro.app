import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextStyle } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MainTabParamList } from '@/types';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { AccountScreen } from '@/features/user-profile/screens/AccountScreen';
import { CalendarScreen } from '@/navigation/bundles/CalendarBundle';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon helper for cleaner code
const getTabBarIcon = (routeName: keyof MainTabParamList, focused: boolean) => {
  let iconName: keyof typeof Ionicons.glyphMap;

  switch (routeName) {
    case 'Home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'Calendar':
      iconName = focused ? 'calendar' : 'calendar-outline';
      break;
    case 'Account':
      iconName = focused ? 'person' : 'person-outline';
      break;
    default:
      iconName = 'help-outline';
  }

  return (
    <Ionicons
      name={iconName}
      size={28}
      color={focused ? '#135bec' : '#9ca3af'}
    />
  );
};

// Tab bar screen options
const tabBarScreenOptions =
  (insets: { bottom: number }, theme: { colors: { background: string } }) =>
  ({ route }: { route: { name: keyof MainTabParamList } }) => ({
    tabBarIcon: ({ focused }: { focused: boolean }) =>
      getTabBarIcon(route.name, focused),
    tabBarActiveTintColor: '#135bec',
    tabBarInactiveTintColor: '#9ca3af',
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E5EA',
      paddingBottom: insets.bottom,
      paddingTop: 8,
      height: 70 + insets.bottom,
    },
    tabBarLabelStyle: {
      fontSize: 14,
      fontWeight: '500' as TextStyle['fontWeight'],
      marginTop: 4,
      letterSpacing: 0.015,
    },
    headerShown: false,
  });

// Main Tab Navigator component
export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { session, user } = useAuth();

  const getFirstName = () => {
    if (!session || !user) {
      return 'Account';
    }

    // Use the first_name from the users table (populated by our database trigger)
    if (user.first_name) {
      return user.first_name;
    }

    // Fallback for older users - check user_metadata
    if (user.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }

    // Default if no name is found
    return 'Account';
  };

  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions(insets, theme)}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarLabel: getFirstName(),
        }}
      />
    </Tab.Navigator>
  );
};
