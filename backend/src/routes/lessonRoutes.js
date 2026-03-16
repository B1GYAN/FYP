const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  getLearningDashboard,
  updateLessonProgress,
  getQuiz,
  submitQuizAttempt,
} = require("../controllers/lessonController");

const router = express.Router();

router.use(requireAuth);
router.get("/dashboard", getLearningDashboard);
router.patch("/lessons/:lessonId/progress", updateLessonProgress);
router.get("/quizzes/:quizId", getQuiz);
router.post("/quizzes/:quizId/attempts", submitQuizAttempt);

module.exports = router;
