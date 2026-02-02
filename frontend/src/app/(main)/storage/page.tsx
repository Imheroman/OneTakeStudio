// src/app/(main)/storage/page.tsx
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

export default function StoragePage() {
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  const usagePercent = storageData.total > 0 
    ? Math.round((storageData.used / storageData.total) * 100) 
    : 0;
  const isDanger = usagePercent > 80;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Storage
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your storage space and files.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-gray-500" />
              Overview
            </CardTitle>
            <span
              className={cn(
                "text-2xl font-bold",
                isDanger ? "text-red-500" : "text-indigo-600",
              )}
            >
              {usagePercent}%
            </span>
          </div>
          <CardDescription>
            {storageData.used.toFixed(2)}GB used of {storageData.total.toFixed(2)}GB
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

      <Card>
        <CardHeader>
          <CardTitle>All Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : recentFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    파일이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                recentFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="h-10 w-16 bg-gray-100 rounded-md flex items-center justify-center">
                      <PlayCircle className="text-gray-400 h-6 w-6" />
                    </div>
                    {file.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        file.status === "Uploaded" ? "secondary" : "outline"
                      }
                    >
                      {file.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{file.type}</TableCell>
                  <TableCell className="text-gray-500">{file.date}</TableCell>
                  <TableCell className="text-right">{file.size}</TableCell>
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
  );
}
