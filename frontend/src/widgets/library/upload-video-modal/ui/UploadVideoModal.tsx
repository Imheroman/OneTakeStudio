"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { apiClient } from "@/shared/api/client";
import { CloudUpload } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const ACCEPT =
  "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv";

interface UploadVideoModalProps {
  open: boolean;
  onClose: () => void;
  studioId: string;
  onSuccess?: () => void;
}

export function UploadVideoModal({
  open,
  onClose,
  studioId,
  onSuccess,
}: UploadVideoModalProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setFile(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (
      dropped?.type.startsWith("video/") ||
      /\.(mp4|mov|avi|mkv)$/i.test(dropped?.name ?? "")
    ) {
      setFile(dropped);
      setError(null);
    } else {
      setError("동영상 파일만 업로드 가능합니다.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!studioId) {
      setError(
        "업로드를 하려면 URL에 ?studioId=스튜디오ID 를 넣어 접속해 주세요.",
      );
      return;
    }
    if (!file) {
      setError("파일을 선택해 주세요.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("studioId", studioId);
      formData.append("title", title || file.name);
      formData.append("file", file);
      await apiClient.postForm("/api/v1/media/upload", formData);
      onSuccess?.();
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>동영상 업로드</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="upload-title">제목 (선택)</Label>
            <Input
              id="upload-title"
              placeholder="영상 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>동영상 파일</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-200 bg-gray-50/50",
              )}
            >
              <CloudUpload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                동영상 파일을 선택하세요
              </p>
              <p className="text-xs text-gray-500 mt-1">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-xs text-gray-400 mt-2">
                지원 형식: MP4, MOV, AVI, MKV 등
              </p>
              <input
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                파일 선택
              </Button>
              {file && (
                <p className="mt-3 text-sm text-gray-700 truncate max-w-full px-2">
                  {file.name}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {!studioId && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded px-3 py-2">
            업로드를 하려면 URL에{" "}
            <code className="bg-amber-100 px-1 rounded">
              ?studioId=스튜디오ID
            </code>{" "}
            를 넣어 접속해 주세요.
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || uploading || !studioId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? "업로드 중..." : "업로드"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
