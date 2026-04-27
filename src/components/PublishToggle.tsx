"use client";

import { useState } from "react";
import { Globe, EyeOff } from "lucide-react";
import { PublishState } from "@/types";
import clsx from "clsx";

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
      if (res.ok) {
        setPublished(!published);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={clsx(
        "flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded border transition-all",
        published
          ? "border-accent-green text-accent-green hover:bg-accent-green hover:text-bg-primary"
          : "border-border text-text-muted hover:border-text-secondary hover:text-text-secondary"
      )}
      title={published ? "Click to make private" : "Click to publish publicly"}
    >
      {published ? (
        <>
          <Globe className="w-3 h-3" />
          Published
        </>
      ) : (
        <>
          <EyeOff className="w-3 h-3" />
          Private
        </>
      )}
    </button>
  );
}
