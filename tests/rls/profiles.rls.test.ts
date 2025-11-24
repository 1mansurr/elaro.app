import { createClient } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';
const client = createClient(url, anon);
const password = 'Test1234!';

describe('RLS: profiles self-visibility', () => {
  const u1 = `p_user1_${Date.now()}@test.com`;
  const u2 = `p_user2_${Date.now()}@test.com`;

  beforeAll(async () => {
    await client.auth.signUp({ email: u1, password });
    await client.auth.signUp({ email: u2, password });
  }, 30000);

  it('user1 cannot read user2 profile row', async () => {
    await client.auth.signInWithPassword({ email: u2, password });
    const { data: auth2 } = await client.auth.getUser();
    await client
      .from('profiles')
      .upsert({ id: auth2?.user?.id })
      .select()
      .single();

    await client.auth.signInWithPassword({ email: u1, password });
    const res = await client
      .from('profiles')
      .select('*')
      .eq('id', auth2?.user?.id);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  }, 30000);
});
