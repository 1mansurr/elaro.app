import React, { Component, ReactNode } from 'react';
import { DevSettings } from 'react-native';
import { errorTracking } from '@/services/errorTracking';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Use centralized error tracking service
    errorTracking.captureError(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });
  }

  handleRestart = () => {
    // Call the onReset callback if provided (for React Query integration)
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reset the error boundary state
    this.setState({ hasError: false, error: undefined });

    // Reload the entire app
    DevSettings.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.handleRestart}
          title="Oops! Something went wrong"
          message="We're sorry for the inconvenience. The app encountered an unexpected error. Please restart the app to continue."
          showRetry={false}
          icon="alert-circle-outline"
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
