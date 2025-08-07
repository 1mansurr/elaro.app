import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AddTaskModal } from '../../components/AddTaskModal';
import { useTheme } from '../../contexts/ThemeContext';

interface AddModalProps {
  navigation: any;
  route: any;
}

export default function AddModal({ navigation, route }: AddModalProps) {
  const { theme } = useTheme();

  const handleClose = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleSuccess = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AddTaskModal
        visible={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
