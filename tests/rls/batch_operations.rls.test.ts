import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';

describe('RLS: Batch Operations Permissions', () => {
  const client = createClient(url, anon);

  const user1Email = `user1_${Date.now()}@test.com`;
  const user2Email = `user2_${Date.now()}@test.com`;
  const password = 'Test1234!';
  let user1Id: string | undefined;
  let user2Id: string | undefined;

  async function signUp(email: string) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  }

  beforeAll(async () => {
    const u1 = await signUp(user1Email);
    const u2 = await signUp(user2Email);
    user1Id = u1?.id;
    user2Id = u2?.id;
  }, 30000);

  describe('Batch DELETE permissions', () => {
    it('user1 cannot batch delete user2 assignments', async () => {
      // user2 creates assignments
      await client.auth.signInWithPassword({ email: user2Email, password });
      const currentUserRes2 = await client.auth.getUser();

      const assignment1 = await client
        .from('assignments')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          title: 'u2-assignment-1',
          course_id: '00000000-0000-0000-0000-000000000000', // Dummy course
          due_date: new Date().toISOString(),
        })
        .select()
        .single();

      const assignment2 = await client
        .from('assignments')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          title: 'u2-assignment-2',
          course_id: '00000000-0000-0000-0000-000000000000',
          due_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (assignment1.error) throw assignment1.error;
      if (assignment2.error) throw assignment2.error;

      // user1 tries to batch delete user2's assignments
      await client.auth.signInWithPassword({ email: user1Email, password });

      const deleteRes1 = await client
        .from('assignments')
        .delete()
        .eq('id', assignment1.data.id)
        .select();

      const deleteRes2 = await client
        .from('assignments')
        .delete()
        .eq('id', assignment2.data.id)
        .select();

      // Should either return error or empty result
      expect(deleteRes1.data).toEqual([]);
      expect(deleteRes2.data).toEqual([]);

      // Verify assignments still exist (user2 can still see them)
      await client.auth.signInWithPassword({ email: user2Email, password });
      const check1 = await client
        .from('assignments')
        .select('*')
        .eq('id', assignment1.data.id)
        .single();

      const check2 = await client
        .from('assignments')
        .select('*')
        .eq('id', assignment2.data.id)
        .single();

      expect(check1.data).toBeDefined();
      expect(check2.data).toBeDefined();
    }, 30000);

    it('user can batch delete their own assignments', async () => {
      await client.auth.signInWithPassword({ email: user1Email, password });
      const currentUserRes = await client.auth.getUser();

      const assignment1 = await client
        .from('assignments')
        .insert({
          user_id: currentUserRes.data.user?.id,
          title: 'my-assignment-1',
          course_id: '00000000-0000-0000-0000-000000000000',
          due_date: new Date().toISOString(),
        })
        .select()
        .single();

      const assignment2 = await client
        .from('assignments')
        .insert({
          user_id: currentUserRes.data.user?.id,
          title: 'my-assignment-2',
          course_id: '00000000-0000-0000-0000-000000000000',
          due_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (assignment1.error) throw assignment1.error;
      if (assignment2.error) throw assignment2.error;

      // Batch delete own assignments
      const deleteRes1 = await client
        .from('assignments')
        .delete()
        .eq('id', assignment1.data.id)
        .select();

      const deleteRes2 = await client
        .from('assignments')
        .delete()
        .eq('id', assignment2.data.id)
        .select();

      expect(deleteRes1.error).toBeNull();
      expect(deleteRes2.error).toBeNull();
      expect(deleteRes1.data).toBeDefined();
      expect(deleteRes2.data).toBeDefined();
    }, 30000);
  });

  describe('Batch RESTORE permissions', () => {
    it('user1 cannot batch restore user2 soft-deleted assignments', async () => {
      // user2 creates and soft-deletes assignments
      await client.auth.signInWithPassword({ email: user2Email, password });
      const currentUserRes2 = await client.auth.getUser();

      const assignment = await client
        .from('assignments')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          title: 'u2-assignment-to-delete',
          course_id: '00000000-0000-0000-0000-000000000000',
          due_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (assignment.error) throw assignment.error;

      // Soft delete
      await client
        .from('assignments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', assignment.data.id);

      // user1 tries to restore
      await client.auth.signInWithPassword({ email: user1Email, password });

      const restoreRes = await client
        .from('assignments')
        .update({ deleted_at: null })
        .eq('id', assignment.data.id)
        .select();

      // Should either return error or empty result
      if (restoreRes.error) {
        expect(restoreRes.error.code).toBe('42501'); // Insufficient privilege
      } else {
        expect(restoreRes.data).toEqual([]);
      }
    }, 30000);
  });
});
