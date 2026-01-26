// src/app/(main)/storage/page.tsx
"use client";

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

// [Mock Data]
const storageData = {
  used: 45.09,
  total: 50.0,
  videoUsage: 40.2,
  assetUsage: 4.89,
};

const recentFiles = [
  {
    id: 1,
    title: "Weekly Podcast Episode #4",
    date: "Jan 4, 2026",
    size: "4.2 GB",
    type: "Video",
    status: "Uploaded",
  },
  {
    id: 2,
    title: "Product Demo - Q1 Launch",
    date: "Jan 12, 2026",
    size: "1.2 GB",
    type: "Video",
    status: "Processing",
  },
  {
    id: 3,
    title: "Team Meeting Recording",
    date: "Jan 8, 2026",
    size: "800 MB",
    type: "Shorts",
    status: "Saved",
  },
  {
    id: 4,
    title: "Gaming Stream Highlight",
    date: "Jan 2, 2026",
    size: "2.5 GB",
    type: "Video",
    status: "Uploaded",
  },
];

export default function StoragePage() {
  const usagePercent = Math.round((storageData.used / storageData.total) * 100);
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
            {storageData.used}GB used of {storageData.total}GB
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
              {recentFiles.map((file) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
