import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { getDraftCount } from '@/utils/draftStorage';
import FloatingActionButton from '@/shared/components/FloatingActionButton';

type HomeScreenFABNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface HomeScreenFABProps {
  onPress: () => void;
}

export const HomeScreenFAB: React.FC<HomeScreenFABProps> = ({ onPress }) => {
  const navigation = useNavigation<HomeScreenFABNavigationProp>();
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    const loadDraftCount = async () => {
      const count = await getDraftCount();
      setDraftCount(count);
    };
    loadDraftCount();
  }, []);

  return (
    <FloatingActionButton
      onPress={onPress}
      draftCount={draftCount}
      onDraftBadgePress={() => navigation.navigate('Drafts')}
    />
  );
};

export default HomeScreenFAB;
