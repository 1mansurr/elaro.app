-- Create quiz-imports storage bucket for AI question import
-- Used by the extract-questions Edge Function.
--
-- The Edge Function uploads files here (client), downloads them
-- using the service role key, processes with Claude, then deletes.
--
-- Run this file against your Supabase project after creating the bucket
-- via Supabase Dashboard: Storage → Create Bucket → quiz-imports (private).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-imports',
  'quiz-imports',
  false,
  null,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Allow any anonymous user to upload files into this bucket.
-- The Edge Function uses the service role key (bypasses RLS) to
-- download and delete. Anonymous users cannot read or delete.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'anon_upload_quiz_imports'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_upload_quiz_imports"
      ON storage.objects FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'quiz-imports')
    $policy$;
  END IF;
END;
$$;
