import Link from "next/link";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { Project } from "@/types";

const projects: Project[] = [
  {
    title: "Personal Dashboard",
    description:
      "Self-hosted personal dashboard with server monitoring, notes, and more. Runs on a Raspberry Pi 4 in Docker.",
    tech: ["Next.js", "TypeScript", "Docker", "Caddy", "Tailwind CSS"],
    status: "active",
  },
  {
    title: "Home Lab Setup",
    description:
      "Raspberry Pi 4 running Docker Compose with Caddy as reverse proxy. Hosts multiple services including AI chat via Open WebUI.",
    tech: ["Docker", "Caddy", "Raspberry Pi", "ARM64", "Linux"],
    status: "active",
  },
  {
    title: "AI Chat Server",
    description:
      "Local LLM inference and chat interface using Open WebUI and LiteLLM proxy for unified model access.",
    tech: ["Open WebUI", "LiteLLM", "Ollama", "Docker"],
    status: "active",
  },
];

const statusColors: Record<Project["status"], string> = {
  active: "text-accent-green border-accent-green",
  wip: "text-accent-orange border-accent-orange",
  archived: "text-text-muted border-border",
};

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <nav className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-mono text-accent-green font-semibold">
          bdh1709.com
        </span>
        <span className="text-border">/</span>
        <span className="text-text-secondary text-sm">projects</span>
      </nav>

      <main className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Projects
          </h1>
          <p className="text-text-secondary">
            Things I&apos;ve built and run on my home server.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.title}
              className="bg-bg-secondary border border-border rounded-lg p-5 flex flex-col gap-3 hover:border-accent-blue transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors leading-tight">
                  {project.title}
                </h2>
                <span
                  className={`text-xs font-mono border rounded px-1.5 py-0.5 shrink-0 ${statusColors[project.status]}`}
                >
                  {project.status}
                </span>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed flex-1">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {project.tech.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono bg-bg-tertiary text-text-muted px-2 py-0.5 rounded border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {(project.url || project.repo) && (
                <div className="flex gap-3 pt-1">
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Live
                    </a>
                  )}
                  {project.repo && (
                    <a
                      href={project.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                    >
                      <Github className="w-3 h-3" /> Source
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-text-muted font-mono">
        bdh1709.com · self-hosted on raspberry pi 4
      </footer>
    </div>
  );
}
