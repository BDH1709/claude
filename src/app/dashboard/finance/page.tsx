import { PublishToggle } from "@/components/PublishToggle";
import { getPublishState } from "@/lib/publish";
import { DollarSign, PieChart, BarChart2, Construction } from "lucide-react";

export const dynamic = "force-dynamic";

const plannedFeatures = [
  {
    icon: DollarSign,
    title: "Income & Expenses",
    desc: "Track transactions, categorise spending, and monitor cash flow.",
  },
  {
    icon: PieChart,
    title: "Investment Overview",
    desc: "Portfolio summary with asset allocation and performance tracking.",
  },
  {
    icon: BarChart2,
    title: "Monthly Summaries",
    desc: "Month-over-month charts to see income, spending, and savings trends.",
  },
];

export default async function FinancePage() {
  const publishState = getPublishState();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Finance</h1>
          <p className="text-sm text-text-secondary mt-1">Income, expenses, and investments</p>
        </div>
        <PublishToggle section="finance" initialState={publishState.finance} />
      </div>

      {/* Coming soon banner */}
      <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bg-tertiary border border-border mb-2">
          <Construction className="w-6 h-6 text-accent-orange" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Coming Soon</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Finance tracking is planned. Income/expense logging, investment
          overview, and monthly summary charts coming soon.
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

      {/* Placeholder summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Monthly Income", value: "—", color: "text-accent-green" },
          { label: "Monthly Expenses", value: "—", color: "text-accent-red" },
          { label: "Net Savings", value: "—", color: "text-accent-blue" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-bg-secondary border border-border rounded-lg p-4 text-center"
          >
            <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
