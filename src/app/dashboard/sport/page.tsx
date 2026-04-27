import { PublishToggle } from "@/components/PublishToggle";
import { getPublishState } from "@/lib/publish";
import { Dumbbell, TrendingUp, Zap, Construction } from "lucide-react";

export const dynamic = "force-dynamic";

const plannedFeatures = [
  {
    icon: Dumbbell,
    title: "Workout Logger",
    desc: "Log exercises, sets, reps, and weight. Track every session.",
  },
  {
    icon: TrendingUp,
    title: "Progress Charts",
    desc: "Visualise strength gains and volume over time with interactive charts.",
  },
  {
    icon: Zap,
    title: "AI Suggestions",
    desc: "LiteLLM-powered workout suggestions based on your history and goals.",
  },
];

export default async function SportPage() {
  const publishState = getPublishState();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sport / Gym</h1>
          <p className="text-sm text-text-secondary mt-1">Workout logger and progress tracker</p>
        </div>
        <PublishToggle section="sport" initialState={publishState.sport} />
      </div>

      {/* Coming soon banner */}
      <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bg-tertiary border border-border mb-2">
          <Construction className="w-6 h-6 text-accent-orange" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Coming Soon</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          The gym assistant is on the roadmap. Workout logging, progress
          tracking, and AI-powered suggestions via LiteLLM.
        </p>
        <div className="inline-flex items-center gap-2 font-mono text-xs bg-bg-tertiary border border-border rounded px-3 py-1.5 text-accent-orange">
          <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
          In development
        </div>
      </div>

      {/* Planned features */}
      <div>
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4">
          Planned Features
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {plannedFeatures.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-bg-secondary border border-border rounded-lg p-4 space-y-2 opacity-60"
            >
              <Icon className="w-5 h-5 text-text-muted" />
              <h4 className="font-medium text-text-primary text-sm">{title}</h4>
              <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder workout card */}
      <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Last Workout</h3>
        <div className="space-y-2">
          {["Bench Press", "Squat", "Deadlift"].map((ex) => (
            <div key={ex} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-text-secondary">{ex}</span>
              <span className="font-mono text-xs text-text-muted">— × —</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-text-muted text-center pt-1">
          No workouts logged yet
        </div>
      </div>
    </div>
  );
}
