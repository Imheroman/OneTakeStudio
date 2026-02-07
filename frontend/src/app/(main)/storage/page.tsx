"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  HardDrive,
  PlayCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getStorage, getStorageFiles, deleteRecording } from "@/shared/api/library";
import type { StorageData, StorageFile } from "@/entities/storage/model";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

/** 저장 가능한 영상 개수 (고정) */
const VIDEO_LIMIT = 50;

/** 보관 기간(일) - 업로드일로부터 이 기간 후 자동 삭제 */
const RETENTION_DAYS = 30;

type SortKey = "title" | "date" | "type" | "size" | "daysUntilDeletion";
type SortOrder = "asc" | "desc";

interface StorageFileWithMeta extends StorageFile {
  sizeBytes?: number;
  daysUntilDeletion?: number;
}

/** uploadedAt(ISO 문자열) 기준으로 삭제까지 남은 일수 계산 */
function calcDaysUntilDeletion(uploadedAt: string | null | undefined): number {
  if (!uploadedAt) return RETENTION_DAYS;
  const uploaded = new Date(uploadedAt).getTime();
  const now = Date.now();
  const daysSince = Math.floor((now - uploaded) / 86400000);
  return Math.max(0, RETENTION_DAYS - daysSince);
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  isDark,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentOrder: SortOrder;
  onSort: (key: SortKey) => void;
  isDark: boolean;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:opacity-80 transition-opacity",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          className?.includes("text-right") && "justify-end"
        )}
      >
        {label}
        <span className="inline-flex flex-col -space-y-1.5">
          <ChevronUp
            className={cn(
              "h-4 w-4",
              isActive && currentOrder === "asc" ? "opacity-100" : "opacity-40",
              isDark ? "text-gray-400" : "text-gray-500"
            )}
          />
          <ChevronDown
            className={cn(
              "h-4 w-4 -mt-1",
              isActive && currentOrder === "desc"
                ? "opacity-100"
                : "opacity-40",
              isDark ? "text-gray-400" : "text-gray-500"
            )}
          />
        </span>
      </div>
    </TableHead>
  );
}

export default function StoragePage() {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const [storageData, setStorageData] = useState<StorageData>({
    used: 0,
    total: 0,
    videoUsage: 0,
    assetUsage: 0,
    videoCount: 0,
    videoLimit: 50,
  });
  const [files, setFiles] = useState<StorageFileWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        setIsLoading(true);
        const [data, fileResult] = await Promise.all([
          getStorage(),
          getStorageFiles({ page: 0, size: VIDEO_LIMIT }),
        ]);
        const videoCount = fileResult.totalElements;
        setStorageData({
          used: data.used,
          total: data.total,
          videoUsage: data.videoUsage ?? 0,
          assetUsage: data.assetUsage ?? 0,
          videoCount,
          videoLimit: VIDEO_LIMIT,
        });
        setFiles(
          fileResult.files.map((f) => ({
            id: f.id,
            title: f.title ?? f.name ?? "",
            date: f.date ?? f.uploadedAt ?? "",
            createdAt: f.uploadedAt ?? f.date ?? "",
            size: f.size ?? "",
            sizeBytes: f.sizeBytes ?? 0,
            type: f.type ?? "Video",
            status: f.status ?? "Uploaded",
            daysUntilDeletion: calcDaysUntilDeletion(f.uploadedAt),
          }))
        );
      } catch (error) {
        console.error("스토리지 데이터 조회 실패:", error);
        setStorageData({
          used: 0,
          total: 50,
          videoUsage: 0,
          assetUsage: 0,
          videoCount: 0,
          videoLimit: VIDEO_LIMIT,
        });
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedFiles = useMemo(() => {
    if (!sortKey) return files;
    return [...files].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = (a.title ?? "").localeCompare(b.title ?? "");
          break;
        case "date":
          cmp = (a.createdAt ?? a.date ?? "").localeCompare(
            b.createdAt ?? b.date ?? ""
          );
          break;
        case "type":
          cmp = (a.type ?? "").localeCompare(b.type ?? "");
          break;
        case "size":
          cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
          break;
        case "daysUntilDeletion":
          cmp =
            (a.daysUntilDeletion ?? RETENTION_DAYS) -
            (b.daysUntilDeletion ?? RETENTION_DAYS);
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [files, sortKey, sortOrder]);

  const handleDelete = async (fileId: string | number) => {
    if (!confirm("이 파일을 삭제하시겠습니까?")) return;
    try {
      await deleteRecording(String(fileId));
      setFiles((prev) => prev.filter((f) => String(f.id) !== String(fileId)));
      setStorageData((prev) => ({
        ...prev,
        videoCount: Math.max(0, (prev.videoCount ?? 0) - 1),
      }));
    } catch (error) {
      console.error("파일 삭제 실패:", error);
      alert("파일 삭제에 실패했습니다.");
    }
  };

  const usagePercent =
    storageData.total > 0
      ? Math.round((storageData.used / storageData.total) * 100)
      : 0;
  const usageColorClass =
    usagePercent >= 90
      ? "text-red-500"
      : usagePercent >= 80
      ? "text-orange-500"
      : "text-indigo-600";
  const progressIndicatorClass =
    usagePercent >= 90
      ? "bg-red-500"
      : usagePercent >= 80
      ? "bg-orange-500"
      : undefined;

  const videoCount = storageData.videoCount ?? 0;
  const videoLimit = storageData.videoLimit ?? VIDEO_LIMIT;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section
        className={cn(
          "rounded-2xl p-6 shadow-sm",
          isDark
            ? "bg-white/5 backdrop-blur-sm border border-white/10"
            : "bg-white/70 backdrop-blur-sm border border-gray-200/80"
        )}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={cn(
                  "text-3xl font-bold tracking-tight",
                  isDark ? "text-gray-100" : "text-gray-900"
                )}
              >
                저장 공간
              </h1>
              <p
                className={cn(
                  "mt-1",
                  isDark ? "text-gray-400" : "text-gray-500"
                )}
              >
                저장 공간과 파일을 관리합니다.
              </p>
            </div>
          </div>

          <Card
            className={cn(isDark && "bg-white/5 border-white/10 text-gray-100")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle
                  className={cn(
                    "text-lg font-medium flex items-center gap-2",
                    isDark ? "text-gray-200" : ""
                  )}
                >
                  <HardDrive
                    className={cn(
                      "h-5 w-5",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}
                  />
                  사용량 요약
                </CardTitle>
                <div className="flex items-center gap-6">
                  <span className={cn("text-2xl font-bold", usageColorClass)}>
                    {usagePercent}%
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    영상 {videoCount} / {videoLimit}개
                  </span>
                </div>
              </div>
              <CardDescription className={cn(isDark && "text-gray-400")}>
                {storageData.used.toFixed(2)}GB / {storageData.total.toFixed(2)}
                GB 사용 중
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress
                value={usagePercent}
                className="h-3"
                indicatorClassName={progressIndicatorClass}
              />
            </CardContent>
          </Card>

          <Card className={cn(isDark && "bg-white/5 border-white/10")}>
            <CardHeader>
              <CardTitle className={cn(isDark && "text-gray-200")}>
                전체 파일
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader
                      label="파일이름"
                      sortKey="title"
                      currentSort={sortKey}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      isDark={isDark}
                    />
                    <SortableHeader
                      label="생성일"
                      sortKey="date"
                      currentSort={sortKey}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      isDark={isDark}
                    />
                    <SortableHeader
                      label="타입"
                      sortKey="type"
                      currentSort={sortKey}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      isDark={isDark}
                    />
                    <SortableHeader
                      label="사이즈"
                      sortKey="size"
                      currentSort={sortKey}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      isDark={isDark}
                      className="text-right"
                    />
                    <SortableHeader
                      label="삭제까지 남은 일자"
                      sortKey="daysUntilDeletion"
                      currentSort={sortKey}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      isDark={isDark}
                      className="text-right"
                    />
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className={cn(
                          "text-center py-8",
                          isDark ? "text-gray-400" : "text-gray-500"
                        )}
                      >
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : sortedFiles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className={cn(
                          "text-center py-8",
                          isDark ? "text-gray-400" : "text-gray-500"
                        )}
                      >
                        파일이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium flex items-center gap-3">
                          <div
                            className={cn(
                              "h-10 w-16 rounded-md flex items-center justify-center shrink-0",
                              isDark ? "bg-white/10" : "bg-gray-100"
                            )}
                          >
                            <PlayCircle className="text-gray-400 h-6 w-6" />
                          </div>
                          {file.title}
                        </TableCell>
                        <TableCell
                          className={cn(
                            isDark ? "text-gray-400" : "text-gray-500"
                          )}
                        >
                          {file.date}
                        </TableCell>
                        <TableCell>{file.type}</TableCell>
                        <TableCell className="text-right">
                          {file.size}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            (file.daysUntilDeletion ?? RETENTION_DAYS) <= 7 &&
                              "text-red-500"
                          )}
                        >
                          {file.daysUntilDeletion ?? RETENTION_DAYS}일
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(file.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
