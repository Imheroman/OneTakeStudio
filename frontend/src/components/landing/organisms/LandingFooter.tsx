export function LandingFooter() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-lg font-black italic text-indigo-300">OneTake</div>
            <p className="text-sm text-gray-400">
              창작의 시간은 줄이고 가치는 높이는 통합 영상 송출 솔루션
            </p>
          </div>
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} OneTake. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

