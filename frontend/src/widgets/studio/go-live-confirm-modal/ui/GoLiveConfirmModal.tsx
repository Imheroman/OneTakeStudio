"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { cn } from "@/shared/lib/utils";

export interface GoLiveDestination {
  id: number;
  platform: string;
  channelName?: string | null;
}

interface GoLiveConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: GoLiveDestination[];
  onConfirm: (selectedIds: number[]) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function GoLiveConfirmModal({
  open,
  onOpenChange,
  destinations,
  onConfirm,
  isSubmitting = false,
  error = null,
}: GoLiveConfirmModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open && destinations.length > 0) {
      setSelectedIds(new Set(destinations.map((d) => d.id)));
    }
  }, [open, destinations]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(destinations.map((d) => d.id)));
  };

  const handleConfirm = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onConfirm(ids);
  };

  const platformLabel = (platform: string) => {
    const p = (platform ?? "").toLowerCase();
    if (p === "youtube") return "YouTube";
    if (p === "twitch") return "Twitch";
    if (p === "facebook") return "Facebook";
    return p || "채널";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            어느 채널로 송출할까요?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-400">
          송출할 채널을 선택한 뒤 Go Live를 눌러 주세요.
        </p>
        {destinations.length === 0 ? (
          <p className="text-sm text-amber-400">
            연동된 채널이 없습니다. 채널 관리에서 채널을 추가해 주세요.
          </p>
        ) : (
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              전체 선택
            </button>
            <div className="flex flex-col gap-2 max-h-48 overflow-auto">
              {destinations.map((d) => (
                <label
                  key={d.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border border-gray-700 px-3 py-2 cursor-pointer hover:bg-gray-800",
                    selectedIds.has(d.id) && "border-indigo-500 bg-gray-800/50",
                  )}
                >
                  <Checkbox
                    checked={selectedIds.has(d.id)}
                    onCheckedChange={() => toggle(d.id)}
                  />
                  <span className="text-sm font-medium capitalize">
                    {platformLabel(d.platform)}
                  </span>
                  <span className="text-sm text-gray-400 truncate">
                    {d.channelName ?? "-"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm text-gray-400 hover:text-white"
          >
            취소
          </button>
          <Button
            onClick={handleConfirm}
            disabled={destinations.length === 0 || selectedIds.size === 0 || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? "송출 중..." : "Go Live"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
