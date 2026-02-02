"use client";

import Link from "next/link";
import { Radio, Video } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { ActionCard, PageHeader } from "@/shared/common";
import { StudioCreation } from "@/widgets/studio/studio-creation";
import { useWorkspaceHome } from "@/features/workspace/workspace-home";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

interface WorkspaceHomeProps {
  userId: string;
  userName?: string;
}

export function WorkspaceHome({ userId, userName }: WorkspaceHomeProps) {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const {
    recentStudios,
    dashboardStats,
    isLoading,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    createDialogType,
    openCreateDialog,
  } = useWorkspaceHome(userId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title={
          <>
            <span className={cn("font-semibold", isDark ? "text-indigo-400" : "text-indigo-600")}>
              {userName ?? userId}
            </span>
            님, 반가워요!
          </>
        }
        description="오늘도 당신만의 멋진 방송을 만들어보세요."
        titleClassName={isDark ? "text-gray-100" : "text-gray-900"}
        descriptionClassName={isDark ? "text-gray-400" : "text-gray-500"}
      />
      {dashboardStats != null && (
        <p className={cn("text-sm -mt-4", isDark ? "text-gray-400" : "text-gray-500")}>
          스튜디오 {dashboardStats.totalStudioCount}개
          · 연결된 송출 채널 {dashboardStats.connectedDestinationCount}개
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          dark={isDark}
          title="Start Live Streaming"
          description="Go live instantly with our professional streaming tools"
          icon={<Radio className="h-8 w-8" />}
          href="#"
          actionLabel="Start Streaming"
          onClick={(e) => {
            e.preventDefault();
            openCreateDialog("live");
          }}
        />
        <ActionCard
          dark={isDark}
          title="Start Recording"
          description="Record high-quality content for later publishing"
          icon={<Video className="h-8 w-8" />}
          href="#"
          actionLabel="Start Recording"
          onClick={(e) => {
            e.preventDefault();
            openCreateDialog("recording");
          }}
        />
      </div>

      <StudioCreation
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialType={createDialogType}
      />

      <Card
        className={cn(
          isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200"
        )}
      >
        <CardContent className="p-6">
          <h3
            className={cn(
              "text-xl font-bold mb-6",
              isDark ? "text-gray-100" : "text-gray-900"
            )}
          >
            Recent Studios
          </h3>
          <div
            className={cn(
              "rounded-md border",
              isDark ? "border-gray-700" : "border-gray-100"
            )}
          >
            <Table>
              <TableHeader>
                <TableRow
                  className={cn(
                    "hover:bg-transparent",
                    isDark ? "bg-gray-800" : "bg-gray-50/50"
                  )}
                >
                  <TableHead
                    className={cn(
                      "w-[50%] font-semibold",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Title
                  </TableHead>
                  <TableHead
                    className={cn(
                      "font-semibold",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Last Modified
                  </TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className={cn(
                        "text-center py-8",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : recentStudios.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className={cn(
                        "text-center py-8",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      최근 스튜디오가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentStudios.map((studio) => (
                    <TableRow
                      key={studio.id}
                      className={cn(
                        "transition-colors",
                        isDark
                          ? "hover:bg-gray-700/50"
                          : "hover:bg-gray-50/80"
                      )}
                    >
                      <TableCell
                        className={cn(
                          "font-medium py-4",
                          isDark ? "text-gray-200" : "text-gray-700"
                        )}
                      >
                        {studio.title}
                      </TableCell>
                      <TableCell
                        className={isDark ? "text-gray-400" : "text-gray-500"}
                      >
                        {studio.date}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/studio/${studio.id}`}>
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            Enter Studio
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
