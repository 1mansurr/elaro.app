import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';

interface VideoPlaceholderProps {
  isReady: boolean;
  onReady: () => void;
}

const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({ isReady, onReady }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady, fadeAnim]);

  useEffect(() => {
    // Pulse animation for play button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Video Frame */}
      <View style={styles.videoFrame}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Play Button */}
          <View style={styles.playButtonShadow}>
            <Animated.View 
              style={[
                styles.playButton,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <View style={styles.playIcon} />
            </Animated.View>
          </View>
          
          {/* Video Title */}
          <Text style={styles.videoTitle}>Welcome to ELARO</Text>
          <Text style={styles.videoSubtitle}>
            Discover how to organize your learning journey
          </Text>
        </Animated.View>

        {/* Loading State */}
        {!isReady && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </View>

      {/* Video Controls */}
      <View style={styles.controls}>
        <View style={styles.timelineContainer}>
          <View style={styles.timeline}>
            <View style={styles.timelineProgress} />
          </View>
          <Text style={styles.duration}>0:00 / 2:30</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 16 / 9,
  },
  videoFrame: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  playButtonShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: COLORS.white,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  videoTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  videoSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  controls: {
    paddingTop: SPACING.sm,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeline: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  timelineProgress: {
    width: '30%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  duration: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default VideoPlaceholder;

