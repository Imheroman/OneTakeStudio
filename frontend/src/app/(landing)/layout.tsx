import Navbar from "@/components/shared/Navigation/Navbar";
import { LandingFooter } from "@/components/landing/organisms/LandingFooter";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        variant="glass"
        menuItems={[
          { label: "PRODUCT", href: "/#features" },
          { label: "CONTACT", href: "/#contact" },
          { label: "GUIDE", href: "/#guide" },
        ]}
        rightElement={
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-800">
                LOGIN
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                SIGN IN
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

