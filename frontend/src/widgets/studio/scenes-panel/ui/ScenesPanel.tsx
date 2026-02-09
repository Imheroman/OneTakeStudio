"use client";

import { useState, useCallback } from "react";
import { Plus, Minus, Save, Pencil, ThumbsUp, Radio } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import type { Scene } from "@/entities/studio/model";

interface ScenesPanelProps {
  scenes: Scene[];
  /** 프리뷰에 표시 중인 장면 (클릭 시 변경) */
  previewSceneId: string;
  /** 송출 중인 장면 (isLive일 때만, 빨간 테두리) */
  broadcastSceneId: string;
  /** 장면 클릭 → 프리뷰 전환 (호스트/매니저 공통) */
  onSceneSelectForPreview: (sceneId: string) => void;
  /** 호스트: 송출 버튼 클릭 → 송출 장면 전환 (isLive일 때만) */
  onSceneBroadcast?: (sceneId: string) => void;
  /** 장면 추가. 이름은 필수 (모달에서 입력) */
  onAddScene: (name: string) => void;
  onRemoveScene: (sceneId: string) => void;
  /** 씬 이름 수정 (sceneId, newName) */
  onRenameScene?: (sceneId: string, name: string) => void;
  /** 편집 모드일 때만 표시. Live 시 씬 저장 비활성화(전환만 허용). */
  onSaveScene?: () => void;
  isEditMode?: boolean;
  /** 호스트 여부 (송출 버튼 표시용) */
  isHost?: boolean;
  /** 호스트·매니저: 장면 이름 변경/삭제 가능 */
  canRenameScene?: boolean;
  /** 매니저가 송출 중인 장면은 이름 변경/삭제 불가 */
  canEditScene?: (sceneId: string) => boolean;
  /** 방송 중 여부 */
  isLive?: boolean;
  /** 편집자가 장면 추천 (sceneId, sceneName). isLive && !isHost && isEditMode일 때 추천 버튼 표시 */
  onSceneRecommend?: (sceneId: string, sceneName: string) => void;
}

export function ScenesPanel({
  scenes,
  previewSceneId,
  broadcastSceneId,
  onSceneSelectForPreview,
  onSceneBroadcast,
  onAddScene,
  onRemoveScene,
  onRenameScene,
  onSaveScene,
  isEditMode = true,
  isHost = false,
  canRenameScene = true,
  canEditScene,
  isLive = false,
  onSceneRecommend,
}: ScenesPanelProps) {
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAddSceneModal, setShowAddSceneModal] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");

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

  const handleAddSceneConfirm = useCallback(() => {
    const trimmed = newSceneName.trim();
    if (!trimmed) return;
    onAddScene(trimmed);
    setShowAddSceneModal(false);
    setNewSceneName("");
  }, [newSceneName, onAddScene]);

  const handleAddSceneCancel = useCallback(() => {
    setShowAddSceneModal(false);
    setNewSceneName("");
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Scenes</h3>
      <div className="space-y-2">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            onClick={() => !editingSceneId && onSceneSelectForPreview(scene.id)}
            className={cn(
              "p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-700",
              // 송출 중인 장면: 빨간 테두리
              isLive &&
                broadcastSceneId === scene.id &&
                "bg-red-900/30 border-2 border-red-500",
              // 프리뷰 선택된 장면 (비송출 시 또는 송출과 다른 장면): 인디고
              (!isLive || broadcastSceneId !== scene.id) &&
                previewSceneId === scene.id &&
                "bg-indigo-900/50 border-2 border-indigo-500",
              // 그 외
              previewSceneId !== scene.id &&
                broadcastSceneId !== scene.id &&
                "bg-gray-700/50 border-2 border-transparent"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              {editingSceneId === scene.id ? (
                <div
                  className="flex-1 flex items-center gap-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 shrink-0"
                    onClick={submitRename}
                  >
                    저장
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 shrink-0"
                    onClick={cancelEdit}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "text-sm font-medium truncate flex-1 min-w-0",
                      isLive && broadcastSceneId === scene.id && "text-red-300",
                      (!isLive || broadcastSceneId !== scene.id) &&
                        previewSceneId === scene.id &&
                        "text-indigo-300",
                      previewSceneId !== scene.id &&
                        broadcastSceneId !== scene.id &&
                        "text-gray-300"
                    )}
                  >
                    {scene.name}
                  </span>
                  {/* 호스트 + Live: 송출 버튼 (현재 송출 장면이 아닐 때) */}
                  {isHost &&
                    isLive &&
                    onSceneBroadcast &&
                    broadcastSceneId !== scene.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-500/20 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneBroadcast(scene.id);
                        }}
                        title="이 장면으로 송출 전환"
                      >
                        <Radio className="h-3 w-3" />
                      </Button>
                    )}
                  {/* 매니저 + Live: 추천 버튼 */}
                  {!isHost &&
                    isLive &&
                    isEditMode &&
                    onSceneRecommend &&
                    broadcastSceneId !== scene.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneRecommend(scene.id, scene.name);
                        }}
                        title="호스트에게 이 장면 전환 추천"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                    )}
                  {(isEditMode || canRenameScene) &&
                    (!canEditScene || canEditScene(scene.id)) && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {onRenameScene && canRenameScene && (
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
                        {canRenameScene && scenes.length > 1 && (
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
        {isEditMode && onSaveScene && previewSceneId && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveScene}
            className="flex-1 bg-indigo-900/40 text-indigo-200 hover:bg-indigo-800/60 border-indigo-600"
          >
            <Save className="h-4 w-4 mr-2" />씬 저장
          </Button>
        )}
        {isEditMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSceneModal(true)}
              className="flex-1 bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Scene
            </Button>
            <Dialog
              open={showAddSceneModal}
              onOpenChange={(open) => {
                if (!open) handleAddSceneCancel();
              }}
            >
              <DialogContent showCloseButton={false} className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>장면 추가</DialogTitle>
                  <DialogDescription>
                    새 장면의 이름을 입력해주세요. 이름은 필수입니다.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="장면 이름"
                  maxLength={50}
                  className="bg-gray-800 border-gray-600 text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSceneConfirm();
                    if (e.key === "Escape") handleAddSceneCancel();
                  }}
                />
                <DialogFooter
                  showCloseButton={false}
                  className="gap-2 sm:gap-0"
                >
                  <Button
                    variant="outline"
                    onClick={handleAddSceneCancel}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleAddSceneConfirm}
                    disabled={!newSceneName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    저장
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
