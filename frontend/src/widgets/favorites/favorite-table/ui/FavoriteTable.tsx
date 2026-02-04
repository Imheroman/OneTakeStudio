"use client";

import { Trash2 } from "lucide-react";
import { List } from "react-window";
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

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 400;
const GRID_COLS = "grid-cols-[1fr_1fr_auto]";

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

  const useVirtualList = favorites.length > 15;

  if (!useVirtualList) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead>닉네임</TableHead>
            <TableHead className="text-right">동작</TableHead>
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

  const listHeight = Math.min(LIST_HEIGHT, favorites.length * ROW_HEIGHT);

  function FavoriteRow({
    index,
    style,
    favorites: favs,
    onDelete: onDel,
  }: {
    index: number;
    style: React.CSSProperties;
    favorites: Favorite[];
    onDelete: (id: string) => void;
  }) {
    const favorite = favs[index];
    const deleteId =
      favorite.id ?? favorite.userId ?? favorite.favoriteId ?? "";
    return (
      <div
        style={style}
        className={`grid ${GRID_COLS} items-center w-full border-b px-2 text-sm hover:bg-muted/50 transition-colors`}
      >
        <span className="min-w-0 py-2 px-2 font-medium truncate">
          {favorite.email ?? "-"}
        </span>
        <span className="min-w-0 py-2 px-2 truncate">{favorite.nickname}</span>
        <div className="shrink-0 py-2 px-2 text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteId && onDel(deleteId)}
            disabled={!deleteId}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            aria-label="즐겨찾기에서 제거"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div
        className={`grid ${GRID_COLS} w-full border-b bg-muted/30 text-left text-sm font-medium h-10 px-2 align-middle`}
      >
        <span className="px-2">이메일</span>
        <span className="px-2">닉네임</span>
        <span className="px-2 text-right">동작</span>
      </div>
      <List<{ favorites: Favorite[]; onDelete: (id: string) => void }>
        rowCount={favorites.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={FavoriteRow}
        rowProps={{ favorites, onDelete }}
        style={{ height: listHeight, width: "100%" }}
        overscanCount={5}
      />
    </div>
  );
}
