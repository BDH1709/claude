import { SystemStatsPanel } from "@/components/SystemStats";
import { PublishToggle } from "@/components/PublishToggle";
import { getPublishState } from "@/lib/publish";

export const dynamic = "force-dynamic";

export default async function ServerPage() {
  const publishState = getPublishState();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Server</h1>
          <p className="text-sm text-text-secondary mt-1">
            Raspberry Pi 4 · live system stats
          </p>
        </div>
        <PublishToggle section="server" initialState={publishState.server} />
      </div>

      <SystemStatsPanel />
    </div>
  );
}
