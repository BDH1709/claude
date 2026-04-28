"use client";

import { useState } from "react";
import { Globe, EyeOff } from "lucide-react";
import { PublishState } from "@/types";

interface PublishToggleProps {
  section: keyof PublishState;
  initialState: boolean;
}

export function PublishToggle({ section, initialState }: PublishToggleProps) {
  const [published, setPublished] = useState(initialState);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: !published }),
      });
      if (res.ok) setPublished(!published);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded border transition-all"
      style={
        published
          ? { borderColor: "#f77f00", color: "#f77f00" }
          : { borderColor: "#1e2d3d", color: "#768390" }
      }
    >
      {published ? <Globe className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {published ? "Published" : "Private"}
    </button>
  );
}
