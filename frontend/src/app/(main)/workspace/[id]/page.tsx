"use client";

import { use } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, Video, Settings, LogOut } from "lucide-react";

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // URL 파라미터에서 id 추출
  const { user, accessToken, isLoggedIn, logout } = useAuthStore();
  const router = useRouter();

  // 1. 보안 가드: 토큰이나 로그인 정보가 없으면 튕겨냄
  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      router.replace("/login");
    }
  }, [isLoggedIn, accessToken, router]);

  if (!isLoggedIn) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 영역 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-black text-indigo-600 italic">OneTake</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-600 rounded-lg font-bold">
            <LayoutDashboard size={20} />
            <span>대시보드</span>
          </div>
          <div className="flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <Video size={20} />
            <span>스튜디오</span>
          </div>
          <div className="flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <Settings size={20} />
            <span>설정</span>
          </div>
        </nav>

        <button 
          onClick={() => { logout(); router.push("/login"); }}
          className="m-4 flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">로그아웃</span>
        </button>
      </aside>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-gray-800">
            {user?.name}님의 워크스페이스
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
              Token: {accessToken?.slice(0, 10)}...
            </span>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        <section className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">환영합니다, {user?.name}님! 👋</h3>
              <p className="text-gray-500 mt-2">
                현재 <span className="font-bold text-indigo-600">{id}</span> 워크스페이스가 활성화되어 있습니다. 
                여기서 실전 최적화 방송 관리를 시작하세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="aspect-video bg-gray-900 rounded-2xl flex items-center justify-center text-gray-500 border border-gray-800">
                방송 미리보기 (준비 중)
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="font-bold mb-4">최근 활동</h4>
                <p className="text-sm text-gray-400">표시할 데이터가 없습니다.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}