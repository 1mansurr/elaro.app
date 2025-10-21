import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  onSwipeComplete: () => void;
  enabled?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4; // 40% of screen width

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({ 
  children, 
  onSwipeComplete,
  enabled = true,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (!enabled) return;

    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // If swiped past threshold, trigger complete action
      if (translationX > SWIPE_THRESHOLD) {
        // Animate off screen
        Animated.timing(translateX, {
          toValue: SCREEN_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onSwipeComplete();
          // Reset position
          translateX.setValue(0);
          lastOffset.current = 0;
        });
      } else {
        // Snap back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }).start();
        lastOffset.current = 0;
      }
    }
  };

  // Calculate opacity for the background based on swipe distance
  const backgroundOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const iconScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Background that reveals on swipe */}
      <Animated.View 
        style={[
          styles.background,
          { opacity: backgroundOpacity }
        ]}
      >
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="checkmark-circle" size={48} color="#FFF" />
        </Animated.View>
      </Animated.View>

      {/* Swipeable card */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
      >
        <Animated.View
          style={[
            styles.swipeableCard,
            { transform: [{ translateX }] }
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#34C759',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 40,
  },
  swipeableCard: {
    backgroundColor: 'transparent',
  },
});

