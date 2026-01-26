"use client";

import { Camera } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface PreviewAreaProps {
  className?: string;
}

export function PreviewArea({ className }: PreviewAreaProps) {
  return (
    <div
      className={cn(
        "bg-black rounded-lg border border-gray-700 flex flex-col items-center justify-center h-full w-full",
        className,
      )}
    >
      <Camera className="h-16 w-16 text-gray-700 mb-4" />
      <p className="text-gray-400 font-medium mb-2">Preview Area</p>
      <p className="text-gray-500 text-sm">
        Your stream preview will appear here.
      </p>
    </div>
  );
}
