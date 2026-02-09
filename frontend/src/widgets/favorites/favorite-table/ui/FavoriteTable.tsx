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
import { cn } from "@/shared/lib/utils";
import type { Favorite } from "@/entities/favorite/model";

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 400;
const GRID_COLS = "grid-cols-[1fr_1fr_auto]";

interface FavoriteTableProps {
  favorites: Favorite[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
  isDark?: boolean;
}

export function FavoriteTable({
  favorites,
  onDelete,
  isLoading = false,
  isDark = false,
}: FavoriteTableProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "text-center py-8",
          isDark ? "text-gray-400" : "text-gray-500"
        )}
      >
        로딩 중...
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-8",
          isDark ? "text-gray-400" : "text-gray-500"
        )}
      >
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
            <TableHead className={cn(isDark && "text-gray-300")}>
              이메일
            </TableHead>
            <TableHead className={cn(isDark && "text-gray-300")}>
              닉네임
            </TableHead>
            <TableHead className={cn("text-right", isDark && "text-gray-300")}>
              동작
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {favorites.map((favorite) => {
            const deleteId =
              favorite.id ?? favorite.userId ?? favorite.favoriteId ?? "";
            return (
              <TableRow key={deleteId || favorite.nickname}>
                <TableCell
                  className={cn("font-medium", isDark && "text-gray-200")}
                >
                  {favorite.email ?? "-"}
                </TableCell>
                <TableCell className={cn(isDark && "text-gray-300")}>
                  {favorite.nickname}
                </TableCell>
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
    isDark: dark,
  }: {
    index: number;
    style: React.CSSProperties;
    favorites: Favorite[];
    onDelete: (id: string) => void;
    isDark?: boolean;
  }) {
    const favorite = favs[index];
    const deleteId =
      favorite.id ?? favorite.userId ?? favorite.favoriteId ?? "";
    return (
      <div
        style={style}
        className={cn(
          "grid",
          GRID_COLS,
          "items-center w-full border-b px-2 text-sm transition-colors",
          dark
            ? "border-white/10 hover:bg-white/5"
            : "border-gray-200 hover:bg-muted/50"
        )}
      >
        <span
          className={cn(
            "min-w-0 py-2 px-2 font-medium truncate",
            dark && "text-gray-200"
          )}
        >
          {favorite.email ?? "-"}
        </span>
        <span
          className={cn("min-w-0 py-2 px-2 truncate", dark && "text-gray-300")}
        >
          {favorite.nickname}
        </span>
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
    <div
      className={cn(
        "border rounded-md overflow-hidden",
        isDark && "border-white/10"
      )}
    >
      <div
        className={cn(
          "grid",
          GRID_COLS,
          "w-full border-b text-left text-sm font-medium h-10 px-2 align-middle",
          isDark
            ? "border-white/10 bg-white/5 text-gray-300"
            : "border-gray-200 bg-muted/30"
        )}
      >
        <span className="px-2">이메일</span>
        <span className="px-2">닉네임</span>
        <span className="px-2 text-right">동작</span>
      </div>
      <List<{
        favorites: Favorite[];
        onDelete: (id: string) => void;
        isDark?: boolean;
      }>
        rowCount={favorites.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={FavoriteRow}
        rowProps={{ favorites, onDelete, isDark }}
        style={{ height: listHeight, width: "100%" }}
        overscanCount={5}
      />
    </div>
  );
}
