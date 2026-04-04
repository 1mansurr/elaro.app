import React, { memo } from 'react';
import FloatingActionButton from '@/shared/components/FloatingActionButton';

interface HomeScreenFABProps {
  onPress: () => void;
  draftCount: number;
  onDraftBadgePress: () => void;
}

const HomeScreenFAB: React.FC<HomeScreenFABProps> = memo(
  ({ onPress, draftCount, onDraftBadgePress }) => {
    return (
      <FloatingActionButton
        onPress={onPress}
        draftCount={draftCount}
        onDraftBadgePress={onDraftBadgePress}
      />
    );
  },
);

HomeScreenFAB.displayName = 'HomeScreenFAB';

export default HomeScreenFAB;
