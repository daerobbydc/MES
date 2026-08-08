import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import InactivityGuard from "@/components/auth/InactivityGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-surface-50 via-white to-surface-100">
      <InactivityGuard />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
