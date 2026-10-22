import Workspace from "../../components/workspace/Workspace.tsx";
import SignOutButton from "../../components/workspace/SignOutButton.tsx";

export const metadata = { title: "Workspace — WorkWorld" };

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {process.env.WORKWORLD_MODE === "hosted" && <SignOutButton />}
      <Workspace />
    </main>
  );
}
