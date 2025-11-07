import React, { ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  featureName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class FeatureErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error tracking service
    console.error(
      `FeatureErrorBoundary caught an error in ${this.props.featureName || 'a feature'}:`,
      error,
      errorInfo,
    );

    // Track error if errorTracking is available
    try {
      const { errorTracking } = require('@/services/errorTracking');
      errorTracking.captureError(error, {
        componentStack: errorInfo.componentStack,
        featureName: this.props.featureName,
        errorBoundary: 'FeatureErrorBoundary',
      });
    } catch (e) {
      // Error tracking not available, continue silently
    }
  }

  resetError = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.resetError}
          retry={this.resetError}
          title="Oops!"
          message={`Something went wrong with ${this.props.featureName || 'this feature'}.`}
          showRetry={true}
          icon="warning-outline"
        />
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
