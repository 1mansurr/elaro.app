import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const VerifyTransactionSchema = z.object({
  reference: z.string().min(1, 'Transaction reference is required'),
});
