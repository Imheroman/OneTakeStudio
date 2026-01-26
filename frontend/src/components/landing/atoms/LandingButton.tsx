import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "outline";

export function LandingButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
}) {
  const className =
    variant === "primary"
      ? "bg-indigo-600 hover:bg-indigo-700"
      : variant === "secondary"
        ? "bg-gray-900 hover:bg-gray-800 text-white"
        : "border-gray-300 text-gray-700 hover:bg-gray-50";

  const buttonVariant =
    variant === "outline" ? "outline" : variant === "secondary" ? "secondary" : "default";

  return (
    <Link href={href}>
      <Button variant={buttonVariant} className={`h-11 px-6 ${className}`}>
        {children}
      </Button>
    </Link>
  );
}
