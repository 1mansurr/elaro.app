import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LibraryStackParamList } from '@/types';
import LibraryScreen from '@/features/library/screens/LibraryScreen';
import QuizDetailScreen from '@/features/library/screens/QuizDetailScreen';
import QuizTakingScreen from '@/features/library/screens/QuizTakingScreen';
import ResultsScreen from '@/features/library/screens/ResultsScreen';
import QuizPreviewScreen from '@/features/library/screens/QuizPreviewScreen';
import { TRANSITIONS, GESTURES } from './constants/NavigationConstants';

const Stack = createStackNavigator<LibraryStackParamList>();

const LibraryNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TRANSITIONS.slideFromRight,
        ...GESTURES.horizontal,
      }}>
      <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
      <Stack.Screen name="QuizDetail" component={QuizDetailScreen} />
      <Stack.Screen name="QuizTaking" component={QuizTakingScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="QuizPreview" component={QuizPreviewScreen} />
    </Stack.Navigator>
  );
};

export default LibraryNavigator;
