const asyncHandler = require("../utils/asyncHandler");
const lessonService = require("../services/lessonService");

const getLearningDashboard = asyncHandler(async (req, res) => {
  const dashboard = await lessonService.getLearningDashboard(req.user.id);
  res.json(dashboard);
});

const updateLessonProgress = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { status } = req.body;
  const result = await lessonService.markLessonProgress(req.user.id, lessonId, status);
  res.json(result);
});

const getQuiz = asyncHandler(async (req, res) => {
  try {
    const quiz = await lessonService.getQuiz(req.user.id, req.params.quizId);
    res.json(quiz);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    throw error;
  }
});

const submitQuizAttempt = asyncHandler(async (req, res) => {
  try {
    const result = await lessonService.submitQuizAttempt(
      req.user.id,
      req.params.quizId,
      req.body.answers
    );
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    throw error;
  }
});

module.exports = {
  getLearningDashboard,
  updateLessonProgress,
  getQuiz,
  submitQuizAttempt,
};
