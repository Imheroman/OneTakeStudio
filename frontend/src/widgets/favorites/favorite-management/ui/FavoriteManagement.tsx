"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FavoriteTable } from "@/widgets/favorites/favorite-table";
import { InviteMemberDialog } from "@/widgets/favorites/invite-member-dialog";
import { useFavoriteManagement } from "@/features/favorites/favorite-management";
import { cn } from "@/shared/lib/utils";

interface FavoriteManagementProps {
  isDark?: boolean;
}

export function FavoriteManagement({
  isDark = false,
}: FavoriteManagementProps) {
  const {
    favorites,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    existingFavoriteIds,
    isMaxReached,
    handleInvite,
    handleDelete,
    maxCount,
  } = useFavoriteManagement();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className={cn(
            "text-xl font-bold",
            isDark ? "text-gray-100" : "text-gray-900"
          )}
        >
          팀원
        </h2>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={isMaxReached}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          팀원 초대
        </Button>
      </div>

      <FavoriteTable
        favorites={favorites}
        onDelete={handleDelete}
        isLoading={isLoading}
        isDark={isDark}
      />

      <InviteMemberDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onInvite={handleInvite}
        existingFavoriteIds={existingFavoriteIds}
        maxCount={maxCount}
        currentCount={favorites.length}
      />
    </div>
  );
}
