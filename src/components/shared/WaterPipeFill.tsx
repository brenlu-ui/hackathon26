"use client";

import { useEffect, useRef, useState } from "react";

type WaterPipeFillProps = {
  liters: number;
  dailyCostUsd?: number;
  pricePerLiter?: number;
  savingsBoundaryRatio?: number;
  highBoundaryRatio?: number;
  benchmarkLiters?: number;
  benchmarkLabel?: string;
  subtitle?: string;
};

export function WaterPipeFill({
  liters,
  dailyCostUsd,
  pricePerLiter = 0.0015,
  savingsBoundaryRatio = 0.6,
  highBoundaryRatio = 0.9,
  benchmarkLiters = 1135,
  benchmarkLabel = "U.S. household daily average",
  subtitle = "Each log fills the pipe by predicted liters (quantity x liters per unit).",
}: WaterPipeFillProps) {
  const fillPercent = Math.min(100, Math.round((liters / benchmarkLiters) * 100));
  const previousLitersRef = useRef(fillPercent);
  const [flowActive, setFlowActive] = useState(false);

  useEffect(() => {
    if (fillPercent !== previousLitersRef.current) {
      previousLitersRef.current = fillPercent;
      setFlowActive(true);
      const timeout = setTimeout(() => setFlowActive(false), 900);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [fillPercent]);

  const currentLeft = Math.min(Math.max(fillPercent, 10), 90);
  const baselineDailyCost = benchmarkLiters * pricePerLiter;
  const savingsCostMax = baselineDailyCost * savingsBoundaryRatio;
  const highCostStart = baselineDailyCost * highBoundaryRatio;
  const savingsReached = fillPercent >= 1;
  const averageReached = fillPercent >= savingsBoundaryRatio * 100;
  const highReached = fillPercent >= highBoundaryRatio * 100;

  return (
    <div className="pipe-wrap">
      <p className="muted pipe-subtitle">{subtitle}</p>
      <div className="pipe-grid">
        <div className="pipe-scale">
          <span>Min usage: 0 L/day</span>
          <span>Max baseline: {benchmarkLiters.toLocaleString()} L/day</span>
        </div>
        <div className="pipe-meter">
          <div className={`pipe-zone zone-savings ${savingsReached ? "zone-lit" : ""}`} />
          <div className={`pipe-zone zone-average ${averageReached ? "zone-lit" : ""}`} />
          <div className={`pipe-zone zone-high ${highReached ? "zone-lit" : ""}`} />
          <div className="pipe-checkpoint" style={{ left: `${savingsBoundaryRatio * 100}%` }} />
          <div className="pipe-checkpoint" style={{ left: `${highBoundaryRatio * 100}%` }} />
          <div
            className={`pipe-fill ${flowActive ? "pipe-fill-boost" : ""}`}
            style={{ width: `${fillPercent}%` }}
          >
            <div className="pipe-wave wave-back" />
            <div className="pipe-wave wave-mid" />
            <div className="pipe-wave wave-front" />
            <div className="pipe-bubbles pipe-bubbles-a" />
            <div className="pipe-bubbles pipe-bubbles-b" />
          </div>
          <div className="pipe-marker marker-benchmark">Max baseline</div>
          <div
            className="pipe-marker marker-current"
            style={{ left: `${currentLeft}%` }}
          >
            Current level
          </div>
        </div>
        <div className="pipe-range-legend">
          <span className="range-pill saving">Savings: up to ${savingsCostMax.toFixed(2)}/day</span>
          <span className="range-pill average">
            Average: ${savingsCostMax.toFixed(2)}-${highCostStart.toFixed(2)}/day
          </span>
          <span className="range-pill high">High: above ${highCostStart.toFixed(2)}/day</span>
        </div>
      </div>
      <p className="pipe-value">~${(dailyCostUsd ?? 0).toFixed(2)}/day estimated</p>
      <p className="muted pipe-context">
        {liters.toFixed(2)} L/day ({fillPercent}% of {benchmarkLabel})
      </p>
      <style jsx>{`
        .pipe-wrap {
          width: 100%;
        }

        .pipe-subtitle {
          margin-top: 0.4rem;
          margin-bottom: 1rem;
        }

        .pipe-grid {
          display: grid;
          gap: 0.5rem;
          align-items: stretch;
        }

        .pipe-scale {
          display: flex;
          justify-content: space-between;
          color: var(--muted);
          font-size: 0.76rem;
          gap: 1rem;
        }

        .pipe-meter {
          position: relative;
          height: 110px;
          border-radius: 10px;
          border: 2px solid var(--pipe-meter-border);
          background: linear-gradient(180deg, var(--pipe-meter-bg-top) 0%, var(--pipe-meter-bg-bottom) 100%);
          overflow: hidden;
          box-shadow:
            inset 0 0 0 1px rgba(156, 206, 235, 0.18),
            inset 0 -12px 18px rgba(8, 24, 35, 0.5),
            0 10px 24px rgba(7, 27, 40, 0.35),
            0 0 20px var(--pipe-meter-glow);
        }

        .pipe-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 1;
          pointer-events: none;
          transition: filter 280ms ease, opacity 280ms ease, box-shadow 280ms ease;
        }

        .zone-savings {
          left: 0;
          width: ${savingsBoundaryRatio * 100}%;
          background: linear-gradient(180deg, rgba(58, 167, 99, 0.14) 0%, rgba(58, 167, 99, 0.08) 100%);
          opacity: 0.45;
        }

        .zone-average {
          left: ${savingsBoundaryRatio * 100}%;
          width: ${(highBoundaryRatio - savingsBoundaryRatio) * 100}%;
          background: linear-gradient(180deg, rgba(224, 161, 0, 0.17) 0%, rgba(224, 161, 0, 0.09) 100%);
          opacity: 0.4;
        }

        .zone-high {
          left: ${highBoundaryRatio * 100}%;
          width: ${(1 - highBoundaryRatio) * 100}%;
          background: linear-gradient(180deg, rgba(194, 55, 58, 0.2) 0%, rgba(194, 55, 58, 0.12) 100%);
          opacity: 0.38;
        }

        .pipe-zone.zone-lit {
          opacity: 0.95;
          filter: saturate(1.2) brightness(1.12);
          animation: zonePulse 1.6s ease-in-out infinite;
        }

        .zone-savings.zone-lit {
          box-shadow: inset 0 0 18px rgba(73, 208, 126, 0.28);
        }

        .zone-average.zone-lit {
          box-shadow: inset 0 0 18px rgba(234, 179, 23, 0.28);
        }

        .zone-high.zone-lit {
          box-shadow: inset 0 0 20px rgba(220, 66, 69, 0.32);
        }

        .pipe-checkpoint {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          z-index: 3;
          transform: translateX(-50%);
          background: rgba(196, 232, 255, 0.72);
          box-shadow: 0 0 0 1px rgba(8, 28, 44, 0.45);
          pointer-events: none;
        }

        .pipe-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 2;
          background: linear-gradient(180deg, var(--pipe-fill-top) 0%, var(--pipe-fill-mid) 60%, var(--pipe-fill-bottom) 100%);
          box-shadow:
            inset 0 8px 16px var(--pipe-fill-highlight),
            inset 0 -12px 16px rgba(9, 58, 93, 0.36),
            0 0 12px var(--pipe-fill-glow);
          transition: width 500ms ease;
          overflow: hidden;
        }

        .pipe-fill-boost {
          filter: saturate(1.08) brightness(1.03);
        }

        .pipe-wave {
          position: absolute;
          left: 0;
          right: 0;
          background-repeat: repeat-x;
          background-size: 136px 100%;
          background-position: 0 0;
          animation: waveShift 8s linear infinite, waveBob 3.5s ease-in-out infinite;
        }

        .wave-back {
          top: -18px;
          height: 38px;
          background-image:
            radial-gradient(40px 24px at 34px 100%, rgba(133, 210, 244, 0.3) 98%, transparent 100%),
            radial-gradient(40px 24px at 102px 100%, rgba(133, 210, 244, 0.25) 98%, transparent 100%);
          animation-duration: 9s, 3.9s;
        }

        .wave-mid {
          top: -12px;
          height: 34px;
          background-image:
            radial-gradient(44px 26px at 34px 100%, rgba(118, 204, 243, 0.46) 98%, transparent 100%),
            radial-gradient(44px 26px at 102px 100%, rgba(118, 204, 243, 0.4) 98%, transparent 100%);
          animation-duration: 7.6s, 3.3s;
        }

        .wave-front {
          top: -8px;
          height: 30px;
          background-image:
            radial-gradient(46px 28px at 34px 100%, rgba(142, 221, 252, 0.54) 98%, transparent 100%),
            radial-gradient(46px 28px at 102px 100%, rgba(142, 221, 252, 0.46) 98%, transparent 100%);
          animation-duration: 6.5s, 2.8s;
        }

        .pipe-bubbles {
          position: absolute;
          inset: 0;
          opacity: 0;
        }

        .pipe-bubbles-a {
          background:
            radial-gradient(circle at 18% 86%, rgba(154, 224, 255, 0.56) 0 3px, transparent 3px),
            radial-gradient(circle at 45% 92%, rgba(154, 224, 255, 0.42) 0 4px, transparent 4px),
            radial-gradient(circle at 76% 88%, rgba(154, 224, 255, 0.5) 0 3px, transparent 3px);
          animation: bubbleRise 6.2s linear infinite, bubbleFade 6.2s linear infinite;
        }

        .pipe-bubbles-b {
          background:
            radial-gradient(circle at 30% 94%, rgba(154, 224, 255, 0.48) 0 5px, transparent 5px),
            radial-gradient(circle at 64% 90%, rgba(154, 224, 255, 0.45) 0 4px, transparent 4px),
            radial-gradient(circle at 84% 96%, rgba(154, 224, 255, 0.35) 0 6px, transparent 6px);
          animation: bubbleRiseAlt 8s linear infinite, bubbleFadeAlt 8s linear infinite;
        }

        .pipe-marker {
          position: absolute;
          top: 6px;
          padding: 0.2rem 0.45rem;
          border: 1px solid var(--pipe-marker-border);
          border-radius: 4px;
          font-size: 0.7rem;
          line-height: 1.2;
          color: var(--pipe-marker-text);
          background: var(--pipe-marker-bg);
          z-index: 4;
          transform: translateX(-50%);
          white-space: nowrap;
          max-width: calc(100% - 10px);
        }

        .marker-benchmark {
          right: 8px;
          left: auto;
          transform: none;
        }

        .marker-current {
          top: 70px;
          color: var(--pipe-current-text);
          border: 2px solid var(--pipe-current-border);
          font-weight: 700;
        }

        .pipe-value {
          text-align: center;
          margin-top: 0.8rem;
          font-weight: 800;
          color: var(--pipe-value-text);
          font-size: 1.05rem;
        }

        .pipe-context {
          text-align: center;
          margin-top: 0.25rem;
          font-size: 0.84rem;
        }

        .pipe-range-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.45rem;
        }

        .range-pill {
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: 999px;
          padding: 0.14rem 0.45rem;
          border: 1px solid transparent;
        }

        .range-pill.saving {
          color: #1f8f4e;
          background: rgba(58, 167, 99, 0.14);
          border-color: rgba(58, 167, 99, 0.35);
        }

        .range-pill.average {
          color: #a87800;
          background: rgba(224, 161, 0, 0.15);
          border-color: rgba(224, 161, 0, 0.35);
        }

        .range-pill.high {
          color: #c2373a;
          background: rgba(194, 55, 58, 0.14);
          border-color: rgba(194, 55, 58, 0.35);
        }

        @keyframes waveShift {
          from {
            background-position-x: 0;
          }
          to {
            background-position-x: 136px;
          }
        }

        @keyframes waveBob {
          0%,
          100% {
            margin-top: 0;
          }
          50% {
            margin-top: -4px;
          }
        }

        @keyframes bubbleRise {
          from {
            transform: translateY(18%);
          }
          to {
            transform: translateY(-24%);
          }
        }

        @keyframes bubbleRiseAlt {
          from {
            transform: translate(4%, 22%);
          }
          to {
            transform: translate(-4%, -26%);
          }
        }

        @keyframes bubbleFade {
          0% {
            opacity: 0;
          }
          24% {
            opacity: 0.78;
          }
          72% {
            opacity: 0.78;
          }
          88% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes bubbleFadeAlt {
          0% {
            opacity: 0;
          }
          28% {
            opacity: 0.68;
          }
          68% {
            opacity: 0.68;
          }
          86% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes zonePulse {
          0%,
          100% {
            filter: saturate(1.15) brightness(1.06);
          }
          50% {
            filter: saturate(1.28) brightness(1.18);
          }
        }
      `}</style>
    </div>
  );
}
