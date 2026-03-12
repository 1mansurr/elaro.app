import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { MainTabParamList } from '@/types';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import ProfileScreen from '@/features/user-profile/screens/ProfileScreen';
import { CalendarScreen } from '@/navigation/bundles/CalendarBundle';
import { CustomTabBar } from './components/CustomTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator component
export const MainTabNavigator: React.FC = () => {
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
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
};
