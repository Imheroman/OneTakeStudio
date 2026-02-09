"use client";

import { useState, useEffect, useRef } from "react";
import { FileText } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { getStudioNote, putStudioNote } from "@/shared/api/studio-note";

const STORAGE_KEY = "studio-note";

interface StudioNotePanelProps {
  studioId: string;
  onClose?: () => void;
}

export function StudioNotePanel({ studioId, onClose }: StudioNotePanelProps) {
  const [content, setContent] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStudioNote(studioId).then((apiContent) => {
      if (cancelled) return;
      if (apiContent !== "") {
        setContent(apiContent);
      } else {
        try {
          setContent(
            sessionStorage.getItem(`${STORAGE_KEY}-${studioId}`) ?? "",
          );
        } catch {}
      }
    });
    return () => {
      cancelled = true;
    };
  }, [studioId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${STORAGE_KEY}-${studioId}`, content);
    } catch {}
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      putStudioNote(studioId, content).catch(() => {});
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [studioId, content]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <FileText className="h-4 w-4" />
          노트
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-3">
        <Label className="text-gray-300 text-sm mb-2">방송 노트</Label>
        <textarea
          placeholder="방송 노트를 작성하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={cn(
            "flex-1 min-h-[120px] w-full rounded border bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 p-2 text-sm resize-none",
          )}
        />
      </div>
    </div>
  );
}
