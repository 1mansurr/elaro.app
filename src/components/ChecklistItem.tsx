import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { ChecklistItem as ChecklistItemType } from './ChecklistModal';

interface ChecklistItemProps {
  item: ChecklistItemType;
  theme: any;
  onItemPress: (item: ChecklistItemType) => void;
  isDark: boolean;
  styles: any;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  theme,
  onItemPress,
  isDark,
  styles,
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value < 1 ? 0.7 : 1,
  }));
  return (
    <Animated.View
      key={item.id}
      style={[
        styles.item,
        {
          backgroundColor: item.completed ? theme.success : theme.card,
          borderColor: item.completed ? theme.success : theme.border,
        },
        animatedStyle,
      ]}>
      <TouchableOpacity
        onPress={() => {
          // Animate tap
          scale.value = 0.95;
          setTimeout(() => {
            scale.value = 1;
          }, 150);
          onItemPress(item);
        }}
        style={styles.itemTouch}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${item.title} as complete`}>
        {item.icon && (
          <Feather
            name={item.icon as any}
            size={20}
            color={item.completed ? theme.background : theme.text}
            style={styles.itemIcon}
          />
        )}
        <Text
          style={[
            styles.itemText,
            { color: item.completed ? theme.background : theme.text },
            item.completed && styles.itemTextCompleted,
          ]}>
          {item.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default ChecklistItem;
