// src/app/(main)/layout.tsx
import { Sidebar } from "@/widgets/workspace/sidebar";
import { WorkspaceTopNav } from "@/widgets/workspace/top-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      {/* 사이드바 고정 */}
      <Sidebar />

      {/* 우측 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceTopNav />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
