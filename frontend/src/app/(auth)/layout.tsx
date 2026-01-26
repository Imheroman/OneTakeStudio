// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 배경색(bg-gray-100)과 중앙 정렬 기능만 유지
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100/50 p-4">
      {/* 내부의 흰색 박스 스타일(bg-white, shadow-md 등)을 제거하고, 단순히 너비 제한만 둠 */}
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
