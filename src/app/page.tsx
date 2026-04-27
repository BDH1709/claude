import Link from "next/link";
import { Terminal, Cpu, BookOpen, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-accent-green font-semibold tracking-tight">
          bdh1709.com
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/portfolio"
            className="text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            Projects
          </Link>
          <Link
            href="/login"
            className="text-xs font-mono px-3 py-1.5 border border-border rounded hover:border-accent-blue hover:text-accent-blue transition-colors"
          >
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full space-y-8">
          {/* Terminal-style header */}
          <div className="font-mono text-sm text-text-muted">
            <span className="text-accent-green">➜</span>{" "}
            <span className="text-accent-blue">~</span>{" "}
            <span className="text-text-secondary">cat about.txt</span>
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-3">
              Hey, I&apos;m <span className="text-accent-blue">bdh1709</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">
              Developer, tinkerer, and Raspberry Pi enthusiast. I build things
              for the web and run them on hardware I can hold in my hand.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Cpu, label: "Self-hosted", value: "Raspberry Pi 4" },
              { icon: Terminal, label: "Stack", value: "Next.js + Docker" },
              { icon: BookOpen, label: "Projects", value: "Always building" },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-bg-secondary border border-border rounded-lg p-4"
              >
                <Icon className="w-4 h-4 text-accent-blue mb-2" />
                <div className="text-xs text-text-muted font-mono">{label}</div>
                <div className="text-sm text-text-primary font-medium mt-0.5">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="flex gap-4 pt-2">
            <Link
              href="/portfolio"
              className="flex items-center gap-2 bg-accent-blue text-bg-primary text-sm font-semibold px-4 py-2 rounded hover:bg-opacity-90 transition-all"
            >
              View Projects <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 border border-border text-text-secondary text-sm px-4 py-2 rounded hover:border-accent-green hover:text-accent-green transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-text-muted font-mono">
        bdh1709.com · self-hosted on raspberry pi 4
      </footer>
    </div>
  );
}
