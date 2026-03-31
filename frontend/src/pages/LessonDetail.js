import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import useAsyncData from "../hooks/useAsyncData";

export default function LessonDetail() {
  const { lessonId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizError, setQuizError] = useState("");
  const { data, setData, loading, error } = useAsyncData(
    async () => apiRequest("/api/learn/dashboard", { token }),
    [token]
  );

  const lessons = useMemo(() => data?.lessons || [], [data]);
  const lesson = useMemo(
    () => lessons.find((item) => item.id === lessonId) || null,
    [lessons, lessonId]
  );

  async function toggleComplete() {
    if (!lesson) {
      return;
    }

    const nextStatus =
      lesson.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";

    await apiRequest(`/api/learn/lessons/${lesson.id}/progress`, {
      token,
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });

    setQuizError("");
    setData((prev) => {
      const nextLessons = prev.lessons.map((item) =>
        item.id === lesson.id
          ? {
              ...item,
              status: nextStatus,
              quizUnlocked: nextStatus === "COMPLETED",
            }
          : item
      );
      const completedLessons = nextLessons.filter(
        (item) => item.status === "COMPLETED"
      ).length;

      return {
        ...prev,
        lessons: nextLessons,
        progress: {
          totalLessons: nextLessons.length,
          completedLessons,
          completionRate: nextLessons.length
            ? Number(((completedLessons / nextLessons.length) * 100).toFixed(2))
            : 0,
        },
      };
    });
  }

  async function openQuiz() {
    if (!lesson?.quizUnlocked) {
      setQuizError("Finish this class first to unlock the quiz.");
      setSelectedQuiz(null);
      return;
    }

    try {
      setQuizError("");
      const quiz = await apiRequest(`/api/learn/quizzes/${lesson.quizId}`, { token });
      setSelectedQuiz(quiz);
      setAnswers({});
      setQuizResult(null);
    } catch (loadError) {
      setQuizError(loadError.message || "Failed to open quiz");
      setSelectedQuiz(null);
    }
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
        <LoadingCard text="Opening class content..." />
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

  if (!lesson) {
    return (
      <MainLayout>
        <div className="card">
          <h2>Class not found</h2>
          <p className="text-muted">This class could not be found.</p>
          <Link to="/learn" style={backLinkStyle}>
            Back to Learning
          </Link>
        </div>
      </MainLayout>
    );
  }

  const contentSections = buildContentSections(lesson.content);

  return (
    <MainLayout>
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => navigate("/learn")} style={backButtonStyle}>
          Back to Classes
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
              {lesson.category} • {lesson.level}
            </div>
            <h1 className="page-title" style={{ marginBottom: 10 }}>
              {lesson.title}
            </h1>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.7, fontSize: 14 }}>
              {lesson.summary}
            </p>
          </div>

          <div className="card" style={{ minWidth: 240, background: "#0f172a" }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Lesson Status</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
              {lesson.status.replace("_", " ")}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
              Quiz is {lesson.quizUnlocked ? "unlocked" : "locked"}.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 0.9fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          <div className="card" style={{ background: "#0f172a", marginBottom: 16 }}>
            <h2>Class Contents</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {contentSections.map((section, index) => (
                <div key={section.title}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#38bdf8",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    Topic {index + 1}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                    {section.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "#cbd5e1",
                      lineHeight: 1.75,
                      fontSize: 14,
                    }}
                  >
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: "#0b1220" }}>
            <h2>Quiz Material</h2>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 }}>
              {buildStudyPoints(lesson).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="card" style={{ background: "#0f172a", marginBottom: 16 }}>
            <h2>Class Actions</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              Read the content on this page, review the quiz material, then mark the class complete.
            </p>

            <button onClick={toggleComplete} style={primaryActionStyle(lesson.status === "COMPLETED")}>
              {lesson.status === "COMPLETED"
                ? "Mark Class Incomplete"
                : "Mark Class Complete"}
            </button>

            <button
              onClick={openQuiz}
              disabled={!lesson.quizId || !lesson.quizUnlocked}
              style={quizButtonStyle(lesson.quizUnlocked)}
            >
              {lesson.quizUnlocked ? "Open Quiz" : "Quiz Locked"}
            </button>

            {quizError ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#fecaca",
                  background: "rgba(127, 29, 29, 0.24)",
                  border: "1px solid rgba(248, 113, 113, 0.25)",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                {quizError}
              </div>
            ) : null}
          </div>

          <div className="card" style={{ background: "#0b1220" }}>
            <h2>Completion Rules</h2>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 }}>
              <li>Open the class content page.</li>
              <li>Read the lesson sections.</li>
              <li>Review the quiz material.</li>
              <li>Mark the class complete to unlock the quiz.</li>
            </ul>
          </div>
        </div>
      </div>

      {selectedQuiz ? (
        <div className="card mt-16">
          <h2>{selectedQuiz.title}</h2>
          <p style={{ marginTop: 0, color: "#94a3b8", fontSize: 13 }}>
            Answer all questions after reviewing the class contents and quiz material.
          </p>

          {selectedQuiz.questions.map((question, index) => (
            <div
              key={question.id}
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 12,
                background: "#0f172a",
                border: "1px solid #1e293b",
              }}
            >
              <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                {index + 1}. {question.questionText}
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
                          ? "1px solid #38bdf8"
                          : "1px solid #334155",
                      background:
                        answers[question.id] === option
                          ? "rgba(14, 165, 233, 0.16)"
                          : "transparent",
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

function buildContentSections(content) {
  const pieces = String(content || "")
    .split(". ")
    .map((piece) => piece.trim())
    .filter(Boolean);

  return pieces.map((piece, index) => ({
    title:
      index === 0
        ? "Core Idea"
        : index === 1
          ? "Why It Matters"
          : index === 2
            ? "Practical Application"
            : `Key Concept ${index + 1}`,
    body: piece.endsWith(".") ? piece : `${piece}.`,
  }));
}

function buildStudyPoints(lesson) {
  return [
    `Definition: ${lesson.title} focuses on ${lesson.category.toLowerCase()}.`,
    `Level: This class is marked ${lesson.level} and should take about ${lesson.estimatedMinutes} minutes.`,
    `Remember this summary: ${lesson.summary}`,
    `Quiz unlock rule: you must mark the class complete before opening the quiz.`,
  ];
}

function primaryActionStyle(isComplete) {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: isComplete
      ? "linear-gradient(135deg, #475569, #334155)"
      : "linear-gradient(135deg, #22c55e, #15803d)",
    color: "#f8fafc",
    fontWeight: 700,
    marginBottom: 10,
  };
}

function quizButtonStyle(isUnlocked) {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #1e3a8a",
    cursor: isUnlocked ? "pointer" : "not-allowed",
    background: isUnlocked
      ? "linear-gradient(135deg, #0ea5e9, #2563eb)"
      : "rgba(30, 41, 59, 0.45)",
    color: "#f8fafc",
    fontWeight: 700,
    opacity: isUnlocked ? 1 : 0.7,
  };
}

const secondaryButtonStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  cursor: "pointer",
  background: "transparent",
  color: "#f9fafb",
  fontSize: 12,
};

const backButtonStyle = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "transparent",
  color: "#f8fafc",
  cursor: "pointer",
};

const backLinkStyle = {
  display: "inline-block",
  marginTop: 12,
  color: "#93c5fd",
};
