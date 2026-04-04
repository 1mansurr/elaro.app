import { getDatabase } from '@/services/database';
import {
  BankWithCount,
  Bank,
  Quiz,
  Question,
  QuizAttempt,
  QuizStats,
} from '@/types';

// ─── Banks ────────────────────────────────────────────────────────────────────

export async function getBanks(userId: string): Promise<BankWithCount[]> {
  const db = await getDatabase();
  return db.getAllAsync<BankWithCount>(
    `SELECT b.id, b.user_id, b.name, b.created_at, b.updated_at, b.synced_at,
            COUNT(q.id) AS quiz_count
     FROM banks b
     LEFT JOIN quizzes q ON q.bank_id = b.id
     WHERE b.user_id = ?
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [userId],
  );
}

export async function createBank(data: {
  id: string;
  user_id: string;
  name: string;
}): Promise<Bank> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO banks (id, user_id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [data.id, data.user_id, data.name, now, now],
  );
  const row = await db.getFirstAsync<Bank>(
    `SELECT id, user_id, name, created_at, updated_at, synced_at
     FROM banks WHERE id = ?`,
    [data.id],
  );
  return row!;
}

export async function deleteBank(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM banks WHERE id = ?`, [id]);
}

// ─── Quizzes ──────────────────────────────────────────────────────────────────

export async function getQuizzes(userId: string): Promise<Quiz[]> {
  const db = await getDatabase();
  return db.getAllAsync<Quiz>(
    `SELECT id, user_id, bank_id, name, subject, color, total_questions,
            created_at, updated_at, synced_at
     FROM quizzes
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );
}

export async function getQuizzesByBank(bankId: string): Promise<Quiz[]> {
  const db = await getDatabase();
  return db.getAllAsync<Quiz>(
    `SELECT id, user_id, bank_id, name, subject, color, total_questions,
            created_at, updated_at, synced_at
     FROM quizzes
     WHERE bank_id = ?
     ORDER BY created_at DESC`,
    [bankId],
  );
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Quiz>(
    `SELECT id, user_id, bank_id, name, subject, color, total_questions,
            created_at, updated_at, synced_at
     FROM quizzes WHERE id = ?`,
    [id],
  );
}

export async function createQuiz(data: {
  id: string;
  user_id: string;
  bank_id: string | null;
  name: string;
  subject: string;
  color: string;
  total_questions: number;
}): Promise<Quiz> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO quizzes
       (id, user_id, bank_id, name, subject, color, total_questions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.user_id,
      data.bank_id,
      data.name,
      data.subject,
      data.color,
      data.total_questions,
      now,
      now,
    ],
  );
  const row = await db.getFirstAsync<Quiz>(
    `SELECT id, user_id, bank_id, name, subject, color, total_questions,
            created_at, updated_at, synced_at
     FROM quizzes WHERE id = ?`,
    [data.id],
  );
  return row!;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getQuestionsByQuiz(quizId: string): Promise<Question[]> {
  const db = await getDatabase();
  return db.getAllAsync<Question>(
    `SELECT id, quiz_id, position, question_text, option_a, option_b,
            option_c, option_d, correct_option, explanation, question_type,
            created_at, synced_at
     FROM questions
     WHERE quiz_id = ?
     ORDER BY position ASC`,
    [quizId],
  );
}

export async function createQuestion(data: {
  id: string;
  quiz_id: string;
  position: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  explanation: string;
  question_type: 'multiple_choice' | 'true_false';
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO questions
       (id, quiz_id, position, question_text, option_a, option_b,
        option_c, option_d, correct_option, explanation, question_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.quiz_id,
      data.position,
      data.question_text,
      data.option_a,
      data.option_b,
      data.option_c,
      data.option_d,
      data.correct_option,
      data.explanation,
      data.question_type,
      now,
    ],
  );
}

// ─── Quiz Attempts ────────────────────────────────────────────────────────────

export async function getAttemptsByQuiz(
  quizId: string,
): Promise<QuizAttempt[]> {
  const db = await getDatabase();
  return db.getAllAsync<QuizAttempt>(
    `SELECT id, user_id, quiz_id, score, total, percentage,
            is_retake, attempted_at, synced_at
     FROM quiz_attempts
     WHERE quiz_id = ?
     ORDER BY attempted_at DESC`,
    [quizId],
  );
}

export async function getMostRecentAttempt(
  quizId: string,
): Promise<QuizAttempt | null> {
  const db = await getDatabase();
  return db.getFirstAsync<QuizAttempt>(
    `SELECT id, user_id, quiz_id, score, total, percentage,
            is_retake, attempted_at, synced_at
     FROM quiz_attempts
     WHERE quiz_id = ?
     ORDER BY attempted_at DESC
     LIMIT 1`,
    [quizId],
  );
}

export async function getQuizStats(quizId: string): Promise<QuizStats> {
  const db = await getDatabase();
  const agg = await db.getFirstAsync<{
    total_attempts: number;
    best_percentage: number | null;
    avg_percentage: number | null;
  }>(
    `SELECT COUNT(*) AS total_attempts,
            MAX(percentage) AS best_percentage,
            AVG(percentage) AS avg_percentage
     FROM quiz_attempts
     WHERE quiz_id = ?`,
    [quizId],
  );

  if (!agg || agg.total_attempts === 0) {
    return {
      total_attempts: 0,
      best_score: 0,
      best_total: 0,
      best_percentage: 0,
      avg_percentage: 0,
    };
  }

  const best = await db.getFirstAsync<{ score: number; total: number }>(
    `SELECT score, total FROM quiz_attempts
     WHERE quiz_id = ?
     ORDER BY percentage DESC
     LIMIT 1`,
    [quizId],
  );

  return {
    total_attempts: agg.total_attempts,
    best_score: best?.score ?? 0,
    best_total: best?.total ?? 0,
    best_percentage: agg.best_percentage ?? 0,
    avg_percentage: agg.avg_percentage ?? 0,
  };
}

// ─── Attempt Answers ──────────────────────────────────────────────────────────

/**
 * Saves a quiz attempt and all its answers atomically.
 * Used at the end of a quiz session.
 */
export async function saveAttemptWithAnswers(
  attempt: {
    id: string;
    user_id: string;
    quiz_id: string;
    score: number;
    total: number;
    percentage: number;
    is_retake: number;
    attempted_at: string;
  },
  answers: Array<{
    id: string;
    question_id: string;
    selected_option: string | null;
    is_correct: number;
  }>,
): Promise<QuizAttempt> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO quiz_attempts
         (id, user_id, quiz_id, score, total, percentage, is_retake, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attempt.id,
        attempt.user_id,
        attempt.quiz_id,
        attempt.score,
        attempt.total,
        attempt.percentage,
        attempt.is_retake,
        attempt.attempted_at,
      ],
    );
    for (const a of answers) {
      await db.runAsync(
        `INSERT INTO attempt_answers
           (id, attempt_id, question_id, selected_option, is_correct)
         VALUES (?, ?, ?, ?, ?)`,
        [a.id, attempt.id, a.question_id, a.selected_option, a.is_correct],
      );
    }
  });

  const row = await db.getFirstAsync<QuizAttempt>(
    `SELECT id, user_id, quiz_id, score, total, percentage,
            is_retake, attempted_at, synced_at
     FROM quiz_attempts WHERE id = ?`,
    [attempt.id],
  );
  return row!;
}

export async function getWrongAnswerQuestionIds(
  attemptId: string,
): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ question_id: string }>(
    `SELECT question_id FROM attempt_answers
     WHERE attempt_id = ? AND is_correct = 0`,
    [attemptId],
  );
  return rows.map(r => r.question_id);
}
