import { NoteEditor } from "@/components/NoteEditor";
import { PublishToggle } from "@/components/PublishToggle";
import { getPublishState } from "@/lib/publish";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const publishState = getPublishState();

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Notes</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Markdown notes · saved to /workspace/data/notes/
          </p>
        </div>
        <PublishToggle section="notes" initialState={publishState.notes} />
      </div>
      <div className="flex-1 overflow-hidden">
        <NoteEditor />
      </div>
    </div>
  );
}
