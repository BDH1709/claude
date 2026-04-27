import { PublishToggle } from "@/components/PublishToggle";
import { getPublishState } from "@/lib/publish";
import { Map, CheckSquare, BookOpen, Construction } from "lucide-react";

export const dynamic = "force-dynamic";

const plannedFeatures = [
  {
    icon: CheckSquare,
    title: "Pokédex Tracker",
    desc: "Caught / seen checkboxes for all 386 Pokémon. Track completion percentage.",
  },
  {
    icon: Map,
    title: "Interactive Map",
    desc: "Routes and locations in Leaf Green. See which Pokémon appear where.",
  },
  {
    icon: BookOpen,
    title: "Progress Notes",
    desc: "Game journal for tracking story progress, team composition, and strategy.",
  },
];

export default async function PokemonPage() {
  const publishState = getPublishState();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Pokémon — Leaf Green
          </h1>
          <p className="text-sm text-text-secondary mt-1">Game tracker and Pokédex</p>
        </div>
        <PublishToggle section="pokemon" initialState={publishState.pokemon} />
      </div>

      {/* Coming soon banner */}
      <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bg-tertiary border border-border mb-2">
          <Construction className="w-6 h-6 text-accent-orange" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Coming Soon</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          The Pokémon Leaf Green tracker is planned and scaffolded. Features
          will be built out soon.
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

      {/* Placeholder progress */}
      <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Pokédex Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full" />
          <span className="font-mono text-xs text-text-muted">0 / 386</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Caught", "Seen", "Missing"].map((label) => (
            <div key={label} className="text-center">
              <div className="font-mono text-lg font-bold text-text-muted">—</div>
              <div className="text-xs text-text-muted">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
