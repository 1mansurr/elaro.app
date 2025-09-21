import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Linking, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../../constants/theme';

const SupportChatModal = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleWebViewMessage = (event: any) => {
    const message = event.nativeEvent.data;
    if (message === 'openEmail') {
      const emailUrl = `mailto:support@elaro.app?subject=Support Request&body=Hello, I need help with my ELARO app.`;
      Linking.openURL(emailUrl).catch(err => console.error('Failed to open email:', err));
    }
  };

  // Create Tawk.to integration with proper user data
  const propertyId = '685fb69800ff9419109c4db9';
  const widgetId = 'default';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tawk.to Chat</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f5f5f5;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          flex-direction: column;
          background-color: #f5f5f5;
        }
        .loading-text {
          margin-top: 10px;
          color: #666;
          font-size: 16px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2C5EFF;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="loading" id="loading">
        <div class="spinner"></div>
        <div class="loading-text">Loading chat...</div>
      </div>
      
      <script type="text/javascript">
        var Tawk_API = Tawk_API || {};
        var Tawk_LoadStart = new Date();
        
        // Set visitor information
        Tawk_API.visitor = {
          name: '${user?.name || 'App User'}',
          email: '${user?.email || ''}'
        };
        
        // Hide loading when Tawk loads
        Tawk_API.onLoad = function() {
          document.getElementById('loading').style.display = 'none';
        };
        
        // Load Tawk.to script
        (function() {
          var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
          s1.async = true;
          s1.src = 'https://embed.tawk.to/${propertyId}/${widgetId}';
          s1.setAttribute('crossorigin', '*');
          s0.parentNode.insertBefore(s1, s0);
        })();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Header with SafeAreaView */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>
      
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        mixedContentMode="compatibility"
        onMessage={handleWebViewMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error: ', nativeEvent);
        }}
        onLoadEnd={() => {
          console.log('Support WebView loaded successfully');
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              color="#2C5EFF"
              size="large"
            />
            <Text style={styles.loadingText}>Loading support...</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
    flex: 1,
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default SupportChatModal;
