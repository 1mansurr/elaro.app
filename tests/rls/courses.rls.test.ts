import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';

describe('RLS: courses permissions', () => {
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

  describe('READ permissions', () => {
    it('user1 cannot see user2 courses', async () => {
      // sign in user2, create course
      await client.auth.signInWithPassword({ email: user2Email, password });
      const currentUserRes2 = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          course_name: 'u2-course',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      // sign in user1, try to read user2 course
      await client.auth.signInWithPassword({ email: user1Email, password });
      const rowsRes = await client
        .from('courses')
        .select('*')
        .eq('id', createdRes.data.id);

      expect(rowsRes.error).toBeNull();
      expect(rowsRes.data).toEqual([]);
    }, 30000);

    it('user can see their own courses', async () => {
      await client.auth.signInWithPassword({ email: user1Email, password });
      const currentUserRes = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes.data.user?.id,
          course_name: 'my-course',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      const rowsRes = await client
        .from('courses')
        .select('*')
        .eq('id', createdRes.data.id)
        .single();

      expect(rowsRes.error).toBeNull();
      expect(rowsRes.data).toBeDefined();
      expect(rowsRes.data?.id).toBe(createdRes.data.id);
    }, 30000);
  });

  describe('UPDATE permissions', () => {
    it('user1 cannot update user2 courses', async () => {
      // user2 creates course
      await client.auth.signInWithPassword({ email: user2Email, password });
      const currentUserRes2 = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          course_name: 'u2-course',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      // user1 tries to update
      await client.auth.signInWithPassword({ email: user1Email, password });
      const updateRes = await client
        .from('courses')
        .update({ course_name: 'hacked' })
        .eq('id', createdRes.data.id)
        .select();

      // Should either return error or empty result
      if (updateRes.error) {
        expect(updateRes.error.code).toBe('42501'); // Insufficient privilege
      } else {
        expect(updateRes.data).toEqual([]);
      }
    }, 30000);

    it('user can update their own courses', async () => {
      await client.auth.signInWithPassword({ email: user1Email, password });
      const currentUserRes = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes.data.user?.id,
          course_name: 'original-name',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      const updateRes = await client
        .from('courses')
        .update({ course_name: 'updated-name' })
        .eq('id', createdRes.data.id)
        .select()
        .single();

      expect(updateRes.error).toBeNull();
      expect(updateRes.data?.course_name).toBe('updated-name');
    }, 30000);
  });

  describe('DELETE permissions', () => {
    it('user1 cannot delete user2 courses', async () => {
      // user2 creates course
      await client.auth.signInWithPassword({ email: user2Email, password });
      const currentUserRes2 = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          course_name: 'u2-course',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      // user1 tries to delete
      await client.auth.signInWithPassword({ email: user1Email, password });
      const deleteRes = await client
        .from('courses')
        .delete()
        .eq('id', createdRes.data.id)
        .select();

      // Should either return error or empty result
      if (deleteRes.error) {
        expect(deleteRes.error.code).toBe('42501'); // Insufficient privilege
      } else {
        expect(deleteRes.data).toEqual([]);
      }

      // Verify course still exists (user2 can still see it)
      await client.auth.signInWithPassword({ email: user2Email, password });
      const verifyRes = await client
        .from('courses')
        .select('*')
        .eq('id', createdRes.data.id)
        .single();
      expect(verifyRes.error).toBeNull();
      expect(verifyRes.data).toBeDefined();
    }, 30000);

    it('user can delete their own courses', async () => {
      await client.auth.signInWithPassword({ email: user1Email, password });
      const currentUserRes = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes.data.user?.id,
          course_name: 'to-delete',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      const deleteRes = await client
        .from('courses')
        .delete()
        .eq('id', createdRes.data.id)
        .select();

      expect(deleteRes.error).toBeNull();
      expect(deleteRes.data).toBeDefined();
    }, 30000);
  });

  describe('Soft delete visibility', () => {
    it('soft-deleted courses are not visible to other users', async () => {
      // user2 creates course
      await client.auth.signInWithPassword({ email: user2Email, password });
      const currentUserRes2 = await client.auth.getUser();
      const createdRes = await client
        .from('courses')
        .insert({
          user_id: currentUserRes2.data.user?.id,
          course_name: 'u2-course',
        })
        .select()
        .single();
      if (createdRes.error) throw createdRes.error;

      // user2 soft-deletes it
      const softDeleteRes = await client
        .from('courses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', createdRes.data.id);
      if (softDeleteRes.error) throw softDeleteRes.error;

      // user1 tries to read it (should not see it)
      await client.auth.signInWithPassword({ email: user1Email, password });
      const rowsRes = await client
        .from('courses')
        .select('*')
        .eq('id', createdRes.data.id);

      expect(rowsRes.error).toBeNull();
      expect(rowsRes.data).toEqual([]);
    }, 30000);
  });

  describe('Unauthenticated access', () => {
    it('unauthenticated user cannot access courses', async () => {
      await client.auth.signOut();

      const rowsRes = await client.from('courses').select('*');

      // Should either return error or empty result
      if (rowsRes.error) {
        expect(rowsRes.error.code).toBe('42501'); // Insufficient privilege
      } else {
        expect(rowsRes.data).toEqual([]);
      }
    }, 30000);
  });
});
