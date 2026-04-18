"use client";

import { useEffect, useRef, useState } from "react";

type WaterPipeFillProps = {
  liters: number;
  benchmarkLiters?: number;
  benchmarkLabel?: string;
  subtitle?: string;
};

export function WaterPipeFill({
  liters,
  benchmarkLiters = 1135,
  benchmarkLabel = "U.S. household daily average",
  subtitle = "Each log fills the pipe by predicted liters (quantity x liters per unit).",
}: WaterPipeFillProps) {
  const fillPercent = Math.min(100, Math.round((liters / benchmarkLiters) * 100));
  const previousLitersRef = useRef(liters);
  const [flowActive, setFlowActive] = useState(false);

  useEffect(() => {
    if (liters !== previousLitersRef.current) {
      previousLitersRef.current = liters;
      setFlowActive(true);
      const timeout = setTimeout(() => setFlowActive(false), 900);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [liters]);

  return (
    <div style={{ width: "100%" }}>
      <p className="muted" style={{ marginTop: "0.4rem", marginBottom: "1rem" }}>
        {subtitle}
      </p>
      <div
        style={{
          height: 24,
          width: "100%",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--background)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className={`pipe-fill ${flowActive ? "pipe-fill-boost" : ""}`}
          style={{
            width: `${fillPercent}%`,
            height: "100%",
            background: "linear-gradient(90deg, #78beff 0%, #3f97f2 40%, #1f7ae0 100%)",
            transition: "width 500ms ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div className="pipe-flow-band" />
        </div>
        {flowActive ? <div className="pipe-shimmer" /> : null}
      </div>
      <p style={{ textAlign: "center", marginTop: "0.8rem", fontWeight: 700 }}>
        {liters.toFixed(2)} L logged ({fillPercent}% of {benchmarkLabel}: {benchmarkLiters.toLocaleString()} L)
      </p>
      <style jsx>{`
        .pipe-shimmer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.35) 45%,
            rgba(255, 255, 255, 0) 75%
          );
          transform: translateX(-100%);
          animation: shimmerAcross 0.85s ease-out;
        }
        .pipe-flow-band {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.08) 0px,
            rgba(255, 255, 255, 0.08) 8px,
            rgba(255, 255, 255, 0.24) 8px,
            rgba(255, 255, 255, 0.24) 16px
          );
          background-size: 200% 100%;
          animation: flowBand 2.2s linear infinite;
        }
        .pipe-fill-boost .pipe-flow-band {
          animation-duration: 0.7s;
        }
        @keyframes shimmerAcross {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes flowBand {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 160% 0%;
          }
        }
      `}</style>
    </div>
  );
}
