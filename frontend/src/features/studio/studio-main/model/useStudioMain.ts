"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import {
  ApiResponseRecordingSchema,
  type RecordingStartRequest,
} from "@/entities/recording/model";
import {
  getPreferredVideoDeviceId,
  getPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";
import { useAdaptivePerformance } from "@/hooks/studio";

const ApiResponseSceneSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: SceneResponseSchema,
});

export type GetPreviewStreamRef = {
  current: (() => MediaStream | null) | null;
};

/** 프리뷰 캔버스 내 소스별 위치·크기·레이어(드래그/리사이즈/z-order용) */
export interface SourceTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export function useStudioMain(
  studioId: string,
  options?: { getPreviewStreamRef?: GetPreviewStreamRef | null }
) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("full");
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const [sources, setSources] = useState<Source[]>([]);
  const [onStageSourceIds, setOnStageSourceIds] = useState<string[]>([]);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  const [previewResolution, setPreviewResolution] = useState<"720p" | "1080p">("720p");
  /** 소스별 위치·크기·zIndex (Konva 드래그/리사이즈/레이어 반영). 없으면 레이아웃 기본값 사용. */
  const [sourceTransforms, setSourceTransforms] = useState<Record<string, SourceTransform>>({});

  /** 프레임 드롭 시 해상도 자동 하향(적응형 성능) */
  useAdaptivePerformance({
    onDegraded: () =>
      setPreviewResolution((prev) => (prev === "1080p" ? "720p" : prev)),
    enabled: !!studio,
  });
  const [isRecordingLocal, setIsRecordingLocal] = useState(false);
  const [isRecordingCloud, setIsRecordingCloud] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const displaySources = useMemo(
    () => sources.filter((s) => onStageSourceIds.includes(s.id)),
    [sources, onStageSourceIds],
  );
  const canAddSource = !!activeSceneId;

  const stageSize = useMemo(
    () =>
      previewResolution === "1080p"
        ? { width: 1920, height: 1080 }
        : { width: 1280, height: 720 },
    [previewResolution],
  );

  const layoutElementsToSources = useCallback(
    (elements: unknown[] | null | undefined): Source[] => {
      if (!elements?.length) return [];
      let videoDeviceSet = false;
      let audioDeviceSet = false;
      const list = elements
        .filter(
          (e): e is Record<string, unknown> =>
            e != null && typeof e === "object" && "id" in e && "type" in e,
        )
        .map((e) => {
          const type = (e.type as Source["type"]) || "video";
          let deviceId: string | undefined;
          if (type === "video") {
            deviceId = videoDeviceSet
              ? (e.deviceId as string | undefined)
              : (videoDeviceSet = true, getPreferredVideoDeviceId() ?? undefined);
          } else if (type === "audio") {
            deviceId = audioDeviceSet
              ? (e.deviceId as string | undefined)
              : (audioDeviceSet = true, getPreferredAudioDeviceId() ?? undefined);
          } else {
            deviceId = e.deviceId as string | undefined;
          }
          return {
            id: String(e.id),
            type,
            name: (e.name as string) || String(e.type),
            isVisible: e.visible !== false,
            deviceId,
          };
        });
      return list;
    },
    [],
  );

  const activeScene = useMemo(() => {
    const list = studio?.scenes ?? [];
    const id = activeSceneId ? Number(activeSceneId) : undefined;
    return id ? list.find((s) => s.sceneId === id) : null;
  }, [studio?.scenes, activeSceneId]);

  const prevSceneIdRef = useRef<string>("");
  useEffect(() => {
    if (!activeScene) {
      prevSceneIdRef.current = "";
      setSources([]);
      setOnStageSourceIds([]);
      setSourceTransforms({});
      return;
    }
    const sceneId = activeSceneId ?? "";
    if (prevSceneIdRef.current !== sceneId) {
      prevSceneIdRef.current = sceneId;
      const elements = activeScene.layout?.elements;
      const rawElements = Array.isArray(elements) ? elements : [];
      const nextSources = layoutElementsToSources(rawElements);
      const nextTransforms: Record<string, SourceTransform> = {};
      rawElements.forEach((e, i) => {
        if (e == null || typeof e !== "object" || !("id" in e)) return;
        const id = String((e as Record<string, unknown>).id);
        const t = (e as Record<string, unknown>).transform;
        const defaultZ = rawElements.length - 1 - i;
        if (t != null && typeof t === "object" && "x" in t) {
          const tt = t as Record<string, unknown>;
          nextTransforms[id] = {
            x: Number(tt.x) || 0,
            y: Number(tt.y) || 0,
            width: Number(tt.width) || 0,
            height: Number(tt.height) || 0,
            zIndex: Number(tt.zIndex) ?? defaultZ,
          };
        }
      });
      setSources(nextSources);
      setOnStageSourceIds(nextSources.map((s) => s.id));
      setSourceTransforms(nextTransforms);
    }
  }, [activeSceneId, activeScene, layoutElementsToSources]);

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

  useEffect(() => {
    if (!studio?.scenes?.length) return;
    if (activeScene) return;
    const first = studio.scenes[0];
    setActiveSceneId(String(first.sceneId));
  }, [studio?.scenes, activeScene, activeSceneId]);

  useEffect(() => {
    if (!studio?.scenes?.length) return;
    const exists = studio.scenes.some((s) => String(s.sceneId) === activeSceneId);
    if (exists) return;
    setActiveSceneId(String(studio.scenes[0].sceneId));
  }, [studio?.scenes, activeSceneId]);

  useEffect(() => {
    setOnStageSourceIds((prev) => {
      const valid = prev.filter((id) => sources.some((s) => s.id === id));
      return valid.length === prev.length ? prev : valid;
    });
  }, [sources]);

  const displaySourceOrderKey = useMemo(
    () => displaySources.map((s) => s.id).join(","),
    [displaySources],
  );
  useEffect(() => {
    if (displaySources.length === 0) return;
    setSourceTransforms((prev) => {
      const next = { ...prev };
      displaySources.forEach((s, i) => {
        const z = displaySources.length - 1 - i;
        const current = prev[s.id];
        if (current != null) {
          next[s.id] = { ...current, zIndex: z };
        }
        // 저장된 transform이 없는 소스는 next에 넣지 않음 → PreviewArea getTransform이 arranged 기본값 사용
      });
      return next;
    });
  }, [displaySourceOrderKey, displaySources]);

  const handleGoLive = () => {
    setIsLive(true);
    setIsEditMode(false);
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
      await fetchStudio();
    } catch (error) {
      console.error("씬 삭제 실패:", error);
    }
  };

  const handleAddSource = () => {
    setShowAddSourceDialog(true);
  };

  const handleAddSourceConfirm = useCallback(
    (type: "video" | "audio" | "screen", deviceId?: string) => {
      const id =
        type === "video"
          ? `video-${Date.now()}`
          : type === "screen"
            ? `screen-${Date.now()}`
            : `audio-${Date.now()}`;
      const name = type === "video" ? "웹캠" : type === "screen" ? "화면 공유" : "마이크";
      const resolvedDeviceId =
        type === "screen"
          ? undefined
          : deviceId ??
            (type === "video"
              ? getPreferredVideoDeviceId() ?? undefined
              : getPreferredAudioDeviceId() ?? undefined);
      setSources((prev) => [
        ...prev,
        { id, type, name, isVisible: true, deviceId: resolvedDeviceId },
      ]);
      setShowAddSourceDialog(false);
    },
    [],
  );

  const setSourceTransform = useCallback((sourceId: string, partial: Partial<SourceTransform>) => {
    setSourceTransforms((prev) => {
      const current = prev[sourceId];
      const next: SourceTransform = {
        x: partial.x ?? current?.x ?? 0,
        y: partial.y ?? current?.y ?? 0,
        width: partial.width ?? current?.width ?? 0,
        height: partial.height ?? current?.height ?? 0,
        zIndex: partial.zIndex ?? current?.zIndex ?? 0,
      };
      return { ...prev, [sourceId]: next };
    });
  }, []);

  const handleAddToStage = useCallback(
    (sourceId: string) => {
      setOnStageSourceIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
      const source = sources.find((s) => s.id === sourceId);
      if (!source || !(source.type === "video" || source.type === "screen")) return;
      const { width: stageWidth, height: stageHeight } = stageSize;
      if (source.type === "video") {
        setSourceTransform(sourceId, {
          x: stageWidth * 0.75,
          y: stageHeight * 0.75,
          width: stageWidth * 0.25,
          height: stageHeight * 0.25,
          zIndex: 0,
        });
      } else if (source.type === "screen") {
        setSourceTransform(sourceId, {
          x: 0,
          y: 0,
          width: stageWidth,
          height: stageHeight,
          zIndex: 0,
        });
      }
    },
    [sources, stageSize, setSourceTransform],
  );

  const handleBringSourceToFront = useCallback((sourceId: string) => {
    setSources((prev) => {
      const firstOnStage = prev.findIndex((s) => onStageSourceIds.includes(s.id));
      const idx = prev.findIndex((s) => s.id === sourceId);
      if (idx < 0 || idx === firstOnStage) return prev;
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      next.splice(firstOnStage, 0, removed);
      return next;
    });
  }, [onStageSourceIds]);

  const handleRemoveFromStage = useCallback((sourceId: string) => {
    setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
  }, []);

  const handleSourceToggle = useCallback((sourceId: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, isVisible: !s.isVisible } : s,
      ),
    );
  }, []);

  const handleReorderSources = useCallback((newOrder: Source[]) => {
    setSources(newOrder);
  }, []);

  const handleSaveSceneLayout = useCallback(async () => {
    const sid = Number(studioId);
    const sceneIdNum = Number(activeSceneId);
    if (Number.isNaN(sid) || Number.isNaN(sceneIdNum) || !activeSceneId) return;
    try {
      const layout = {
        type: currentLayout,
        elements: displaySources.map((s) => {
          const t = sourceTransforms[s.id];
          return {
            id: s.id,
            type: s.type,
            name: s.name,
            visible: s.isVisible,
            ...(s.deviceId && { deviceId: s.deviceId }),
            ...(t &&
              t.width > 0 &&
              t.height > 0 && {
                transform: {
                  x: t.x,
                  y: t.y,
                  width: t.width,
                  height: t.height,
                  zIndex: t.zIndex,
                },
              }),
          };
        }),
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
  }, [studioId, activeSceneId, currentLayout, displaySources, sourceTransforms, fetchStudio]);

  const handleExit = () => {
    if (confirm("스튜디오를 나가시겠습니까?")) {
      if (user?.userId) {
        router.push(`/workspace/${user.userId}`);
      } else {
        router.back();
      }
    }
  };

  const getPreviewStreamRef = options?.getPreviewStreamRef;

  const handleStartLocalRecording = useCallback(() => {
    const getStream = getPreviewStreamRef?.current;
    const stream = getStream?.() ?? null;
    if (!stream || stream.getVideoTracks().length === 0) {
      console.warn("로컬 녹화: 캔버스 스트림을 사용할 수 없습니다.");
      return;
    }
    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `studio-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecordingLocal(true);
    } catch (err) {
      console.error("로컬 녹화 시작 실패:", err);
    }
  }, [getPreviewStreamRef]);

  const handleStopLocalRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecordingLocal(false);
  }, []);

  const handleStartCloudRecording = useCallback(async () => {
    const sid = Number(studioId);
    if (Number.isNaN(sid)) return;
    try {
      const body: RecordingStartRequest = {
        studioId: sid,
        outputFormat: "mp4",
        quality: "1080p",
      };
      await apiClient.post(
        "/api/recordings/start",
        ApiResponseRecordingSchema,
        body
      );
      setIsRecordingCloud(true);
    } catch (err) {
      console.error("클라우드 녹화 시작 실패:", err);
    }
  }, [studioId]);

  const handleStopCloudRecording = useCallback(async () => {
    const sid = Number(studioId);
    if (Number.isNaN(sid)) return;
    try {
      await apiClient.post(
        `/api/recordings/${sid}/stop`,
        ApiResponseRecordingSchema
      );
      setIsRecordingCloud(false);
    } catch (err) {
      console.error("클라우드 녹화 중지 실패:", err);
    }
  }, [studioId]);

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
    sources,
    displaySources,
    onStageSourceIds,
    canAddSource,
    isEditMode,
    setIsEditMode,
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
    handleAddToStage,
    handleRemoveFromStage,
    handleReorderSources,
    handleBringSourceToFront,
    handleSaveSceneLayout,
    handleExit,
    showAddSourceDialog,
    setShowAddSourceDialog,
    previewResolution,
    setPreviewResolution,
    sourceTransforms,
    setSourceTransform,
    setIsVideoEnabled: setIsVideoEnabledState,
    setIsAudioEnabled: setIsAudioEnabledState,
    isRecordingLocal,
    isRecordingCloud,
    handleStartLocalRecording,
    handleStopLocalRecording,
    handleStartCloudRecording,
    handleStopCloudRecording,
  };
}
