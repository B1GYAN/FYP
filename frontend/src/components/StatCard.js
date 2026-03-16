
export default function StatCard({ label, value, note }) {
  const isPositive = note && note.trim().startsWith("+");

  return (
    <div className="card">
      <div
        style={{
          fontSize: "13px",
          color: "#cbd5f5",
          marginBottom: "6px",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#ffffff",
        }}
      >
        {value}
      </div>

      {note && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "12px",
            fontWeight: 500,
            color: isPositive ? "#22c55e" : "#f87171",
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}
