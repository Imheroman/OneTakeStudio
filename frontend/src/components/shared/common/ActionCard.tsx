import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  actionLabel?: string;
  className?: string;
  iconBg?: "indigo" | "gray" | "blue";
}

const iconBgClasses = {
  indigo: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100",
  gray: "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
  blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
};

export function ActionCard({
  title,
  description,
  icon,
  href,
  actionLabel = "Start",
  className,
  iconBg = "gray",
}: ActionCardProps) {
  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all border-gray-200 group",
        className
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div
          className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
            iconBgClasses[iconBg]
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            {description}
          </p>
        </div>
        <Link href={href}>
          <Button className="bg-indigo-600 hover:bg-indigo-700 px-8 py-2 h-auto text-base">
            {actionLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
