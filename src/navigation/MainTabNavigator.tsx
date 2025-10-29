import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextStyle } from 'react-native';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MainTabParamList } from '../types';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { AccountScreen } from '@/features/user-profile/screens/AccountScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon helper for cleaner code
const getTabBarIcon = (
  routeName: keyof MainTabParamList,
  focused: boolean,
) => {
  let iconName: keyof typeof Ionicons.glyphMap;

  switch (routeName) {
    case 'Home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'Account':
      iconName = focused ? 'person' : 'person-outline';
      break;
    default:
      iconName = 'help-outline';
  }

  return <Ionicons name={iconName} size={24} color={focused ? '#007AFF' : '#8E8E93'} />;
};

// Tab bar screen options
const tabBarScreenOptions = (insets: any, theme: any) => 
({ route }: { route: { name: keyof MainTabParamList } }) => ({
  tabBarIcon: ({ focused }: { focused: boolean }) => getTabBarIcon(route.name, focused),
  tabBarActiveTintColor: '#007AFF',
  tabBarInactiveTintColor: '#8E8E93',
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: insets.bottom,
    height: 60 + insets.bottom,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    marginTop: 4,
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
        name="Account" 
        component={AccountScreen}
        options={{
          tabBarLabel: getFirstName(),
        }}
      />
    </Tab.Navigator>
  );
};
