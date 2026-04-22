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
const env = require("../src/config/env");
const lessonService = require("../src/services/lessonService");

function createAuthToken() {
  return jwt.sign({ sub: "user-1", email: "bigyan@example.com" }, env.jwtSecret);
}

function mockAuthenticatedUser(subscriptionTier = "PREMIUM") {
  db.query.mockResolvedValueOnce({
    rowCount: 1,
    rows: [
      {
        id: "user-1",
        full_name: "Bigyan Lama",
        email: "bigyan@example.com",
        subscription_tier: subscriptionTier,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
}

describe("learning routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns learning dashboard for authenticated user", async () => {
    const token = createAuthToken();
    mockAuthenticatedUser();

    const response = await request(app)
      .get("/api/learn/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.progress.totalLessons).toBe(4);
    expect(response.body.recommendations).toHaveLength(1);
  });

  test("blocks standard users from the learning dashboard", async () => {
    const token = createAuthToken();
    mockAuthenticatedUser("STANDARD");

    const response = await request(app)
      .get("/api/learn/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/Premium/i);
  });

  test("updates lesson progress for a premium user", async () => {
    const token = createAuthToken();
    mockAuthenticatedUser();

    const response = await request(app)
      .patch("/api/learn/lessons/lesson-1/progress")
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "COMPLETED",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(lessonService.markLessonProgress).toHaveBeenCalledWith(
      "user-1",
      "lesson-1",
      "COMPLETED"
    );
  });

  test("loads a quiz for a premium user", async () => {
    const token = createAuthToken();
    mockAuthenticatedUser();

    const response = await request(app)
      .get("/api/learn/quizzes/quiz-1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe("quiz-1");
    expect(response.body.lessonId).toBe("lesson-1");
    expect(lessonService.getQuiz).toHaveBeenCalledWith("user-1", "quiz-1");
  });

  test("submits a quiz attempt for a premium user", async () => {
    const token = createAuthToken();
    const answers = {
      "question-1": "A",
    };

    mockAuthenticatedUser();

    const response = await request(app)
      .post("/api/learn/quizzes/quiz-1/attempts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        answers,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      quizId: "quiz-1",
      scorePercent: 100,
      correctCount: 1,
      totalQuestions: 1,
    });
    expect(lessonService.submitQuizAttempt).toHaveBeenCalledWith(
      "user-1",
      "quiz-1",
      answers
    );
  });
});
