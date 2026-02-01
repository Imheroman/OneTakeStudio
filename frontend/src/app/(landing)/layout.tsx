import { Navbar } from "@/widgets/landing/navbar";
import { LandingFooter } from "@/widgets/landing/footer";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        variant="glass"
        menuItems={[
          { label: "서비스 소개", href: "/#features" },
          { label: "문의하기", href: "/#contact" },
          { label: "이용 방법", href: "/#guide" },
        ]}
        rightElement={
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-800">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                시작하기
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex-1">{children}</div>
      <LandingFooter />
    </div>
  );
}

