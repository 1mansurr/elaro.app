import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { VerifyTransactionSchema } from '../_shared/schemas/payment.ts';

async function handleVerifyTransaction({ user, body }: AuthenticatedRequest) {
  const { reference } = body;
  
  // FIX: Use the correct, private secret key
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackSecretKey) {
    throw new AppError('Payment system not configured.', 500, 'CONFIG_ERROR');
  }

  console.log(`Verifying transaction ${reference} for user ${user.id}`);

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${paystackSecretKey}` },
  });

  if (!response.ok) {
    throw new AppError('Failed to communicate with payment provider.', response.status, 'PAYMENT_PROVIDER_ERROR');
  }

  const responseData = await response.json();

  if (responseData.status && responseData.data.status === 'success') {
    console.log(`Transaction ${reference} verified successfully.`);
    return { verified: true };
  } else {
    console.warn(`Transaction ${reference} verification failed:`, responseData.message);
    throw new AppError(`Transaction verification failed: ${responseData.message}`, 400, 'VERIFICATION_FAILED');
  }
}

serve(createAuthenticatedHandler(
  handleVerifyTransaction,
  {
    rateLimitName: 'verify-transaction',
    schema: VerifyTransactionSchema,
  }
));
