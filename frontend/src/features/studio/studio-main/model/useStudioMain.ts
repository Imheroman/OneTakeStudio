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
  UpdateSceneRequestSchema,
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
import { useAdaptivePerformance, useEditLock, useStudioStateSync, useStudioLiveKit, type StudioStateMessage } from "@/hooks/studio";
import { joinStream, leaveStream } from "@/shared/api/studio-stream";
import { startPublish, stopPublish, getPublishStatus } from "@/shared/api/studio-publish";
import { startChatIntegrationByDestinations, stopAllChatIntegrations } from "@/shared/api/chat-integration";
import { Room, RoomEvent, ConnectionState, createLocalTracks, Track } from "livekit-client";

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

  // LiveKit & 송출 상태
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<number[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [onStageSourceIds, setOnStageSourceIds] = useState<string[]>([]);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  // FULL_STATE_SYNC를 수신했는지 추적 (수신 시 씬 레이아웃 자동 로드 건너뛰기)
  const receivedFullStateSyncRef = useRef(false);

  const [previewResolution, setPreviewResolution] = useState<"720p" | "1080p">("720p");
  /** 소스별 위치·크기·zIndex (Konva 드래그/리사이즈/레이어 반영). 없으면 레이아웃 기본값 사용. */
  const [sourceTransforms, setSourceTransforms] = useState<Record<string, SourceTransform>>({});

  /** 프레임 드롭 시 해상도 자동 하향(적응형 성능) */
  useAdaptivePerformance({
    onDegraded: () =>
      setPreviewResolution((prev) => (prev === "1080p" ? "720p" : prev)),
    enabled: !!studio,
  });

  // 편집 락 관리
  const {
    lockStatus,
    isLoading: isLockLoading,
    hasLock,
    isLockedByOther,
    lockedByNickname,
    acquire: acquireLock,
    release: releaseLock,
    forceRelease: forceReleaseLock,
    refresh: refreshLockStatus,
  } = useEditLock({
    studioId: Number(studioId) || 0,
    userId: user?.userId || "",
    autoExtend: true,
    extendInterval: 2 * 60 * 1000, // 2분마다 갱신
  });

  // 실시간 상태 동기화 콜백
  const handleRemoteStateChange = useCallback((message: StudioStateMessage) => {
    console.log("[StateSync] 원격 상태 변경:", message.type, message.payload);

    switch (message.type) {
      case "LAYOUT_CHANGE":
        if (message.payload?.layout) {
          setCurrentLayout(message.payload.layout as LayoutType);
        }
        break;
      case "SOURCE_TRANSFORM":
        if (message.payload?.sourceId && message.payload?.transform) {
          const { sourceId, transform } = message.payload as { sourceId: string; transform: SourceTransform };
          setSourceTransforms((prev) => ({
            ...prev,
            [sourceId]: transform,
          }));
        }
        break;
      case "SOURCE_ADDED":
        if (message.payload?.source) {
          const newSource = message.payload.source as Source;
          setSources((prev) => {
            // 이미 존재하는 소스면 무시 (내가 추가한 소스)
            if (prev.some((s) => s.id === newSource.id)) {
              return prev;
            }
            // 원격에서 받은 소스는 isRemote: true로 마킹
            // 실제 스트림은 LiveKit을 통해 받음
            return [...prev, { ...newSource, isRemote: true }];
          });
        }
        break;
      case "SOURCE_REMOVED":
        if (message.payload?.sourceId) {
          const sourceId = message.payload.sourceId as string;
          setSources((prev) => prev.filter((s) => s.id !== sourceId));
          setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
        }
        break;
      case "SOURCE_TOGGLED":
        if (message.payload?.sourceId) {
          const sourceId = message.payload.sourceId as string;
          const isVisible = message.payload.isVisible as boolean;
          setSources((prev) =>
            prev.map((s) => (s.id === sourceId ? { ...s, isVisible } : s))
          );
        }
        break;
      case "SOURCE_REORDERED":
        if (message.payload?.sourceOrder) {
          const order = message.payload.sourceOrder as string[];
          setSources((prev) => {
            const sorted = [...prev].sort(
              (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
            );
            return sorted;
          });
        }
        break;
      case "SOURCE_BROUGHT_FRONT":
        if (message.payload?.sourceId) {
          const sourceId = message.payload.sourceId as string;
          setSources((prev) => {
            const idx = prev.findIndex((s) => s.id === sourceId);
            if (idx < 0) return prev;
            const next = [...prev];
            const [removed] = next.splice(idx, 1);
            next.unshift(removed);
            return next;
          });
        }
        break;
      case "SCENE_SELECTED":
        if (message.payload?.sceneId) {
          setActiveSceneId(message.payload.sceneId as string);
        }
        break;
      case "EDIT_MODE_CHANGED":
        if (typeof message.payload?.isEditMode === "boolean") {
          setIsEditMode(message.payload.isEditMode as boolean);
        }
        break;
      case "RESOLUTION_CHANGED":
        if (message.payload?.resolution) {
          setPreviewResolution(message.payload.resolution as "720p" | "1080p");
        }
        break;
      case "SOURCE_ADDED_TO_STAGE":
        if (message.payload?.sourceId) {
          const sourceId = message.payload.sourceId as string;
          setOnStageSourceIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
        }
        break;
      case "SOURCE_REMOVED_FROM_STAGE":
        if (message.payload?.sourceId) {
          const sourceId = message.payload.sourceId as string;
          setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
        }
        break;
      case "FULL_STATE_SYNC":
        // 다른 사용자의 전체 상태 수신 시 적용
        console.log("[StateSync] 전체 상태 동기화 수신 from", message.nickname, ":", message.payload);
        if (message.payload) {
          receivedFullStateSyncRef.current = true;
          console.log("[StateSync] receivedFullStateSyncRef = true 설정됨");
          const { onStageSourceIds: remoteOnStageIds, sourceTransforms: remoteTransforms, currentLayout: remoteLayout } = message.payload as {
            onStageSourceIds?: string[];
            sourceTransforms?: Record<string, SourceTransform>;
            currentLayout?: LayoutType;
          };
          if (remoteOnStageIds) {
            setOnStageSourceIds(remoteOnStageIds);
          }
          if (remoteTransforms) {
            setSourceTransforms(remoteTransforms);
          }
          if (remoteLayout) {
            setCurrentLayout(remoteLayout);
          }
        }
        break;
      default:
        break;
    }
  }, []);

  const handleRemoteLockChange = useCallback((message: StudioStateMessage) => {
    console.log("[StateSync] 락 상태 변경:", message.type);
    // 락 상태 변경 시 새로고침
    refreshLockStatus();
  }, [refreshLockStatus]);

  const handleRemotePresenceChange = useCallback((message: StudioStateMessage) => {
    console.log("[StateSync] 프레즌스 변경:", message.type, message.nickname);
    // TODO: 접속자 목록 UI 업데이트
  }, []);

  // 실시간 상태 동기화
  const {
    isConnected: isStateSyncConnected,
    onlineMembers,
    broadcastState,
    broadcastLayoutChange,
    broadcastSourceTransform,
    broadcastSceneSelected,
  } = useStudioStateSync({
    studioId: Number(studioId) || 0,
    userId: user?.userId || "",
    nickname: user?.nickname || "Guest",
    onStateChange: handleRemoteStateChange,
    onLockChange: handleRemoteLockChange,
    onPresenceChange: handleRemotePresenceChange,
  });

  // 화면 공유 종료 시 콜백 (브라우저에서 "공유 중지" 클릭 시)
  const handleTrackEnded = useCallback((sourceId: string) => {
    console.log("[StudioMain] 트랙 ended, 소스 제거:", sourceId);
    // 소스 제거
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
    setSourceTransforms((prev) => {
      const next = { ...prev };
      delete next[sourceId];
      return next;
    });
    // 브로드캐스트
    if (isStateSyncConnected) {
      broadcastState("SOURCE_REMOVED", { sourceId });
    }
  }, [isStateSyncConnected, broadcastState]);

  // LiveKit 실시간 미디어 공유
  const {
    isConnected: isLiveKitConnected,
    remoteSources,
    publishedTracks,
    publishVideoTrack,
    publishAudioTrack,
    publishScreenTrack,
    unpublishTrack,
    getRemoteStream,
  } = useStudioLiveKit({
    studioId: Number(studioId) || 0,
    userId: user?.userId || "",
    nickname: user?.nickname || "Guest",
    enabled: !isLoading && !!studio, // 스튜디오 로드 후 연결
    onTrackEnded: handleTrackEnded,
  });

  // 원격 소스의 trackSid를 업데이트 (LiveKit에서 받은 정보로)
  // SOURCE_ADDED로 받은 소스에는 trackSid가 없으므로, remoteSources에서 가져와서 업데이트
  useEffect(() => {
    if (!remoteSources.length) return;

    setSources((prev) => {
      let changed = false;
      const updated = prev.map((source) => {
        // 이미 trackSid가 있으면 스킵
        if (source.trackSid) return source;
        // 로컬 소스는 스킵
        if (!source.isRemote) return source;

        // remoteSources에서 같은 ID의 소스 찾기
        const remoteSource = remoteSources.find((rs) => rs.id === source.id);
        if (remoteSource) {
          changed = true;
          console.log("[StudioMain] 원격 소스 trackSid 업데이트:", source.id, remoteSource.trackSid);
          return {
            ...source,
            trackSid: remoteSource.trackSid,
            participantId: remoteSource.participantId,
            participantName: remoteSource.participantName,
          };
        }
        return source;
      });

      // remoteSources에는 있지만 sources에는 없는 새 소스 추가
      // (SOURCE_ADDED 브로드캐스트를 못 받은 경우)
      const existingIds = prev.map((s) => s.id);
      const newSources = remoteSources
        .filter((rs) => !existingIds.includes(rs.id))
        .map((rs) => ({
          id: rs.id,
          type: rs.type,
          name: `${rs.participantName}의 ${rs.type === "video" ? "카메라" : rs.type === "screen" ? "화면" : "오디오"}`,
          isVisible: true,
          isRemote: true,
          trackSid: rs.trackSid,
          participantId: rs.participantId,
          participantName: rs.participantName,
        }));

      if (newSources.length > 0) {
        changed = true;
        console.log("[StudioMain] 새 원격 소스 추가 (백스테이지):", newSources.length, "개");
        // 원격 소스는 백스테이지에만 추가, 스테이지에는 수동으로 추가해야 함
      }

      return changed ? [...updated, ...newSources] : prev;
    });
  }, [remoteSources]);

  // 원격 소스가 제거되면 sources에서도 제거
  useEffect(() => {
    const remoteIds = remoteSources.map((rs) => rs.id);
    setSources((prev) => {
      const filtered = prev.filter(
        (s) => !s.isRemote || remoteIds.includes(s.id)
      );
      return filtered.length === prev.length ? prev : filtered;
    });
    setOnStageSourceIds((prev) => {
      const filtered = prev.filter((id) => {
        const source = sources.find((s) => s.id === id);
        return !source?.isRemote || remoteIds.includes(id);
      });
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [remoteSources, sources]);

  // 새 멤버 입장 시 현재 상태 동기화 (refs를 사용하여 최신 상태 참조)
  const onStageSourceIdsRef = useRef(onStageSourceIds);
  const sourceTransformsRef = useRef(sourceTransforms);
  const currentLayoutRef = useRef(currentLayout);
  const prevOnlineMembersCountRef = useRef(0);
  onStageSourceIdsRef.current = onStageSourceIds;
  sourceTransformsRef.current = sourceTransforms;
  currentLayoutRef.current = currentLayout;

  useEffect(() => {
    // 새 멤버가 입장했을 때 (멤버 수 증가)
    const prevCount = prevOnlineMembersCountRef.current;
    const currentCount = onlineMembers.length;

    if (currentCount > prevCount && prevCount > 0 && isStateSyncConnected) {
      // 새 멤버가 입장하면 현재 상태 브로드캐스트 (빈 상태도 유효함)
      console.log("[StudioMain] 새 멤버 입장, 현재 상태 브로드캐스트:", {
        onStageSourceIds: onStageSourceIdsRef.current,
        sourceTransformsKeys: Object.keys(sourceTransformsRef.current),
        currentLayout: currentLayoutRef.current,
      });
      broadcastState("FULL_STATE_SYNC", {
        onStageSourceIds: onStageSourceIdsRef.current,
        sourceTransforms: sourceTransformsRef.current,
        currentLayout: currentLayoutRef.current,
      });
    }

    prevOnlineMembersCountRef.current = currentCount;
  }, [onlineMembers, isStateSyncConnected, broadcastState]);

  const [isRecordingLocal, setIsRecordingLocal] = useState(false);
  const [isRecordingCloud, setIsRecordingCloud] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 라이브 자동 녹화용 (수동 녹화와 분리)
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const autoRecorderRef = useRef<MediaRecorder | null>(null);
  const autoRecordedChunksRef = useRef<Blob[]>([]);

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
      // FULL_STATE_SYNC를 받은 경우 상태 초기화 안 함
      if (!receivedFullStateSyncRef.current) {
        setSources([]);
        setOnStageSourceIds([]);
        setSourceTransforms({});
      }
      return;
    }
    const sceneId = activeSceneId ?? "";
    if (prevSceneIdRef.current !== sceneId) {
      prevSceneIdRef.current = sceneId;

      // FULL_STATE_SYNC를 받았으면 씬 레이아웃에서 소스만 로드하고 스테이지 상태는 건너뛰기
      if (receivedFullStateSyncRef.current) {
        console.log("[StudioMain] FULL_STATE_SYNC 수신됨, 씬 레이아웃 스테이지 상태 건너뛰기");
        return;
      }

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
        if (current != null && current.width > 0 && current.height > 0) {
          next[s.id] = { ...current, zIndex: z };
        } else {
          next[s.id] = {
            x: current?.x ?? 0,
            y: current?.y ?? 0,
            width: current?.width ?? 0,
            height: current?.height ?? 0,
            zIndex: z,
          };
        }
      });
      return next;
    });
  }, [displaySourceOrderKey, displaySources]);

  // LiveKit 연결 및 송출 시작
  const getPreviewStreamRef = options?.getPreviewStreamRef;

  // 라이브 자동 녹화 시작 (라이브 시작 시 호출)
  const startAutoRecording = useCallback(() => {
    const getStream = getPreviewStreamRef?.current;
    const stream = getStream?.() ?? null;
    if (!stream || stream.getVideoTracks().length === 0) {
      console.warn("자동 녹화: 캔버스 스트림을 사용할 수 없습니다.");
      return;
    }

    try {
      autoRecordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          autoRecordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(autoRecordedChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const now = new Date();
          const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
          const fileName = `라이브녹화_${dateStr}.webm`;

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          console.log("라이브 녹화 완료: 자동 다운로드됨 -", fileName);
        }
        autoRecordedChunksRef.current = [];
      };

      recorder.start(1000);
      autoRecorderRef.current = recorder;
      setIsAutoRecording(true);
      console.log("라이브 자동 녹화 시작");
    } catch (err) {
      console.error("자동 녹화 시작 실패:", err);
    }
  }, [getPreviewStreamRef]);

  // 라이브 자동 녹화 중지 (라이브 종료 시 호출)
  const stopAutoRecording = useCallback(() => {
    const recorder = autoRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      autoRecorderRef.current = null;
    }
    setIsAutoRecording(false);
    console.log("라이브 자동 녹화 중지");
  }, []);

  const handleGoLive = useCallback(async (destinationIds?: number[]) => {
    const sid = Number(studioId);
    if (Number.isNaN(sid)) return;

    // 송출할 채널이 없으면 경고
    const destIds = destinationIds ?? selectedDestinationIds;
    if (destIds.length === 0) {
      setPublishError("송출할 채널을 선택해주세요.");
      return;
    }

    try {
      setIsGoingLive(true);
      setPublishError(null);

      // 1. LiveKit 스트림 연결
      if (!roomRef.current || roomRef.current.state !== ConnectionState.Connected) {
        const tokenResponse = await joinStream({
          studioId: sid,
          participantName: user?.nickname || "Host",
        });

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720, frameRate: 30 },
          },
        });

        room.on(RoomEvent.Disconnected, () => {
          setIsStreamConnected(false);
          console.log("Disconnected from LiveKit room");
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          setIsStreamConnected(state === ConnectionState.Connected);
        });

        await room.connect(tokenResponse.livekitUrl, tokenResponse.token);

        // Konva 캔버스 스트림에서 비디오 트랙 가져오기 (레이아웃 적용된 화면)
        const canvasStream = getPreviewStreamRef?.current?.();
        if (canvasStream) {
          const videoTracks = canvasStream.getVideoTracks();
          if (videoTracks.length > 0) {
            await room.localParticipant.publishTrack(videoTracks[0], {
              name: "canvas",
              source: Track.Source.Camera,
            });
            console.log("Published Konva canvas video track");
          }
        } else {
          // 캔버스 스트림이 없으면 기본 카메라 사용 (fallback)
          console.warn("Canvas stream not available, falling back to camera");
          const videoTrack = await createLocalTracks({ video: true, audio: false });
          for (const track of videoTrack) {
            await room.localParticipant.publishTrack(track);
          }
        }

        // 오디오 트랙 별도로 가져오기 (마이크)
        try {
          const audioTracks = await createLocalTracks({ video: false, audio: true });
          for (const track of audioTracks) {
            await room.localParticipant.publishTrack(track);
          }
          console.log("Published audio track");
        } catch (audioErr) {
          console.warn("Failed to get audio track:", audioErr);
        }

        roomRef.current = room;
        setIsStreamConnected(true);
        console.log("Connected to LiveKit room:", tokenResponse.roomName);
      }

      // 2. RTMP 송출 시작
      await startPublish({
        studioId: sid,
        destinationIds: destIds,
      });

      // 3. 채팅 연동 자동 시작 (YouTube, Twitch, Chzzk)
      try {
        const chatResults = await startChatIntegrationByDestinations(sid, destIds);
        chatResults.forEach((result) => {
          if (result.success) {
            console.log(`${result.platform} 채팅 연동 성공`);
          } else {
            console.warn(`${result.platform} 채팅 연동 실패: ${result.message}`);
          }
        });
      } catch (chatError) {
        console.warn("채팅 연동 시작 실패 (송출은 계속됨):", chatError);
      }

      setIsPublishing(true);
      setIsLive(true);
      setIsEditMode(false);
      console.log("Publishing started to destinations:", destIds);

      // 4. 자동 녹화 시작 (recordingStorage가 LOCAL인 경우)
      if (studio?.recordingStorage === "LOCAL") {
        // 약간의 딜레이 후 녹화 시작 (스트림 안정화)
        setTimeout(() => {
          startAutoRecording();
        }, 500);
      }
    } catch (error) {
      console.error("Go live failed:", error);
      const err = error as { message?: string; response?: { data?: { message?: string } } };
      setPublishError(err.response?.data?.message || err.message || "송출 시작에 실패했습니다.");
    } finally {
      setIsGoingLive(false);
    }
  }, [studioId, user?.nickname, selectedDestinationIds, getPreviewStreamRef, studio?.recordingStorage, startAutoRecording]);

  // 송출 중지 및 LiveKit 연결 해제
  const handleEndLive = useCallback(async () => {
    const sid = Number(studioId);
    if (Number.isNaN(sid)) return;

    try {
      // 0. 자동 녹화 중지 (가장 먼저 실행하여 녹화 데이터 손실 방지)
      if (isAutoRecording) {
        stopAutoRecording();
      }

      // 1. RTMP 송출 중지
      if (isPublishing) {
        await stopPublish(sid);
        setIsPublishing(false);
      }

      // 2. LiveKit 연결 해제
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
        setIsStreamConnected(false);
      }

      // 3. 채팅 연동 종료
      await stopAllChatIntegrations(sid).catch(console.error);

      // 4. 서버에 스트림 퇴장 알림
      await leaveStream(sid).catch(console.error);

      setIsLive(false);
      console.log("Live ended");
    } catch (error) {
      console.error("End live failed:", error);
    }
  }, [studioId, isPublishing, isAutoRecording, stopAutoRecording]);

  // 채널 선택 토글
  const handleToggleDestination = useCallback((destinationId: number) => {
    setSelectedDestinationIds((prev) =>
      prev.includes(destinationId)
        ? prev.filter((id) => id !== destinationId)
        : [...prev, destinationId]
    );
  }, []);

  // 송출 상태 조회
  const checkPublishStatus = useCallback(async () => {
    const sid = Number(studioId);
    if (Number.isNaN(sid) || !isPublishing) return null;

    try {
      return await getPublishStatus(sid);
    } catch (error) {
      console.error("Failed to get publish status:", error);
      return null;
    }
  }, [studioId, isPublishing]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // LiveKit 연결 해제
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      // 자동 녹화 중지
      if (autoRecorderRef.current?.state !== "inactive") {
        autoRecorderRef.current?.stop();
      }
      // 수동 녹화 중지
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    };
  }, []);

  const handleSceneSelect = useCallback((sceneId: string) => {
    setActiveSceneId(sceneId);
    if (isStateSyncConnected) {
      broadcastSceneSelected(sceneId);
    }
  }, [isStateSyncConnected, broadcastSceneSelected]);

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

  const handleUpdateScene = async (sceneId: string, payload: { name?: string }) => {
    const sid = Number(studioId);
    const sceneIdNum = Number(sceneId);
    if (Number.isNaN(sid) || Number.isNaN(sceneIdNum)) return;
    try {
      await apiClient.put(
        `/api/studios/${sid}/scenes/${sceneIdNum}`,
        ApiResponseSceneSchema,
        payload as z.infer<typeof UpdateSceneRequestSchema>,
      );
      await fetchStudio();
    } catch (error) {
      console.error("씬 수정 실패:", error);
    }
  };

  const handleAddSource = () => {
    setShowAddSourceDialog(true);
  };

  const handleAddSourceConfirm = useCallback(
    async (type: "video" | "audio" | "screen", deviceId?: string) => {
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
      const newSource: Source = { id, type, name, isVisible: true, deviceId: resolvedDeviceId, isRemote: false };
      setSources((prev) => [...prev, newSource]);
      setShowAddSourceDialog(false);
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_ADDED", { source: newSource });
      }

      // LiveKit에 트랙 publish (다른 참가자와 미디어 공유)
      console.log("[StudioMain] isLiveKitConnected:", isLiveKitConnected);
      if (isLiveKitConnected) {
        try {
          if (type === "video") {
            const trackSid = await publishVideoTrack(id, resolvedDeviceId);
            if (trackSid) {
              console.log("[StudioMain] 비디오 트랙 공유됨:", trackSid);
            }
          } else if (type === "screen") {
            const trackSid = await publishScreenTrack(id);
            if (trackSid) {
              console.log("[StudioMain] 화면 공유 트랙 공유됨:", trackSid);
            }
          } else if (type === "audio") {
            const trackSid = await publishAudioTrack(id, resolvedDeviceId);
            if (trackSid) {
              console.log("[StudioMain] 오디오 트랙 공유됨:", trackSid);
            }
          }
        } catch (err) {
          console.error("[StudioMain] 미디어 공유 실패:", err);
        }
      }
    },
    [isStateSyncConnected, broadcastState, isLiveKitConnected, publishVideoTrack, publishScreenTrack, publishAudioTrack],
  );

  const setSourceTransform = useCallback((sourceId: string, partial: Partial<SourceTransform>, broadcast = true) => {
    setSourceTransforms((prev) => {
      const current = prev[sourceId];
      const next: SourceTransform = {
        x: partial.x ?? current?.x ?? 0,
        y: partial.y ?? current?.y ?? 0,
        width: partial.width ?? current?.width ?? 0,
        height: partial.height ?? current?.height ?? 0,
        zIndex: partial.zIndex ?? current?.zIndex ?? 0,
      };
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (broadcast && isStateSyncConnected) {
        broadcastSourceTransform(sourceId, next);
      }
      return { ...prev, [sourceId]: next };
    });
  }, [isStateSyncConnected, broadcastSourceTransform]);

  const handleAddToStage = useCallback(
    (sourceId: string) => {
      setOnStageSourceIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
      const source = sources.find((s) => s.id === sourceId);

      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_ADDED_TO_STAGE", { sourceId });
      }

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
    [sources, stageSize, setSourceTransform, isStateSyncConnected, broadcastState],
  );

  const handleBringSourceToFront = useCallback((sourceId: string) => {
    setSources((prev) => {
      const firstOnStage = prev.findIndex((s) => onStageSourceIds.includes(s.id));
      const idx = prev.findIndex((s) => s.id === sourceId);
      if (idx < 0 || idx === firstOnStage) return prev;
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      next.splice(firstOnStage, 0, removed);
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_BROUGHT_FRONT", { sourceId });
      }
      return next;
    });
  }, [onStageSourceIds, isStateSyncConnected, broadcastState]);

  const handleRemoveFromStage = useCallback((sourceId: string) => {
    console.log("[StudioMain] Remove from stage:", sourceId);
    setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
    // 브로드캐스트 (연결된 모든 사용자가 공유)
    if (isStateSyncConnected) {
      console.log("[StudioMain] Broadcasting SOURCE_REMOVED_FROM_STAGE:", sourceId);
      broadcastState("SOURCE_REMOVED_FROM_STAGE", { sourceId });
    }
  }, [isStateSyncConnected, broadcastState]);

  const handleSourceToggle = useCallback((sourceId: string) => {
    setSources((prev) => {
      const source = prev.find((s) => s.id === sourceId);
      const newVisible = !source?.isVisible;
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_TOGGLED", { sourceId, isVisible: newVisible });
      }
      return prev.map((s) =>
        s.id === sourceId ? { ...s, isVisible: newVisible } : s,
      );
    });
  }, [isStateSyncConnected, broadcastState]);

  const handleReorderSources = useCallback((newOrder: Source[]) => {
    setSources(newOrder);
    // 브로드캐스트 (연결된 모든 사용자가 공유)
    if (isStateSyncConnected) {
      broadcastState("SOURCE_REORDERED", { sourceOrder: newOrder.map((s) => s.id) });
    }
  }, [isStateSyncConnected, broadcastState]);

  /** 백스테이지에서 소스 완전 제거(목록·스테이지에서 삭제) */
  const handleRemoveSource = useCallback(async (sourceId: string) => {
    // LiveKit에서 트랙 unpublish (로컬 소스인 경우만)
    const source = sources.find((s) => s.id === sourceId);
    if (source && !source.isRemote && isLiveKitConnected) {
      try {
        await unpublishTrack(sourceId);
        console.log("[StudioMain] 미디어 공유 해제됨:", sourceId);
      } catch (err) {
        console.error("[StudioMain] 미디어 공유 해제 실패:", err);
      }
    }

    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
    setSourceTransforms((prev) => {
      const next = { ...prev };
      delete next[sourceId];
      return next;
    });
    // 브로드캐스트 (연결된 모든 사용자가 공유)
    if (isStateSyncConnected) {
      broadcastState("SOURCE_REMOVED", { sourceId });
    }
  }, [sources, isStateSyncConnected, broadcastState, isLiveKitConnected, unpublishTrack]);

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

  // 레이아웃 변경 (브로드캐스트 포함)
  const setCurrentLayoutWithBroadcast = useCallback((layout: LayoutType) => {
    setCurrentLayout(layout);
    if (isStateSyncConnected) {
      broadcastLayoutChange(layout);
    }
  }, [isStateSyncConnected, broadcastLayoutChange]);

  // 편집 모드 변경 (브로드캐스트 포함)
  const setIsEditModeWithBroadcast = useCallback((editMode: boolean) => {
    setIsEditMode(editMode);
    if (isStateSyncConnected) {
      broadcastState("EDIT_MODE_CHANGED", { isEditMode: editMode });
    }
  }, [isStateSyncConnected, broadcastState]);

  // 해상도 변경 (브로드캐스트 포함)
  const setPreviewResolutionWithBroadcast = useCallback((resolution: "720p" | "1080p") => {
    setPreviewResolution(resolution);
    if (isStateSyncConnected) {
      broadcastState("RESOLUTION_CHANGED", { resolution });
    }
  }, [isStateSyncConnected, broadcastState]);

  const setIsVideoEnabledState = setIsVideoEnabled;
  const setIsAudioEnabledState = setIsAudioEnabled;

  return {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout: setCurrentLayoutWithBroadcast,
    activeSceneId,
    scenesForPanel,
    sources,
    displaySources,
    onStageSourceIds,
    canAddSource,
    isEditMode,
    setIsEditMode: setIsEditModeWithBroadcast,
    isVideoEnabled,
    isAudioEnabled,
    isLive,
    handleGoLive,
    handleEndLive,
    handleSceneSelect,
    handleAddScene,
    handleRemoveScene,
    handleUpdateScene,
    handleAddSource,
    handleAddSourceConfirm,
    handleSourceToggle,
    handleAddToStage,
    handleRemoveFromStage,
    handleReorderSources,
    handleRemoveSource,
    handleBringSourceToFront,
    handleSaveSceneLayout,
    handleExit,
    showAddSourceDialog,
    setShowAddSourceDialog,
    previewResolution,
    setPreviewResolution: setPreviewResolutionWithBroadcast,
    sourceTransforms,
    setSourceTransform,
    setIsVideoEnabled: setIsVideoEnabledState,
    setIsAudioEnabled: setIsAudioEnabledState,
    isRecordingLocal,
    isRecordingCloud,
    isAutoRecording,
    handleStartLocalRecording,
    handleStopLocalRecording,
    handleStartCloudRecording,
    handleStopCloudRecording,
    // 송출 관련
    isStreamConnected,
    isPublishing,
    isGoingLive,
    selectedDestinationIds,
    setSelectedDestinationIds,
    handleToggleDestination,
    checkPublishStatus,
    publishError,
    // 편집 락 관련
    lockStatus,
    isLockLoading,
    hasLock,
    isLockedByOther,
    lockedByNickname,
    acquireLock,
    releaseLock,
    forceReleaseLock,
    refreshLockStatus,
    // 상태 동기화 관련
    isStateSyncConnected,
    onlineMembers,
    // 실시간 미디어 공유 관련
    isLiveKitConnected,
    remoteSources,
    publishedTracks,
  };
}
