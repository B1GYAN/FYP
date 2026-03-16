import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import useAsyncData from "../hooks/useAsyncData";

export default function Learning() {
  const { token } = useAuth();
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const { data, setData, loading, error } = useAsyncData(
    async () => apiRequest("/api/learn/dashboard", { token }),
    [token]
  );

  async function toggleComplete(lesson) {
    const nextStatus =
      lesson.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";

    await apiRequest(`/api/learn/lessons/${lesson.id}/progress`, {
      token,
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });

    setData((prev) => {
      const lessons = prev.lessons.map((item) =>
        item.id === lesson.id ? { ...item, status: nextStatus } : item
      );
      const completedLessons = lessons.filter(
        (item) => item.status === "COMPLETED"
      ).length;

      return {
        ...prev,
        lessons,
        progress: {
          totalLessons: lessons.length,
          completedLessons,
          completionRate: lessons.length
            ? Number(((completedLessons / lessons.length) * 100).toFixed(2))
            : 0,
        },
      };
    });
  }

  async function openQuiz(quizId) {
    const quiz = await apiRequest(`/api/learn/quizzes/${quizId}`, { token });
    setSelectedQuiz(quiz);
    setAnswers({});
    setQuizResult(null);
  }

  async function submitQuiz() {
    const result = await apiRequest(
      `/api/learn/quizzes/${selectedQuiz.id}/attempts`,
      {
        token,
        method: "POST",
        body: JSON.stringify({ answers }),
      }
    );

    setQuizResult(result);
  }

  if (loading) {
    return (
      <MainLayout>
        <LoadingCard text="Loading lessons and recommendations..." />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="card" style={{ color: "#fecaca" }}>
          {error}
        </div>
      </MainLayout>
    );
  }

  const lessons = data.lessons;
  const progress = Math.round(data.progress.completionRate);

  return (
    <MainLayout>
      <h1 className="page-title">Learning Module — Lessons & Quizzes</h1>
      <p className="page-subtitle">
        Structured learning content adapts to trading behavior and reinforces
        risk management discipline.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Your Progress</h2>
        <p style={{ marginBottom: 8, fontSize: 13 }}>
          {data.progress.completedLessons} of {data.progress.totalLessons} lessons
          completed ({progress}%)
        </p>
        <div
          style={{
            width: "100%",
            height: 10,
            background: "#1f2937",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#22c55e",
            }}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Adaptive Recommendations</h2>
        {data.recommendations.length === 0 ? (
          <p className="text-muted">
            No recommendations yet. As you trade, the system will suggest lessons
            based on recurring behavior patterns.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
            {data.recommendations.map((item) => (
              <li key={item.id}>
                {item.reason}
                {item.lesson ? ` Recommended lesson: ${item.lesson.title}.` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Lesson Library</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Lesson</th>
              <th>Level</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Quiz</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>
                  <div>{lesson.title}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {lesson.summary}
                  </div>
                </td>
                <td>{lesson.level}</td>
                <td>{lesson.status.replace("_", " ")}</td>
                <td>
                  <button
                    onClick={() => toggleComplete(lesson)}
                    style={lessonButtonStyle(lesson.status === "COMPLETED")}
                  >
                    {lesson.status === "COMPLETED"
                      ? "Mark Incomplete"
                      : "Mark Complete"}
                  </button>
                </td>
                <td>
                  {lesson.quizId ? (
                    <button
                      onClick={() => openQuiz(lesson.quizId)}
                      style={secondaryButtonStyle}
                    >
                      Open Quiz
                    </button>
                  ) : (
                    <span className="text-muted">No quiz</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedQuiz ? (
        <div className="card mt-16">
          <h2>{selectedQuiz.title}</h2>
          {selectedQuiz.questions.map((question) => (
            <div key={question.id} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 14 }}>
                {question.questionText}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {question.answerOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: option,
                      }))
                    }
                    style={{
                      ...secondaryButtonStyle,
                      border:
                        answers[question.id] === option
                          ? "1px solid #7c3aed"
                          : "1px solid #374151",
                      background:
                        answers[question.id] === option ? "#2a1e45" : "transparent",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button className="auth-button" onClick={submitQuiz}>
            Submit Quiz
          </button>

          {quizResult ? (
            <p style={{ marginTop: 12, fontSize: 13 }}>
              Score: <strong>{quizResult.scorePercent}%</strong> (
              {quizResult.correctCount}/{quizResult.totalQuestions})
            </p>
          ) : null}
        </div>
      ) : null}
    </MainLayout>
  );
}

function lessonButtonStyle(isComplete) {
  return {
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: isComplete ? "#4b5563" : "#7c3aed",
    color: "#f9fafb",
    fontSize: 12,
  };
}

const secondaryButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #312949",
  cursor: "pointer",
  background: "transparent",
  color: "#f9fafb",
  fontSize: 12,
};
