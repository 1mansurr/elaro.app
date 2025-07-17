import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants/theme';

interface MobileFrameProps {
  children: React.ReactNode;
  style?: any;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, style }) => {
  return (
    <View style={[styles.mobileFrame, style]}>
      <View style={styles.mobileScreen}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>9:41</Text>
          <Text style={styles.statusText}>📶 📶 📶 🔋</Text>
        </View>
        
        {/* Content */}
        {children}
        
        {/* Home Indicator */}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileFrame: {
    width: 375,
    height: 812,
    backgroundColor: '#000',
    borderRadius: 40,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  mobileScreen: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 32,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  statusBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: COLORS.white,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 3,
    margin: 8,
    marginLeft: 'auto',
    marginRight: 'auto',
    opacity: 0.3,
  },
});

export default MobileFrame; 