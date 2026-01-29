"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { z } from "zod";
import { apiClient } from "@/shared/api/client";
import {
  StudioDetailSchema,
  SceneResponseSchema,
  CreateSceneRequestSchema,
  type StudioDetail,
  type LayoutType,
  type Source,
  type Scene,
} from "@/entities/studio/model";

const ApiResponseSceneSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: SceneResponseSchema,
});

export function useStudioMain(studioId: string) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("full");
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const defaultVideoSource: Source = useMemo(
    () => ({
      id: "default-webcam",
      type: "video" as const,
      name: "웹캠",
      isVisible: true,
    }),
    [],
  );

  const [sources, setSources] = useState<Source[]>([defaultVideoSource]);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);

  const displaySources = sources;

  const layoutElementsToSources = useCallback(
    (elements: unknown[] | null | undefined): Source[] => {
      if (!elements?.length) return [defaultVideoSource];
      const list = elements
        .filter(
          (e): e is Record<string, unknown> =>
            e != null && typeof e === "object" && "id" in e && "type" in e,
        )
        .map((e) => ({
          id: String(e.id),
          type: (e.type as Source["type"]) || "video",
          name: (e.name as string) || String(e.type),
          isVisible: e.visible !== false,
        }));
      const hasVideo = list.some((s) => s.type === "video");
      return hasVideo ? list : [defaultVideoSource, ...list];
    },
    [defaultVideoSource],
  );

  const activeScene = useMemo(() => {
    const list = studio?.scenes ?? [];
    const id = activeSceneId ? Number(activeSceneId) : undefined;
    return id ? list.find((s) => s.sceneId === id) : null;
  }, [studio?.scenes, activeSceneId]);

  useEffect(() => {
    if (!activeScene) {
      setSources([defaultVideoSource]);
      return;
    }
    const elements = activeScene.layout?.elements;
    setSources(layoutElementsToSources(Array.isArray(elements) ? elements : []));
  }, [activeScene?.sceneId, activeScene?.layout?.elements, layoutElementsToSources, defaultVideoSource]);

  const scenesForPanel: Scene[] = useMemo(() => {
    const list = studio?.scenes ?? [];
    return list.map((s) => ({
      id: String(s.sceneId),
      name: s.name,
      isActive: s.isActive ?? false,
    }));
  }, [studio?.scenes]);

  const fetchStudio = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        `/api/studios/${studioId}`,
        z.object({
          success: z.boolean(),
          message: z.string().optional(),
          data: StudioDetailSchema,
        }),
      );
      setStudio(response.data);
    } catch (error) {
      console.error("스튜디오 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    fetchStudio();
  }, [fetchStudio]);

  useEffect(() => {
    if (!studio?.scenes?.length || activeSceneId) return;
    const first = studio.scenes[0];
    const active = studio.scenes.find((s) => s.isActive);
    setActiveSceneId(String((active ?? first).sceneId));
  }, [studio?.scenes, activeSceneId]);

  const handleGoLive = () => {
    setIsLive(true);
    console.log("Go Live!");
  };

  const handleSceneSelect = (sceneId: string) => {
    setActiveSceneId(sceneId);
  };

  const handleAddScene = async () => {
    const sid = Number(studioId);
    if (Number.isNaN(sid)) return;
    try {
      await apiClient.post(
        `/api/studios/${sid}/scenes`,
        ApiResponseSceneSchema,
        { name: "New Scene" } as z.infer<typeof CreateSceneRequestSchema>,
      );
      await fetchStudio();
    } catch (error) {
      console.error("씬 추가 실패:", error);
    }
  };

  const handleRemoveScene = async (sceneId: string) => {
    const sid = Number(studioId);
    const sceneIdNum = Number(sceneId);
    if (Number.isNaN(sid) || Number.isNaN(sceneIdNum)) return;
    if (!confirm("이 씬을 삭제할까요?")) return;
    try {
      await apiClient.delete(
        `/api/studios/${sid}/scenes/${sceneIdNum}`,
        z.object({ success: z.boolean(), message: z.string().optional() }),
      );
      if (activeSceneId === sceneId) setActiveSceneId("");
      await fetchStudio();
    } catch (error) {
      console.error("씬 삭제 실패:", error);
    }
  };

  const handleAddSource = () => {
    setShowAddSourceDialog(true);
  };

  const handleAddSourceConfirm = useCallback(
    (type: "video" | "audio") => {
      const id =
        type === "video"
          ? `video-${Date.now()}`
          : `audio-${Date.now()}`;
      const name = type === "video" ? "웹캠" : "마이크";
      setSources((prev) => [
        ...prev,
        { id, type, name, isVisible: true },
      ]);
      setShowAddSourceDialog(false);
    },
    [],
  );

  const handleSourceToggle = useCallback((sourceId: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, isVisible: !s.isVisible } : s,
      ),
    );
  }, []);

  const handleSaveSceneLayout = useCallback(async () => {
    const sid = Number(studioId);
    const sceneIdNum = Number(activeSceneId);
    if (Number.isNaN(sid) || Number.isNaN(sceneIdNum) || !activeSceneId) return;
    try {
      const layout = {
        type: currentLayout,
        elements: sources.map((s) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          visible: s.isVisible,
        })),
      };
      await apiClient.put(
        `/api/studios/${sid}/scenes/${sceneIdNum}`,
        z.object({ success: z.boolean(), message: z.string().optional(), data: SceneResponseSchema }),
        { layout },
      );
      await fetchStudio();
    } catch (error) {
      console.error("씬 레이아웃 저장 실패:", error);
    }
  }, [studioId, activeSceneId, currentLayout, sources, fetchStudio]);

  const handleExit = () => {
    if (confirm("스튜디오를 나가시겠습니까?")) {
      if (user?.userId) {
        router.push(`/workspace/${user.userId}`);
      } else {
        router.back();
      }
    }
  };

  const setCurrentLayoutState = setCurrentLayout;
  const setIsVideoEnabledState = setIsVideoEnabled;
  const setIsAudioEnabledState = setIsAudioEnabled;

  return {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout: setCurrentLayoutState,
    activeSceneId,
    scenesForPanel,
    displaySources,
    isVideoEnabled,
    isAudioEnabled,
    isLive,
    handleGoLive,
    handleSceneSelect,
    handleAddScene,
    handleRemoveScene,
    handleAddSource,
    handleAddSourceConfirm,
    handleSourceToggle,
    handleSaveSceneLayout,
    handleExit,
    showAddSourceDialog,
    setShowAddSourceDialog,
    setIsVideoEnabled: setIsVideoEnabledState,
    setIsAudioEnabled: setIsAudioEnabledState,
  };
}
