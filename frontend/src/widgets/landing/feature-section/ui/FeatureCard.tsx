import type { ReactNode } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

export function FeatureCard({
  icon,
  title,
  description,
  isDark = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  isDark?: boolean;
}) {
  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        isDark ? "border-white/10 bg-white/5" : "border-gray-200"
      )}
    >
      <CardContent className="p-6 space-y-3">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            isDark
              ? "bg-indigo-900/50 text-indigo-300"
              : "bg-indigo-50 text-indigo-700"
          )}
        >
          {icon}
        </div>
        <div className="space-y-1">
          <h3
            className={cn(
              "text-lg font-bold",
              isDark ? "text-white/90" : "text-gray-900"
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "text-sm leading-relaxed",
              isDark ? "text-white/70" : "text-gray-600"
            )}
          >
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
