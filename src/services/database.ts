import * as SQLite from 'expo-sqlite';

const DB_NAME = 'elaro.db';
const SCHEMA_VERSION = 1;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS courses (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    code        TEXT,
    color       TEXT,
    icon        TEXT,
    schedule    TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('assignment','lecture','study_session')),
    title           TEXT NOT NULL,
    description     TEXT,
    course_id       TEXT REFERENCES courses(id) ON DELETE SET NULL,
    due_date        TEXT,
    start_time      TEXT,
    end_time        TEXT,
    is_completed    INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    is_deleted      INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    metadata        TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at       TEXT
  );

  CREATE TABLE IF NOT EXISTS srs_items (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    task_id             TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    topic               TEXT NOT NULL,
    interval_days       INTEGER NOT NULL DEFAULT 1,
    ease_factor         REAL NOT NULL DEFAULT 2.5,
    repetitions         INTEGER NOT NULL DEFAULT 0,
    next_review_date    TEXT NOT NULL,
    last_reviewed_at    TEXT,
    last_quality_rating INTEGER,
    is_active           INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at           TEXT
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT NOT NULL,
    task_id               TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    srs_item_id           TEXT REFERENCES srs_items(id) ON DELETE CASCADE,
    expo_notification_id  TEXT,
    title                 TEXT NOT NULL,
    body                  TEXT NOT NULL,
    scheduled_time        TEXT NOT NULL,
    reminder_type         TEXT NOT NULL CHECK(reminder_type IN ('task_due','study_session','srs_review')),
    is_cancelled          INTEGER NOT NULL DEFAULT 0,
    fired_at              TEXT,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at             TEXT
  );

  CREATE TABLE IF NOT EXISTS templates (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT,
    task_type     TEXT NOT NULL CHECK(task_type IN ('assignment','lecture','study_session')),
    template_data TEXT NOT NULL,
    is_built_in   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS recurring_patterns (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    task_id         TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    frequency       TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
    interval_value  INTEGER NOT NULL DEFAULT 1,
    days_of_week    TEXT,
    day_of_month    INTEGER,
    end_date        TEXT,
    max_occurrences INTEGER,
    last_generated  TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_type         ON tasks(type);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_tasks_course       ON tasks(course_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_srs_next_review    ON srs_items(next_review_date) WHERE is_active = 1;
  CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_time) WHERE is_cancelled = 0;
`;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA);
  dbInstance = db;
  return db;
}
