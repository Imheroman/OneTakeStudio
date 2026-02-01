// src/app/(auth)/layout.tsx
import { Logo } from "@/shared/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100/50 p-4">
      <Logo href="/" size="lg" className="mb-6" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
