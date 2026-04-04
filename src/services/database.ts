import * as SQLite from 'expo-sqlite';

const DB_NAME = 'elaro.db';
const SCHEMA_VERSION = 6;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS courses (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    code          TEXT,
    about_course  TEXT,
    color         TEXT,
    icon          TEXT,
    schedule      TEXT,
    deleted_at    TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS task_types (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT 'ellipse-outline',
    fields      TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('assignment','lecture','study_session','custom')),
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
    task_type_id    TEXT REFERENCES task_types(id) ON DELETE SET NULL,
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

  CREATE TABLE IF NOT EXISTS banks (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    bank_id         TEXT REFERENCES banks(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    subject         TEXT NOT NULL,
    color           TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at       TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    id             TEXT PRIMARY KEY,
    quiz_id        TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    position       INTEGER NOT NULL,
    question_text  TEXT NOT NULL,
    option_a       TEXT NOT NULL,
    option_b       TEXT NOT NULL,
    option_c       TEXT,
    option_d       TEXT,
    correct_option TEXT NOT NULL,
    explanation    TEXT NOT NULL,
    question_type  TEXT NOT NULL CHECK(question_type IN ('multiple_choice','true_false')),
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    synced_at      TEXT
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    quiz_id      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score        INTEGER NOT NULL,
    total        INTEGER NOT NULL,
    percentage   REAL NOT NULL,
    is_retake    INTEGER NOT NULL DEFAULT 0,
    attempted_at TEXT NOT NULL,
    synced_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS attempt_answers (
    id              TEXT PRIMARY KEY,
    attempt_id      TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option TEXT,
    is_correct      INTEGER NOT NULL DEFAULT 0,
    synced_at       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_type         ON tasks(type);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_tasks_course       ON tasks(course_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_srs_next_review    ON srs_items(next_review_date) WHERE is_active = 1;
  CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_time) WHERE is_cancelled = 0;
  CREATE INDEX IF NOT EXISTS idx_quizzes_bank       ON quizzes(bank_id);
  CREATE INDEX IF NOT EXISTS idx_questions_quiz     ON questions(quiz_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_quiz      ON quiz_attempts(quiz_id);
  CREATE INDEX IF NOT EXISTS idx_answers_attempt    ON attempt_answers(attempt_id);
`;

export interface HomeTaskRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  metadata: string | null;
  task_type_id: string | null;
}

export interface CalendarTaskRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date_key: string | null;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  task_type_id: string | null;
}

export interface DeletedTaskRow {
  id: string;
  type: string;
  title: string;
  deleted_at: string | null;
  task_type_id: string | null;
}

export interface TaskTypeRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  fields: string; // JSON string
  created_at: string;
  updated_at: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion === 0) {
    // Fresh install — create all tables
    await db.execAsync(SCHEMA);
  } else if (currentVersion < SCHEMA_VERSION) {
    if (currentVersion < 2) {
      await db.runAsync('ALTER TABLE courses ADD COLUMN about_course TEXT');
      await db.runAsync('ALTER TABLE courses ADD COLUMN deleted_at TEXT');
    }
    if (currentVersion < 3) {
      // Create task_types table (without icon — added in v4 migration)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS task_types (
          id          TEXT PRIMARY KEY,
          user_id     TEXT NOT NULL,
          name        TEXT NOT NULL,
          color       TEXT NOT NULL,
          fields      TEXT NOT NULL DEFAULT '[]',
          created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
      `);

      // SQLite cannot ALTER a CHECK constraint — recreate tasks table with
      // 'custom' added to the type CHECK and task_type_id column added.
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync(`
        CREATE TABLE tasks_new (
          id              TEXT PRIMARY KEY,
          user_id         TEXT NOT NULL,
          type            TEXT NOT NULL CHECK(type IN ('assignment','lecture','study_session','custom')),
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
          task_type_id    TEXT REFERENCES task_types(id) ON DELETE SET NULL,
          created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          synced_at       TEXT
        );
      `);
      await db.execAsync(`
        INSERT INTO tasks_new
          (id, user_id, type, title, description, course_id, due_date,
           start_time, end_time, is_completed, completed_at, is_deleted,
           deleted_at, metadata, task_type_id, created_at, updated_at, synced_at)
        SELECT
          id, user_id, type, title, description, course_id, due_date,
          start_time, end_time, is_completed, completed_at, is_deleted,
          deleted_at, metadata, NULL, created_at, updated_at, synced_at
        FROM tasks;
      `);
      await db.execAsync('DROP TABLE tasks;');
      await db.execAsync('ALTER TABLE tasks_new RENAME TO tasks;');
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // Recreate indexes
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_tasks_type     ON tasks(type);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE is_deleted = 0;
        CREATE INDEX IF NOT EXISTS idx_tasks_course   ON tasks(course_id) WHERE is_deleted = 0;
      `);
    }
    if (currentVersion < 5) {
      // Add icon column to task_types if it doesn't already exist.
      // Some installs were stamped v4 before this migration was written,
      // so we check pragma_table_info first to avoid a "duplicate column" error.
      const hasIcon = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('task_types') WHERE name='icon'`,
      );
      if (!hasIcon || hasIcon.count === 0) {
        await db.runAsync(
          `ALTER TABLE task_types ADD COLUMN icon TEXT NOT NULL DEFAULT 'ellipse-outline'`,
        );
      }
    }
    if (currentVersion < 6) {
      // Defensive: some installs were stamped at v5 before the icon column
      // was included in SCHEMA, so they skipped the < 5 migration entirely.
      // Re-run the check here to catch them.
      const hasIconV6 = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('task_types') WHERE name='icon'`,
      );
      if (!hasIconV6 || hasIconV6.count === 0) {
        await db.runAsync(
          `ALTER TABLE task_types ADD COLUMN icon TEXT NOT NULL DEFAULT 'ellipse-outline'`,
        );
      }
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS banks (
          id         TEXT PRIMARY KEY,
          user_id    TEXT NOT NULL,
          name       TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          synced_at  TEXT
        );
        CREATE TABLE IF NOT EXISTS quizzes (
          id              TEXT PRIMARY KEY,
          user_id         TEXT NOT NULL,
          bank_id         TEXT REFERENCES banks(id) ON DELETE SET NULL,
          name            TEXT NOT NULL,
          subject         TEXT NOT NULL,
          color           TEXT NOT NULL,
          total_questions INTEGER NOT NULL,
          created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          synced_at       TEXT
        );
        CREATE TABLE IF NOT EXISTS questions (
          id             TEXT PRIMARY KEY,
          quiz_id        TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
          position       INTEGER NOT NULL,
          question_text  TEXT NOT NULL,
          option_a       TEXT NOT NULL,
          option_b       TEXT NOT NULL,
          option_c       TEXT,
          option_d       TEXT,
          correct_option TEXT NOT NULL,
          explanation    TEXT NOT NULL,
          question_type  TEXT NOT NULL CHECK(question_type IN ('multiple_choice','true_false')),
          created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          synced_at      TEXT
        );
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id           TEXT PRIMARY KEY,
          user_id      TEXT NOT NULL,
          quiz_id      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
          score        INTEGER NOT NULL,
          total        INTEGER NOT NULL,
          percentage   REAL NOT NULL,
          is_retake    INTEGER NOT NULL DEFAULT 0,
          attempted_at TEXT NOT NULL,
          synced_at    TEXT
        );
        CREATE TABLE IF NOT EXISTS attempt_answers (
          id              TEXT PRIMARY KEY,
          attempt_id      TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
          question_id     TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          selected_option TEXT,
          is_correct      INTEGER NOT NULL DEFAULT 0,
          synced_at       TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_quizzes_bank    ON quizzes(bank_id);
        CREATE INDEX IF NOT EXISTS idx_questions_quiz  ON questions(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_attempts_quiz   ON quiz_attempts(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_answers_attempt ON attempt_answers(attempt_id);
      `);
    }
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  dbInstance = db;
  return db;
}

// ─── Home / Upcoming queries ──────────────────────────────────────────────────

export async function getTodaysTasks(): Promise<HomeTaskRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<HomeTaskRow>(
    `SELECT id, type, title, description, due_date, start_time, end_time, metadata, task_type_id
     FROM tasks
     WHERE date(due_date, 'localtime') = date('now', 'localtime')
       AND datetime(due_date) > datetime('now')
       AND is_deleted = 0
       AND type IN ('assignment', 'study_session', 'custom')
     ORDER BY due_date ASC`,
  );
}

export async function getUpcomingTasks(): Promise<HomeTaskRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<HomeTaskRow>(
    `SELECT id, type, title, description, due_date, start_time, end_time, metadata, task_type_id
     FROM tasks
     WHERE date(due_date, 'localtime') > date('now', 'localtime')
       AND date(due_date, 'localtime') <= date('now', '+7 days', 'localtime')
       AND is_deleted = 0
       AND type IN ('assignment', 'study_session', 'custom')
     ORDER BY due_date ASC`,
  );
}

// ─── Calendar queries ─────────────────────────────────────────────────────────

export async function getTasksForDate(
  dateStr: string,
): Promise<CalendarTaskRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<CalendarTaskRow>(
    `SELECT id, type, title, description,
            date(CASE WHEN type = 'lecture' THEN start_time ELSE due_date END, 'localtime') AS date_key,
            CASE WHEN type = 'lecture' THEN start_time ELSE due_date END AS task_date,
            start_time, end_time, task_type_id
     FROM tasks
     WHERE is_deleted = 0
       AND is_completed = 0
       AND date(CASE WHEN type = 'lecture' THEN start_time ELSE due_date END, 'localtime') = ?
     ORDER BY CASE WHEN type = 'lecture' THEN start_time ELSE due_date END ASC`,
    [dateStr],
  );
}

export async function getTasksForMonth(
  year: number,
  month: number,
): Promise<CalendarTaskRow[]> {
  const db = await getDatabase();
  const yearStr = String(year);
  const monthStr = String(month + 1).padStart(2, '0');
  return db.getAllAsync<CalendarTaskRow>(
    `SELECT id, type, title, description,
            date(CASE WHEN type = 'lecture' THEN start_time ELSE due_date END, 'localtime') AS date_key,
            CASE WHEN type = 'lecture' THEN start_time ELSE due_date END AS task_date,
            start_time, end_time, task_type_id
     FROM tasks
     WHERE is_deleted = 0
       AND is_completed = 0
       AND strftime('%Y', CASE WHEN type = 'lecture' THEN start_time ELSE due_date END, 'localtime') = ?
       AND strftime('%m', CASE WHEN type = 'lecture' THEN start_time ELSE due_date END, 'localtime') = ?
     ORDER BY CASE WHEN type = 'lecture' THEN start_time ELSE due_date END ASC`,
    [yearStr, monthStr],
  );
}

// ─── Recycle bin ──────────────────────────────────────────────────────────────

export async function getDeletedTasks(): Promise<DeletedTaskRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<DeletedTaskRow>(
    `SELECT id, type, title, deleted_at, task_type_id
     FROM tasks
     WHERE is_deleted = 1
     ORDER BY deleted_at DESC`,
  );
}

// ─── Task mutations ───────────────────────────────────────────────────────────

export async function completeTask(taskId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET is_completed = 1, completed_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, taskId],
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, taskId],
  );
}

export async function restoreTask(taskId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?`,
    [now, taskId],
  );
}

export async function deleteTasksByTypeId(taskTypeId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ?
     WHERE task_type_id = ? AND is_deleted = 0`,
    [now, now, taskTypeId],
  );
}

// ─── task_types CRUD ─────────────────────────────────────────────────────────

export async function getTaskTypes(): Promise<TaskTypeRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<TaskTypeRow>(
    `SELECT id, user_id, name, color, icon, fields, created_at, updated_at
     FROM task_types
     ORDER BY created_at ASC`,
  );
}

export async function createTaskType(data: {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  fields: string;
}): Promise<TaskTypeRow> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO task_types (id, user_id, name, color, icon, fields, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.user_id,
      data.name,
      data.color,
      data.icon,
      data.fields,
      now,
      now,
    ],
  );
  const row = await db.getFirstAsync<TaskTypeRow>(
    `SELECT id, user_id, name, color, icon, fields, created_at, updated_at FROM task_types WHERE id = ?`,
    [data.id],
  );
  return row!;
}

export async function updateTaskType(
  id: string,
  data: { name?: string; color?: string; icon?: string; fields?: string },
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const values: string[] = [now];
  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.color !== undefined) {
    sets.push('color = ?');
    values.push(data.color);
  }
  if (data.icon !== undefined) {
    sets.push('icon = ?');
    values.push(data.icon);
  }
  if (data.fields !== undefined) {
    sets.push('fields = ?');
    values.push(data.fields);
  }
  values.push(id);
  await db.runAsync(
    `UPDATE task_types SET ${sets.join(', ')} WHERE id = ?`,
    values,
  );
}

export async function deleteTaskType(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM task_types WHERE id = ?`, [id]);
}

// ─── Custom task insert ───────────────────────────────────────────────────────

export async function createCustomTask(data: {
  id: string;
  user_id: string;
  task_type_id: string;
  title: string;
  description: string;
  due_date: string;
  metadata: string;
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO tasks
       (id, user_id, type, title, description, due_date, metadata, task_type_id, created_at, updated_at)
     VALUES (?, ?, 'custom', ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.user_id,
      data.title,
      data.description,
      data.due_date,
      data.metadata,
      data.task_type_id,
      now,
      now,
    ],
  );
}

export async function updateCustomTask(
  id: string,
  data: {
    title: string;
    description: string;
    due_date: string;
    metadata: string;
  },
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET title = ?, description = ?, due_date = ?, metadata = ?, updated_at = ?
     WHERE id = ? AND type = 'custom'`,
    [data.title, data.description, data.due_date, data.metadata, now, id],
  );
}
