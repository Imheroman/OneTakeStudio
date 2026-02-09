"use client";

import { CreateStudioDialog } from "@/widgets/studio/create-studio-dialog";
import { useStudioCreation } from "@/features/studio/studio-creation";

interface StudioCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: "live" | "recording";
}

export function StudioCreation({
  open,
  onOpenChange,
  initialType = "live",
}: StudioCreationProps) {
  const { handleSubmit } = useStudioCreation(initialType);

  return (
    <CreateStudioDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      initialType={initialType}
    />
  );
}
