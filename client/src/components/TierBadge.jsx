const tierConfig = {
  S: { label: 'S', class: 'tier-s', title: 'Top tier — dominant in the meta' },
  A: { label: 'A', class: 'tier-a', title: 'Strong — consistently top-8' },
  B: { label: 'B', class: 'tier-b', title: 'Solid — viable at locals' },
  C: { label: 'C', class: 'tier-c', title: 'Fringe — situational or countered' },
};

export default function TierBadge({ tier }) {
  const cfg = tierConfig[tier] || tierConfig.C;
  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 font-bold text-sm ${cfg.class}`}
    >
      {cfg.label}
    </span>
  );
}
