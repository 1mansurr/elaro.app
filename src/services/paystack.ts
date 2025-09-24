export const paystackService = {
  openOddityPayment: (email: string) => {
    console.warn('paystackService.openOddityPayment is not implemented');
    return '';
  },
  handleSubscriptionSuccess: async (data: any) => {
    console.warn('paystackService.handleSubscriptionSuccess is not implemented');
    return { success: false };
  },
};

export const SUBSCRIPTION_PLANS = {
  ODDITY: 'ODDITY_PLAN',
};
