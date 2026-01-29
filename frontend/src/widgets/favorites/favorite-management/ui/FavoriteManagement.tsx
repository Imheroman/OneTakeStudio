"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FavoriteTable } from "@/widgets/favorites/favorite-table";
import { InviteMemberDialog } from "@/widgets/favorites/invite-member-dialog";
import { useFavoriteManagement } from "@/features/favorites/favorite-management";

export function FavoriteManagement() {
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
        <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={isMaxReached}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <FavoriteTable
        favorites={favorites}
        onDelete={handleDelete}
        isLoading={isLoading}
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
