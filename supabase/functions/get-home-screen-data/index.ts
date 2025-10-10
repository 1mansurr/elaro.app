import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';

// The core business logic for fetching home screen data
async function handleGetHomeScreenData({ user, supabaseClient }: AuthenticatedRequest) {
  console.log(`Fetching home screen data for user: ${user.id}`);

  const { data, error } = await supabaseClient.rpc('get_home_screen_data_for_user', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error calling get_home_screen_data_for_user RPC:', error);
    throw new AppError('Failed to fetch home screen data.', 500, 'RPC_ERROR');
  }

  console.log('Successfully fetched home screen data.');
  
  // The RPC function returns the data in the exact JSON format we need.
  return data;
}

// Wrap the business logic with our secure, generic handler
serve(createAuthenticatedHandler(
  handleGetHomeScreenData,
  {
    rateLimitName: 'get-home-screen-data',
    // No schema needed for a GET request with no body
    // No task limit check needed for a read operation
  }
));
