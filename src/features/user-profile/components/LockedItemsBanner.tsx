import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLockedItemsCount } from '@/hooks/useLockedItemsCount';
import { Button } from '@/shared/components/Button';
import { useTheme } from '@/hooks/useTheme';

interface LockedItemsBannerProps {
  itemType: 'courses' | 'assignments' | 'lectures' | 'study_sessions';
  onUpgrade: () => void;
}

export const LockedItemsBanner: React.FC<LockedItemsBannerProps> = ({ itemType, onUpgrade }) => {
  const { theme } = useTheme();
  const { data, isLoading, isError } = useLockedItemsCount(itemType);

  if (isLoading || isError || !data || data.lockedCount === 0) {
    return null;
  }

  const itemLabel = data.lockedCount === 1 ? itemType.slice(0, -1) : itemType;

  return (
    <View style={[styles.container, { backgroundColor: theme.warningBackground }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        You have {data.lockedCount} locked {itemLabel}. Upgrade to Oddity to unlock all your data.
      </Text>
      <Button title="Upgrade Now" onPress={onUpgrade} size="small" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
    marginRight: 16,
    fontSize: 14,
  },
});

