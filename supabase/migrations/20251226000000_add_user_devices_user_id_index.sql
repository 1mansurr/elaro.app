-- Migration: Add index on user_id for user_devices table
-- Purpose: Improve performance of queries filtering by user_id
-- Date: 2025-12-26

-- Check if index already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_devices'
      AND indexname = 'idx_user_devices_user_id'
  ) THEN
    CREATE INDEX "idx_user_devices_user_id" 
    ON "public"."user_devices" 
    USING "btree" ("user_id");
    
    COMMENT ON INDEX "public"."idx_user_devices_user_id" IS 
      'Improves performance of queries filtering by user_id. Optimizes device registration and lookup operations.';
  END IF;
END $$;

