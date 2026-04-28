import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "#060d14" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto relative">{children}</main>
    </div>
  );
}
