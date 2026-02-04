"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/shared/ui/badge";
import { HardDrive, MoreHorizontal, PlayCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getStorage } from "@/shared/api/library";
import type { StorageData, StorageFile } from "@/entities/storage/model";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

export default function StoragePage() {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const [storageData, setStorageData] = useState<StorageData>({
    used: 0,
    total: 0,
    videoUsage: 0,
    assetUsage: 0,
  });
  const [recentFiles, setRecentFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        const data = await getStorage();
        setStorageData({
          used: data.used,
          total: data.total,
          videoUsage: data.videoUsage ?? 0,
          assetUsage: data.assetUsage ?? 0,
        });
        setRecentFiles([]);
      } catch (error) {
        console.error("스토리지 데이터 조회 실패:", error);
        // 기본값 설정 (30GB)
        setStorageData({
          used: 0,
          total: 30,
          videoUsage: 0,
          assetUsage: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  const usagePercent =
    storageData.total > 0
      ? Math.round((storageData.used / storageData.total) * 100)
      : 0;
  const isDanger = usagePercent > 80;

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
              <div className="flex items-center justify-between">
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
                <span
                  className={cn(
                    "text-2xl font-bold",
                    isDanger ? "text-red-500" : "text-indigo-600"
                  )}
                >
                  {usagePercent}%
                </span>
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
                indicatorClassName={cn(isDanger && "bg-red-500")}
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
                    <TableHead>이름</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead className="text-right">용량</TableHead>
                    <TableHead></TableHead>
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
                  ) : recentFiles.length === 0 ? (
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
                    recentFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium flex items-center gap-3">
                          <div
                            className={cn(
                              "h-10 w-16 rounded-md flex items-center justify-center",
                              isDark ? "bg-white/10" : "bg-gray-100"
                            )}
                          >
                            <PlayCircle className="text-gray-400 h-6 w-6" />
                          </div>
                          {file.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              file.status === "Uploaded"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {file.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{file.type}</TableCell>
                        <TableCell
                          className={cn(
                            isDark ? "text-gray-400" : "text-gray-500"
                          )}
                        >
                          {file.date}
                        </TableCell>
                        <TableCell className="text-right">
                          {file.size}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
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
