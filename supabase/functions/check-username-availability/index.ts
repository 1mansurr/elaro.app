import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { CheckUsernameSchema } from '../_shared/schemas/user.ts';

async function handleCheckUsername({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { username } = body;

  console.log(`Checking username availability for: ${username}`);

  const { data, error } = await supabaseClient
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', user.id); // Exclude the current user from the check

  if (error) {
    throw new AppError(error.message, 500, 'DB_CHECK_ERROR');
  }

  const isAvailable = data.length === 0;
  
  console.log(`Username "${username}" is ${isAvailable ? 'available' : 'taken'}.`);
  
  return { isAvailable };
}

serve(createAuthenticatedHandler(
  handleCheckUsername,
  {
    rateLimitName: 'check-username',
    schema: CheckUsernameSchema,
    // No task limit check needed for this operation
  }
));
