"use client";

import { Camera, Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "video" | "audio") => void;
}

export function AddSourceDialog({
  open,
  onOpenChange,
  onSelect,
}: AddSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">소스 추가</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
            onClick={() => {
              onSelect("video");
              onOpenChange(false);
            }}
          >
            <Camera className="h-5 w-5" />
            비디오 (웹캠)
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
            onClick={() => {
              onSelect("audio");
              onOpenChange(false);
            }}
          >
            <Mic className="h-5 w-5" />
            오디오 (마이크)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
