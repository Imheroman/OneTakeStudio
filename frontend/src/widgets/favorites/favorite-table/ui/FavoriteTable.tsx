"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { Favorite } from "@/entities/favorite/model";

interface FavoriteTableProps {
  favorites: Favorite[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function FavoriteTable({
  favorites,
  onDelete,
  isLoading = false,
}: FavoriteTableProps) {
  if (isLoading) {
    return (
      <div className="text-center text-gray-500 py-8">로딩 중...</div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        등록된 즐겨찾기가 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이메일</TableHead>
          <TableHead>닉네임</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {favorites.map((favorite) => {
          const deleteId =
            favorite.id ?? favorite.userId ?? favorite.favoriteId ?? "";
          return (
            <TableRow key={deleteId || favorite.nickname}>
              <TableCell className="font-medium">{favorite.email ?? "-"}</TableCell>
              <TableCell>{favorite.nickname}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteId && onDelete(deleteId)}
                  disabled={!deleteId}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  aria-label="즐겨찾기에서 제거"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
