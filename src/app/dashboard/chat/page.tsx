import { PublishToggle } from "@/components/PublishToggle";
import { getPublishState } from "@/lib/publish";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const publishState = getPublishState();

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">AI Chat</h1>
          <p className="text-xs text-text-secondary mt-0.5 font-mono">
            Open WebUI · localhost:3001
          </p>
        </div>
        <PublishToggle section="chat" initialState={publishState.chat} />
      </div>

      <div className="flex-1 relative">
        <iframe
          src="http://localhost:3001"
          className="absolute inset-0 w-full h-full border-0"
          title="Open WebUI"
          allow="microphone"
        />
      </div>
    </div>
  );
}
