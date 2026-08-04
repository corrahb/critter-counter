/* ── small pieces: Eyebrow label + round step button ────────── */
import type { ReactNode } from "react";
import { C } from "../theme";

export const Eyebrow = ({ children, color = C.sage }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      font: "500 11px 'Azeret Mono', monospace",
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);

export function StepButton({
  onClick,
  children,
  tone = "quiet",
  label,
}: {
  onClick: () => void;
  children: ReactNode;
  tone?: "quiet" | "go";
  label: string;
}) {
  const isGo = tone === "go";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="tap"
      style={{
        width: isGo ? 54 : 42,
        height: isGo ? 54 : 42,
        borderRadius: 999,
        flexShrink: 0,
        border: `1.5px solid ${isGo ? "transparent" : C.sprig}`,
        background: isGo ? C.blossom : "transparent",
        color: isGo ? C.moss : C.sage,
        font: `500 ${isGo ? 27 : 20}px 'Karla', sans-serif`,
        lineHeight: 1,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}
