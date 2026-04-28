"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Shield } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(searchParams.get("from") || "/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Access denied");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url('/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-bg-primary bg-opacity-70" />

      {/* Scan line */}
      <div className="scan-overlay" />

      {/* Grid overlay */}
      <div className="absolute inset-0 hex-grid opacity-40" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm px-4 animate-fade-in-up">
        <div className="jarvis-card rounded-lg p-8 glow-blue">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-accent-blue mb-4 glow-blue"
              style={{ background: "rgba(88,166,255,0.08)" }}>
              <Shield className="w-6 h-6 text-accent-blue" />
            </div>
            <div className="font-mono text-xs text-text-muted tracking-[0.3em] uppercase mb-1">
              System Access
            </div>
            <h1 className="font-mono text-xl font-bold text-accent-blue text-glow-blue tracking-wide">
              BDH1709.COM
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="status-dot online" />
              <span className="font-mono text-xs text-text-muted">System online</span>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border-bright opacity-40" />
            <span className="font-mono text-xs text-text-muted">AUTHENTICATE</span>
            <div className="flex-1 h-px bg-border-bright opacity-40" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access code"
                  autoFocus
                  required
                  className="w-full bg-bg-secondary border border-border rounded px-4 py-3 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors font-mono tracking-widest"
                  style={{ caretColor: "#58a6ff" }}
                />
              </div>
            </div>

            {error && (
              <div className="font-mono text-xs text-accent-red bg-bg-secondary border border-accent-red border-opacity-30 rounded px-3 py-2 flex items-center gap-2">
                <span className="status-dot offline shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full font-mono text-sm font-semibold py-3 rounded border border-accent-blue text-accent-blue transition-all hover:bg-accent-blue hover:text-bg-primary disabled:opacity-40 disabled:cursor-not-allowed tracking-widest uppercase"
              style={{ textShadow: "none" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Authorizing
                </span>
              ) : (
                "Authorize"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center font-mono text-xs text-text-muted mt-6 opacity-60">
            Session · 7 days · httpOnly
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
