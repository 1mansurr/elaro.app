import { z } from 'zod';

export const VerifyTransactionSchema = z.object({
  reference: z.string().min(1, 'Transaction reference is required'),
});
