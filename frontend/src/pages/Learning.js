// src/pages/Learning.js
import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";

const initialLessons = [
  { id: 1, title: "Intro to Markets", level: "Beginner", completed: false },
  {
    id: 2,
    title: "Risk Management Basics",
    level: "Beginner",
    completed: false,
  },
  {
    id: 3,
    title: "Technical Analysis 101",
    level: "Intermediate",
    completed: false,
  },
  {
    id: 4,
    title: "Paper Trading Strategies",
    level: "Intermediate",
    completed: false,
  },
];

export default function Learning() {
  const [lessons, setLessons] = useState(initialLessons);

  const total = lessons.length;
  const completed = lessons.filter((l) => l.completed).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  function toggleComplete(id) {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, completed: !l.completed } : l
      )
    );
  }

  return (
    <MainLayout>
      <h1 className="page-title">Learning Module — Lessons & Quizzes</h1>
      <p className="page-subtitle">
        Structured learning path to help new traders build confidence
        before trading with real money.
      </p>

      {/* Progress card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Your Progress</h2>
        <p style={{ marginBottom: 8, fontSize: 13 }}>
          {completed} of {total} lessons completed ({progress}%)
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

      {/* Lessons table */}
      <div className="card">
        <h2>Lesson Library</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Lesson</th>
              <th>Level</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td>{l.level}</td>
                <td>{l.completed ? "Completed" : "Not started"}</td>
                <td>
                  <button
                    onClick={() => toggleComplete(l.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: l.completed
                        ? "#4b5563"
                        : "#7c3aed",
                      color: "#f9fafb",
                      fontSize: 12,
                    }}
                  >
                    {l.completed ? "Mark Incomplete" : "Mark Complete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted" style={{ marginTop: 8, fontSize: 11 }}>
          Quizzes and multimedia content can be mapped to each lesson in later
          milestones.
        </p>
      </div>
    </MainLayout>
  );
}
