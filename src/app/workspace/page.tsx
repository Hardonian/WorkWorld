import Workspace from "../../components/workspace/Workspace.tsx";

export const metadata = { title: "Workspace — WorkWorld" };

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Workspace />
    </main>
  );
}
