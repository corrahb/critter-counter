/* Phase 0 placeholder — replaced by the real port in phase 2. */
export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0E1F17",
        color: "#F0EBDA",
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🐇</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>Critter Counter</div>
        <div style={{ color: "#7FA08D", fontSize: 14, marginTop: 8 }}>
          Scaffold OK — the real app arrives in phase 2.
        </div>
      </div>
    </div>
  );
}
