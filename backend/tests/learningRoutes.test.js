jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/lessonService", () => ({
  getLearningDashboard: jest.fn(() =>
    Promise.resolve({
      progress: {
        totalLessons: 4,
        completedLessons: 2,
        completionRate: 50,
      },
      recommendations: [
        {
          id: "rec-1",
          recommendationType: "LESSON",
          reason: "Frequent trading suggests overtrading. Review risk management.",
          lesson: {
            id: "lesson-1",
            title: "Risk Management Basics",
          },
        },
      ],
      lessons: [
        {
          id: "lesson-1",
          title: "Risk Management Basics",
          status: "IN_PROGRESS",
          quizId: "quiz-1",
        },
      ],
    })
  ),
  markLessonProgress: jest.fn(() => Promise.resolve({ success: true })),
  getQuiz: jest.fn(() =>
    Promise.resolve({
      id: "quiz-1",
      lessonId: "lesson-1",
      title: "Risk Management Basics Quiz",
      questions: [],
    })
  ),
  submitQuizAttempt: jest.fn(() =>
    Promise.resolve({
      quizId: "quiz-1",
      scorePercent: 100,
      correctCount: 1,
      totalQuestions: 1,
    })
  ),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");

describe("learning routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns learning dashboard for authenticated user", async () => {
    const token = jwt.sign(
      { sub: "user-1", email: "bigyan@example.com" },
      "papertrade-dev-secret"
    );

    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "user-1",
          full_name: "Bigyan Lama",
          email: "bigyan@example.com",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const response = await request(app)
      .get("/api/learn/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.progress.totalLessons).toBe(4);
    expect(response.body.recommendations).toHaveLength(1);
  });
});
