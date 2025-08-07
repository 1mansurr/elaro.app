import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PaystackPaymentProps {
  email: string;
  amount: number; // in GHS (not pesewas)
  publicKey: string;
  onSuccess: (reference: string) => void;
  onCancel?: () => void;
}

const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  email,
  amount,
  publicKey,
  onSuccess,
  onCancel,
}) => {
  const htmlContent = `
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body onload="payWithPaystack()">
        <script src="https://js.paystack.co/v1/inline.js"></script>
        <script>
          function payWithPaystack(){
            var handler = PaystackPop.setup({
              key: '${publicKey}',
              email: '${email}',
              amount: ${amount} * 100,
              currency: 'GHS',
              callback: function(response){
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', reference: response.reference }));
              },
              onClose: function(){
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
              }
            });
            handler.openIframe();
          }
        </script>
      </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: htmlContent }}
      javaScriptEnabled
      onMessage={event => {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.status === 'success') {
          onSuccess(data.reference);
        } else if (data.status === 'cancelled') {
          onCancel && onCancel();
        }
      }}
      startInLoadingState
      renderLoading={() => (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      )}
    />
  );
};

export default PaystackPayment;
