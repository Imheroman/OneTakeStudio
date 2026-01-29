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

interface WorkspaceHomeProps {
  userId: string;
  userName?: string;
}

export function WorkspaceHome({ userId, userName }: WorkspaceHomeProps) {
  const {
    recentStudios,
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
            <span className="text-indigo-600">{userName ?? userId}</span>님,
            반가워요!
          </>
        }
        description="오늘도 당신만의 멋진 방송을 만들어보세요."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          title="Start Live Streaming"
          description="Go live instantly with our professional streaming tools"
          icon={<Radio className="h-8 w-8 text-gray-600" />}
          href="#"
          actionLabel="Start Streaming"
          onClick={(e) => {
            e.preventDefault();
            openCreateDialog("live");
          }}
        />
        <ActionCard
          title="Start Recording"
          description="Record high-quality content for later publishing"
          icon={<Video className="h-8 w-8 text-gray-600" />}
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

      <Card className="border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-6">Recent Studios</h3>
          <div className="rounded-md border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/50">
                  <TableHead className="w-[50%] text-gray-600 font-semibold">
                    Title
                  </TableHead>
                  <TableHead className="text-gray-600 font-semibold">
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
                      className="text-center text-gray-500 py-8"
                    >
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : recentStudios.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-gray-500 py-8"
                    >
                      최근 스튜디오가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentStudios.map((studio) => (
                    <TableRow
                      key={studio.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-700 py-4">
                        {studio.title}
                      </TableCell>
                      <TableCell className="text-gray-500">{studio.date}</TableCell>
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
