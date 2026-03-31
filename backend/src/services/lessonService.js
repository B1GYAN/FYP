const db = require("../../db");
const learningService = require("./learningService");

async function listLessons(userId) {
  const result = await db.query(
    `
      SELECT
        l.id,
        l.slug,
        l.title,
        l.category,
        l.level,
        l.summary,
        l.content,
        l.estimated_minutes,
        q.id AS quiz_id,
        lp.status,
        lp.completed_at
      FROM lessons l
      LEFT JOIN quizzes q ON q.lesson_id = l.id
      LEFT JOIN lesson_progress lp
        ON lp.lesson_id = l.id
       AND lp.user_id = $1
      ORDER BY l.created_at
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    level: row.level,
    summary: row.summary,
    content: row.content,
    estimatedMinutes: row.estimated_minutes,
    quizId: row.quiz_id,
    status: row.status || "NOT_STARTED",
    completedAt: row.completed_at,
    quizUnlocked: (row.status || "NOT_STARTED") === "COMPLETED",
  }));
}

async function markLessonProgress(userId, lessonId, status) {
  const completedAt = status === "COMPLETED" ? new Date().toISOString() : null;

  await db.query(
    `
      INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at
    `,
    [userId, lessonId, status, completedAt]
  );

  return { success: true };
}

async function getLessonStatusForQuiz(userId, quizId) {
  const result = await db.query(
    `
      SELECT
        q.id,
        q.lesson_id,
        COALESCE(lp.status, 'NOT_STARTED') AS lesson_status
      FROM quizzes q
      LEFT JOIN lesson_progress lp
        ON lp.lesson_id = q.lesson_id
       AND lp.user_id = $1
      WHERE q.id = $2
    `,
    [userId, quizId]
  );

  if (result.rowCount === 0) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function listQuizzesForLesson(lessonId) {
  const result = await db.query(
    `
      SELECT id, title
      FROM quizzes
      WHERE lesson_id = $1
      ORDER BY created_at
    `,
    [lessonId]
  );

  return result.rows;
}

async function getQuiz(userId, quizId) {
  const lessonStatus = await getLessonStatusForQuiz(userId, quizId);

  if (lessonStatus.lesson_status !== "COMPLETED") {
    const error = new Error("Complete the lesson content before opening this quiz");
    error.statusCode = 403;
    throw error;
  }

  const quizResult = await db.query(
    `
      SELECT id, lesson_id, title
      FROM quizzes
      WHERE id = $1
    `,
    [quizId]
  );

  if (quizResult.rowCount === 0) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    throw error;
  }

  const questionResult = await db.query(
    `
      SELECT id, question_text, answer_options, explanation, sort_order
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY sort_order
    `,
    [quizId]
  );

  return {
    id: quizResult.rows[0].id,
    lessonId: quizResult.rows[0].lesson_id,
    title: quizResult.rows[0].title,
    questions: questionResult.rows.map((row) => ({
      id: row.id,
      questionText: row.question_text,
      answerOptions: row.answer_options,
      explanation: row.explanation,
    })),
  };
}

async function submitQuizAttempt(userId, quizId, answers) {
  const quiz = await getQuiz(userId, quizId);
  const answerMap = answers || {};
  let correctCount = 0;

  const correctResult = await db.query(
    `
      SELECT id, correct_answer
      FROM quiz_questions
      WHERE quiz_id = $1
    `,
    [quizId]
  );

  for (const question of correctResult.rows) {
    if (answerMap[question.id] === question.correct_answer) {
      correctCount += 1;
    }
  }

  const totalQuestions = correctResult.rowCount;
  const scorePercent = totalQuestions === 0 ? 0 : (correctCount / totalQuestions) * 100;

  await db.query(
    `
      INSERT INTO quiz_attempts (user_id, quiz_id, score_percent, answers)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [userId, quizId, scorePercent, JSON.stringify(answerMap)]
  );

  if (scorePercent >= 60) {
    await markLessonProgress(userId, quiz.lessonId, "COMPLETED");
  }

  return {
    quizId,
    scorePercent: Number(scorePercent.toFixed(2)),
    correctCount,
    totalQuestions,
  };
}

async function getLearningDashboard(userId) {
  const lessons = await listLessons(userId);
  const recommendations = await learningService.getRecommendations(userId);
  const completedCount = lessons.filter((lesson) => lesson.status === "COMPLETED").length;

  return {
    progress: {
      totalLessons: lessons.length,
      completedLessons: completedCount,
      completionRate: lessons.length
        ? Number(((completedCount / lessons.length) * 100).toFixed(2))
        : 0,
    },
    recommendations,
    lessons,
  };
}

module.exports = {
  listLessons,
  markLessonProgress,
  listQuizzesForLesson,
  getQuiz,
  submitQuizAttempt,
  getLearningDashboard,
};
