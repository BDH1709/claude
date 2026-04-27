"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Terminal, Lock } from "lucide-react";
import { Suspense } from "react";

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
        const from = searchParams.get("from") || "/dashboard/server";
        router.push(from);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bg-secondary border border-border mb-4">
            <Terminal className="w-5 h-5 text-accent-green" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">bdh1709.com</h1>
          <p className="text-sm text-text-secondary mt-1">Dashboard access</p>
        </div>

        {/* Form */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  required
                  className="w-full bg-bg-tertiary border border-border rounded px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors font-mono"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-accent-red font-mono bg-bg-tertiary border border-accent-red border-opacity-30 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-accent-blue text-bg-primary font-semibold text-sm py-2.5 rounded hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Enter"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-6 font-mono">
          Session expires in 7 days
        </p>
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
