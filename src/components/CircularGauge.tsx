"use client";

import { useEffect, useState } from "react";

interface CircularGaugeProps {
  value: number;
  label: string;
  displayValue?: string;
  size?: number;
  strokeWidth?: number;
  warn?: number;
  danger?: number;
  color?: string;
}

export function CircularGauge({
  value,
  label,
  displayValue,
  size = 130,
  strokeWidth = 8,
  warn = 70,
  danger = 85,
  color,
}: CircularGaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(Math.min(100, Math.max(0, value))), 100);
    return () => clearTimeout(t);
  }, [value]);

  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Arc spans 270° (from 135° to 405°)
  const startAngle = 135;
  const totalAngle = 270;
  const circumference = (totalAngle / 360) * 2 * Math.PI * r;
  const offset = circumference * (1 - animated / 100);

  const gaugeColor = color || (
    value >= danger ? "#f85149" :
    value >= warn   ? "#f77f00" :
    "#58a6ff"
  );

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackEnd = startAngle + totalAngle;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Track */}
          <path
            d={describeArc(startAngle, trackEnd)}
            fill="none"
            stroke="#1e2d3d"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={describeArc(startAngle, trackEnd)}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.3s",
              filter: `drop-shadow(0 0 6px ${gaugeColor}88)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className="font-mono font-bold leading-none"
            style={{
              fontSize: size * 0.18,
              color: gaugeColor,
              textShadow: `0 0 12px ${gaugeColor}88`,
            }}
          >
            {displayValue ?? `${Math.round(value)}%`}
          </span>
        </div>
      </div>

      <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
