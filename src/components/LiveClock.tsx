"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  const ss = time.getSeconds().toString().padStart(2, "0");
  const date = time.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-right select-none">
      <div
        className="font-mono font-bold leading-none"
        style={{
          fontSize: "2.5rem",
          color: "#58a6ff",
          textShadow: "0 0 20px rgba(88,166,255,0.5), 0 0 40px rgba(88,166,255,0.2)",
        }}
      >
        {hh}
        <span
          style={{
            animation: "blink 1s step-end infinite",
            display: "inline-block",
          }}
        >
          :
        </span>
        {mm}
        <span
          className="font-mono font-normal"
          style={{ fontSize: "1.2rem", color: "#768390", marginLeft: "4px" }}
        >
          {ss}
        </span>
      </div>
      <div className="font-mono text-xs text-text-muted mt-1 tracking-wider">
        {date}
      </div>
    </div>
  );
}
