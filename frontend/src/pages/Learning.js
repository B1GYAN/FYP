import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import useAsyncData from "../hooks/useAsyncData";

export default function Learning() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useAsyncData(
    async () => apiRequest("/api/learn/dashboard", { token }),
    [token]
  );

  const lessons = useMemo(() => data?.lessons || [], [data]);

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

  const progress = Math.round(data.progress.completionRate);

  return (
    <MainLayout>
      <h1 className="page-title">Learning Module - Classes</h1>
      <p className="page-subtitle">
        Open a class to view its full contents on a separate page, then complete it to unlock the quiz.
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
        <h2>Class Library</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: 14,
                background: "#0f172a",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                    Class {index + 1} • {lesson.category} • {lesson.level}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                    {lesson.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                    {lesson.summary}
                  </div>
                </div>

                <div style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={statusBadgeStyle(lesson.status)}>
                    {lesson.status.replace("_", " ")}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/learn/lessons/${lesson.id}`)}
                    style={openClassButtonStyle}
                  >
                    Open Class Content
                  </button>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {lesson.estimatedMinutes} min • Quiz {lesson.quizUnlocked ? "unlocked" : "locked"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

function statusBadgeStyle(status) {
  const map = {
    COMPLETED: {
      background: "rgba(34, 197, 94, 0.15)",
      color: "#86efac",
    },
    IN_PROGRESS: {
      background: "rgba(245, 158, 11, 0.16)",
      color: "#fcd34d",
    },
    NOT_STARTED: {
      background: "rgba(71, 85, 105, 0.25)",
      color: "#cbd5e1",
    },
  };

  const colors = map[status] || map.NOT_STARTED;

  return {
    display: "inline-block",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: colors.background,
    color: colors.color,
  };
}

const openClassButtonStyle = {
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid #1e3a8a",
  cursor: "pointer",
  background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
  color: "#f8fafc",
  fontWeight: 700,
};
