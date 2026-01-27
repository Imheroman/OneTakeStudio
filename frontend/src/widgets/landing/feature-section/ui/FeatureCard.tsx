import type { ReactNode } from "react";
import { Card, CardContent } from "@/shared/ui/card";

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6 space-y-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
