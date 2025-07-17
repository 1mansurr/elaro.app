// Paystack service for subscription management
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

if (!PAYSTACK_PUBLIC_KEY) {
  throw new Error('Missing Paystack configuration. Please check your .env file.');
}

export interface PaystackConfig {
  email: string;
  amount: number; // Amount in pesewas (GHS 5 = 500 pesewas)
  currency: string;
  plan?: string;
  callback_url?: string;
  metadata?: {
    user_id: string;
    subscription_type: string;
  };
}

export const paystackService = {
  // Initialize Paystack payment for Oddity subscription
  initializeOdditySubscription: async (userEmail: string, userId: string) => {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          amount: 500, // GHS 5.00 in pesewas
          currency: 'GHS',
          plan: 'PLN_1kpekg5eib9l2w8', // Your actual Oddity plan code
          callback_url: 'elaro://subscription-success', // Deep link back to app
          metadata: {
            user_id: userId,
            subscription_type: 'oddity',
            plan_name: 'Oddity Plan',
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Payment initialization failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  },

  // Open Oddity subscription payment page
  openOddityPayment: (userEmail: string) => {
    const paymentUrl = `https://paystack.shop/pay/p5hctw96n8?email=${encodeURIComponent(userEmail)}`;
    
    // For web, open in new window
    if (typeof window !== 'undefined') {
      window.open(paymentUrl, '_blank');
    }
    
    return paymentUrl;
  },

  // Verify payment
  verifyPayment: async (reference: string) => {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Payment verification failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  },

  // Get subscription details
  getSubscription: async (subscriptionCode: string) => {
    try {
      const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Subscription fetch failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack subscription fetch error:', error);
      throw error;
    }
  },

  // Handle subscription success (called when user returns to app)
  handleSubscriptionSuccess: async (reference: string, userId: string) => {
    try {
      // Verify the payment first
      const verification = await paystackService.verifyPayment(reference);
      
      if (verification.data.status === 'success') {
        // Import Supabase service
        const { authService } = await import('./supabase');
        
        // Update user subscription status in Supabase
        await authService.updateUserProfile(userId, { is_subscribed_to_oddity: true });
        
        return {
          success: true,
          message: 'Subscription activated successfully!',
          data: verification.data,
        };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Subscription success handling error:', error);
      return {
        success: false,
        message: 'Failed to activate subscription',
        error,
      };
    }
  },
};

// Predefined subscription configurations
export const SUBSCRIPTION_PLANS = {
  ODDITY: {
    name: 'Oddity Plan',
    amount: 500, // GHS 5.00 in pesewas
    interval: 'monthly',
    currency: 'GHS',
    plan_code: 'PLN_1kpekg5eib9l2w8', // Your actual plan code
    payment_link: 'https://paystack.shop/pay/p5hctw96n8',
    description: 'Unlock more study sessions, full AI guide access, and premium features',
  },
};

export default paystackService;

