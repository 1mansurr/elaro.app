import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@/contexts/AuthContext';
import { MainTabParamList } from '@/types';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { AccountScreen } from '@/features/user-profile/screens/AccountScreen';
import { CalendarScreen } from '@/navigation/bundles/CalendarBundle';
import { CustomTabBar } from './components/CustomTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator component
export const MainTabNavigator: React.FC = () => {
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
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
        },
        // Ensure nothing is drawn behind the floating capsule nav bar
        tabBarBackground: () => null,
        sceneContainerStyle: {
          backgroundColor: 'transparent',
        },
      }}>
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
