export default function LoadingCard({ text = "Loading..." }) {
  return (
    <div className="card" style={{ color: "#9ca3af", fontSize: 13 }}>
      {text}
    </div>
  );
}
