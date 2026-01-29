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

const ApiResponseSceneSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: SceneResponseSchema,
});

/** Ref for a function that returns the preview canvas stream (used for local recording). */
export type GetPreviewStreamRef = {
  current: (() => MediaStream | null) | null;
};

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
  /** "Add to stage"로 PreviewArea에 올린 소스 ID. 백스테이지 소스는 여기 포함 시에만 메인 프리뷰에 표시 */
  const [onStageSourceIds, setOnStageSourceIds] = useState<string[]>([]);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  /** 편집 모드: true = OBS처럼 드래그/수정 가능, false = 라이브 모드(잠금, ON/OFF·프리셋만) */
  const [isEditMode, setIsEditMode] = useState(true);

  const [isRecordingLocal, setIsRecordingLocal] = useState(false);
  const [isRecordingCloud, setIsRecordingCloud] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  /** PreviewArea(메인 프리뷰)에 표시할 소스만. 백스테이지에 추가 후 Add to stage 한 것만 포함 */
  const displaySources = useMemo(
    () => sources.filter((s) => onStageSourceIds.includes(s.id)),
    [sources, onStageSourceIds],
  );
  /** 씬이 선택된 경우에만 소스 추가 가능 (씬 우선 플로우) */
  const canAddSource = !!activeSceneId;

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

  // 씬 우선 플로우: 선택된 씬에만 소스 종속. 씬 없으면 sources 비움, 씬 전환 시 해당 씬 레이아웃으로 동기화.
  const prevSceneIdRef = useRef<string>("");
  useEffect(() => {
    if (!activeScene) {
      prevSceneIdRef.current = "";
      setSources([]);
      setOnStageSourceIds([]);
      return;
    }
    const sceneId = activeSceneId ?? "";
    if (prevSceneIdRef.current !== sceneId) {
      prevSceneIdRef.current = sceneId;
      const elements = activeScene.layout?.elements;
      const nextSources = layoutElementsToSources(Array.isArray(elements) ? elements : []);
      setSources(nextSources);
      setOnStageSourceIds(nextSources.map((s) => s.id));
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

  // 최초 로드 시 또는 씬 목록만 바뀌었을 때 첫 씬 선택
  useEffect(() => {
    if (!studio?.scenes?.length || activeSceneId) return;
    const first = studio.scenes[0];
    const active = studio.scenes.find((s) => s.isActive);
    setActiveSceneId(String((active ?? first).sceneId));
  }, [studio?.scenes, activeSceneId]);

  // 씬이 2개 이상일 때: 선택된 씬이 없거나 삭제된 씬을 가리키면 남은 씬 중 첫 씬으로 복구
  useEffect(() => {
    if (!studio?.scenes?.length) return;
    if (activeScene) return;
    const first = studio.scenes[0];
    setActiveSceneId(String(first.sceneId));
  }, [studio?.scenes, activeScene, activeSceneId]);

  const handleGoLive = () => {
    setIsLive(true);
    setIsEditMode(false); // Go Live 시 잠금(편집 → 라이브)
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
      if (activeSceneId === sceneId) setActiveSceneId("");
    } catch (error) {
      console.error("씬 삭제 실패:", error);
    }
  };

  const handleAddSource = () => {
    setShowAddSourceDialog(true);
  };

  const handleAddSourceConfirm = useCallback(
    (type: "video" | "audio", deviceId?: string) => {
      const id =
        type === "video"
          ? `video-${Date.now()}`
          : `audio-${Date.now()}`;
      const name = type === "video" ? "웹캠" : "마이크";
      const resolvedDeviceId =
        deviceId ??
        (type === "video"
          ? getPreferredVideoDeviceId() ?? undefined
          : getPreferredAudioDeviceId() ?? undefined);
      setSources((prev) => [
        ...prev,
        { id, type, name, isVisible: true, deviceId: resolvedDeviceId },
      ]);
      setShowAddSourceDialog(false);
      // 새 소스는 백스테이지에 추가됨 → 백스테이지 영역에 미리보기 노출. Add to stage 시 PreviewArea에 추가
    },
    [],
  );

  const handleAddToStage = useCallback((sourceId: string) => {
    setOnStageSourceIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
  }, []);

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

  /** 백스테이지에서 드래그로 소스 순서 변경 */
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
        elements: sources.map((s) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          visible: s.isVisible,
          ...(s.deviceId && { deviceId: s.deviceId }),
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
    handleExit,
    showAddSourceDialog,
    setShowAddSourceDialog,
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
