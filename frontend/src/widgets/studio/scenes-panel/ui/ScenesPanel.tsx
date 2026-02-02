"use client";

import { useState, useCallback } from "react";
import { Plus, Minus, Save, Pencil } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import type { Scene } from "@/entities/studio/model";

interface ScenesPanelProps {
  scenes: Scene[];
  activeSceneId: string;
  onSceneSelect: (sceneId: string) => void;
  onAddScene: () => void;
  onRemoveScene: (sceneId: string) => void;
  /** 씬 이름 수정 (sceneId, newName) */
  onRenameScene?: (sceneId: string, name: string) => void;
  /** 편집 모드일 때만 표시. Live 시 씬 저장 비활성화(전환만 허용). */
  onSaveScene?: () => void;
  isEditMode?: boolean;
}

export function ScenesPanel({
  scenes,
  activeSceneId,
  onSceneSelect,
  onAddScene,
  onRemoveScene,
  onRenameScene,
  onSaveScene,
  isEditMode = true,
}: ScenesPanelProps) {
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startEdit = useCallback((scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditName(scene.name);
  }, []);

  const submitRename = useCallback(() => {
    if (!editingSceneId || !editName.trim() || !onRenameScene) return;
    onRenameScene(editingSceneId, editName.trim());
    setEditingSceneId(null);
    setEditName("");
  }, [editingSceneId, editName, onRenameScene]);

  const cancelEdit = useCallback(() => {
    setEditingSceneId(null);
    setEditName("");
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Scenes</h3>
      <div className="space-y-2">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            onClick={() => !editingSceneId && onSceneSelect(scene.id)}
            className={cn(
              "p-3 rounded-lg cursor-pointer transition-colors",
              activeSceneId === scene.id
                ? "bg-indigo-900/50 border-2 border-indigo-500"
                : "bg-gray-700/50 border-2 border-transparent hover:bg-gray-700",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              {editingSceneId === scene.id ? (
                <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-7 text-sm bg-gray-800 border-gray-600 text-gray-200"
                    placeholder="씬 이름"
                    maxLength={50}
                    autoFocus
                  />
                  <Button variant="ghost" size="sm" className="h-7 px-1 shrink-0" onClick={submitRename}>
                    저장
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-1 shrink-0" onClick={cancelEdit}>
                    취소
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "text-sm font-medium truncate flex-1 min-w-0",
                      activeSceneId === scene.id
                        ? "text-indigo-300"
                        : "text-gray-300",
                    )}
                  >
                    {scene.name}
                  </span>
                  {isEditMode && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {onRenameScene && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(scene);
                          }}
                          title="이름 수정"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {scenes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveScene(scene.id);
                          }}
                          title="씬 삭제"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        {isEditMode && onSaveScene && activeSceneId && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveScene}
            className="flex-1 bg-indigo-900/40 text-indigo-200 hover:bg-indigo-800/60 border-indigo-600"
          >
            <Save className="h-4 w-4 mr-2" />
            씬 저장
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddScene}
          className="flex-1 bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Scene
        </Button>
      </div>
    </div>
  );
}
