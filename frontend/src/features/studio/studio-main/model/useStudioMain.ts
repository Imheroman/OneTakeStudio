"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
import {
  useAdaptivePerformance,
  useEditLock,
  useStudioStateSync,
  useStudioLiveKit,
  type StudioStateMessage,
} from "@/hooks/studio";
import { joinStream, leaveStream } from "@/shared/api/studio-stream";
import {
  startPublish,
  stopPublish,
  getPublishStatus,
} from "@/shared/api/studio-publish";
import {
  startChatIntegrationByDestinations,
  stopAllChatIntegrations,
} from "@/shared/api/chat-integration";
import {
  Room,
  RoomEvent,
  ConnectionState,
  createLocalTracks,
  Track,
} from "livekit-client";
import {
  arrangeSourcesInLayout,
  toNormalizedTransform,
  toPixelTransform,
  type NormalizedTransform,
  type PixelTransform,
} from "@/shared/lib/canvas";

const ApiResponseSceneSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: SceneResponseSchema,
});

export type GetPreviewStreamRef = {
  current: (() => MediaStream | null) | null;
};

/** 프리뷰 캔버스 내 소스별 위치·크기·레이어. 저장/동기화는 0~1 정규화 좌표(Virtual Canvas 대비). */
export type SourceTransform = NormalizedTransform;

export function useStudioMain(
  studioId: string,
  options?: {
    getPreviewStreamRef?: GetPreviewStreamRef | null;
    /** Go Live 직전 캡처용 레이어 1회 그리기 (화면공유 포함 프레임 확보) */
    requestCaptureDrawRef?: React.MutableRefObject<
      (() => Promise<void>) | null
    > | null;
  }
) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("full");
  /** 프리뷰에 표시할 장면 (클릭 시 변경, 호스트/매니저 공통) */
  const [previewSceneId, setPreviewSceneId] = useState<string>("");
  /** 송출 중인 장면 (호스트가 송출 버튼으로만 변경, isLive일 때만 의미 있음) */
  const [broadcastSceneId, setBroadcastSceneId] = useState<string>("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // LiveKit & 송출 상태
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<
    number[]
  >([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  /** handleGoLive에서 새로 만든 room이면 End Live 시 disconnect, 기존 room이면 disconnect 안 함 */
  const weCreatedRoomRef = useRef(false);
  /** Go Live 레이스 방지: 동시에 한 번만 실행 */
  const goLiveInProgressRef = useRef(false);
  /** End Live 레이스 방지 */
  const endLiveInProgressRef = useRef(false);

  const [sources, setSources] = useState<Source[]>([]);
  const [onStageSourceIds, setOnStageSourceIds] = useState<string[]>([]);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  // FULL_STATE_SYNC를 수신했는지 추적 (수신 시 씬 레이아웃 자동 로드 건너뛰기)
  const receivedFullStateSyncRef = useRef(false);

  const [previewResolution, setPreviewResolution] = useState<"720p" | "1080p">(
    "720p"
  );
  /** 소스별 위치·크기·zIndex (Konva 드래그/리사이즈/레이어 반영). 없으면 레이아웃 기본값 사용. */
  const [sourceTransforms, setSourceTransforms] = useState<
    Record<string, SourceTransform>
  >({});
  /** 편집 종료 시 저장 확인 모달용: 씬 레이아웃 미저장 변경 여부 */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /** 편집자가 추천한 장면 (호스트에게 표시할 확인 모달용) */
  const [recommendedScene, setRecommendedScene] = useState<{
    sceneId: string;
    sceneName: string;
    recommenderNickname: string;
  } | null>(null);

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
    studioId: studioId,
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
          const { sourceId, transform } = message.payload as {
            sourceId: string;
            transform: SourceTransform;
          };
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
          setBroadcastSceneId(message.payload.sceneId as string);
        }
        break;
      case "SCENE_RECOMMENDED":
        if (message.payload?.sceneId && message.payload?.sceneName) {
          setRecommendedScene({
            sceneId: message.payload.sceneId as string,
            sceneName: message.payload.sceneName as string,
            recommenderNickname: message.nickname || "편집자",
          });
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
          setOnStageSourceIds((prev) =>
            prev.includes(sourceId) ? prev : [...prev, sourceId]
          );
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
        console.log(
          "[StateSync] 전체 상태 동기화 수신 from",
          message.nickname,
          ":",
          message.payload
        );
        if (message.payload) {
          receivedFullStateSyncRef.current = true;
          console.log("[StateSync] receivedFullStateSyncRef = true 설정됨");
          const {
            onStageSourceIds: remoteOnStageIds,
            sourceTransforms: remoteTransforms,
            currentLayout: remoteLayout,
            broadcastSceneId: remoteBroadcastSceneId,
            previewResolution: remoteResolution,
            isEditMode: remoteIsEditMode,
          } = message.payload as {
            onStageSourceIds?: string[];
            sourceTransforms?: Record<string, SourceTransform>;
            currentLayout?: LayoutType;
            broadcastSceneId?: string;
            previewResolution?: "720p" | "1080p";
            isEditMode?: boolean;
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
          if (remoteBroadcastSceneId) {
            setBroadcastSceneId(remoteBroadcastSceneId);
            setPreviewSceneId(remoteBroadcastSceneId);
          }
          if (remoteResolution) {
            setPreviewResolution(remoteResolution);
          }
          if (remoteIsEditMode !== undefined) {
            setIsEditMode(remoteIsEditMode);
          }
        }
        break;
      default:
        break;
    }
  }, []);

  const handleRemoteLockChange = useCallback(
    (message: StudioStateMessage) => {
      console.log("[StateSync] 락 상태 변경:", message.type);
      // 락 상태 변경 시 새로고침
      refreshLockStatus();
    },
    [refreshLockStatus]
  );

  const handleRemotePresenceChange = useCallback(
    (message: StudioStateMessage) => {
      console.log("[StateSync] 프레즌스 변경:", message.type, message.nickname);
      // TODO: 접속자 목록 UI 업데이트
    },
    []
  );

  // 실시간 상태 동기화
  const {
    isConnected: isStateSyncConnected,
    onlineMembers,
    broadcastState,
    broadcastLayoutChange,
    broadcastSourceTransform,
    broadcastSceneSelected,
    broadcastSceneRecommended,
  } = useStudioStateSync({
    studioId: studioId,
    userId: user?.userId || "",
    nickname: user?.nickname || "Guest",
    onStateChange: handleRemoteStateChange,
    onLockChange: handleRemoteLockChange,
    onPresenceChange: handleRemotePresenceChange,
  });

  // 화면 공유 종료 시 콜백 (브라우저에서 "공유 중지" 클릭 시)
  const handleTrackEnded = useCallback(
    (sourceId: string) => {
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
    },
    [isStateSyncConnected, broadcastState]
  );

  // LiveKit 실시간 미디어 공유
  const {
    isConnected: isLiveKitConnected,
    getRoom,
    remoteSources,
    publishedTracks,
    localPublishedStreamsRef,
    publishVideoTrack,
    publishAudioTrack,
    publishScreenTrack,
    unpublishTrack,
    getRemoteStream,
  } = useStudioLiveKit({
    studioId: studioId,
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
          console.log(
            "[StudioMain] 원격 소스 trackSid 업데이트:",
            source.id,
            remoteSource.trackSid
          );
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
          name: `${rs.participantName}의 ${
            rs.type === "video"
              ? "카메라"
              : rs.type === "screen"
              ? "화면"
              : "오디오"
          }`,
          isVisible: true,
          isRemote: true,
          trackSid: rs.trackSid,
          participantId: rs.participantId,
          participantName: rs.participantName,
        }));

      if (newSources.length > 0) {
        changed = true;
        console.log(
          "[StudioMain] 새 원격 소스 추가 (백스테이지):",
          newSources.length,
          "개"
        );
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
  const broadcastSceneIdRef = useRef(broadcastSceneId);
  const previewResolutionRef = useRef(previewResolution);
  const isEditModeRef = useRef(isEditMode);
  const prevOnlineMembersCountRef = useRef(0);
  onStageSourceIdsRef.current = onStageSourceIds;
  sourceTransformsRef.current = sourceTransforms;
  currentLayoutRef.current = currentLayout;
  broadcastSceneIdRef.current = broadcastSceneId;
  previewResolutionRef.current = previewResolution;
  isEditModeRef.current = isEditMode;

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
        broadcastSceneId: broadcastSceneIdRef.current,
        previewResolution: previewResolutionRef.current,
        isEditMode: isEditModeRef.current,
      });
      broadcastState("FULL_STATE_SYNC", {
        onStageSourceIds: onStageSourceIdsRef.current,
        sourceTransforms: sourceTransformsRef.current,
        currentLayout: currentLayoutRef.current,
        broadcastSceneId: broadcastSceneIdRef.current,
        previewResolution: previewResolutionRef.current,
        isEditMode: isEditModeRef.current,
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
    [sources, onStageSourceIds]
  );
  const canAddSource = !!previewSceneId;

  const stageSize = useMemo(
    () =>
      previewResolution === "1080p"
        ? { width: 1920, height: 1080 }
        : { width: 1280, height: 720 },
    [previewResolution]
  );

  const layoutElementsToSources = useCallback(
    (elements: unknown[] | null | undefined): Source[] => {
      if (!elements?.length) return [];
      let videoDeviceSet = false;
      let audioDeviceSet = false;
      const list = elements
        .filter(
          (e): e is Record<string, unknown> =>
            e != null && typeof e === "object" && "id" in e && "type" in e
        )
        .map((e) => {
          const type = (e.type as Source["type"]) || "video";
          let deviceId: string | undefined;
          if (type === "video") {
            deviceId = videoDeviceSet
              ? (e.deviceId as string | undefined)
              : ((videoDeviceSet = true),
                getPreferredVideoDeviceId() ?? undefined);
          } else if (type === "audio") {
            deviceId = audioDeviceSet
              ? (e.deviceId as string | undefined)
              : ((audioDeviceSet = true),
                getPreferredAudioDeviceId() ?? undefined);
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
    []
  );

  const activeScene = useMemo(() => {
    const list = studio?.scenes ?? [];
    const id = previewSceneId ? Number(previewSceneId) : undefined;
    return id ? list.find((s) => s.sceneId === id) : null;
  }, [studio?.scenes, previewSceneId]);

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
    const sceneId = previewSceneId ?? "";
    if (prevSceneIdRef.current !== sceneId) {
      prevSceneIdRef.current = sceneId;

      // FULL_STATE_SYNC를 받았으면 씬 레이아웃에서 소스만 로드하고 스테이지 상태는 건너뛰기
      if (receivedFullStateSyncRef.current) {
        console.log(
          "[StudioMain] FULL_STATE_SYNC 수신됨, 씬 레이아웃 스테이지 상태 건너뛰기"
        );
        return;
      }

      const elements = activeScene.layout?.elements;
      const rawElements = Array.isArray(elements) ? elements : [];
      const nextSources = layoutElementsToSources(rawElements);
      const { width: stageW, height: stageH } = stageSize;
      const nextTransforms: Record<string, SourceTransform> = {};
      rawElements.forEach((e, i) => {
        if (e == null || typeof e !== "object" || !("id" in e)) return;
        const id = String((e as Record<string, unknown>).id);
        const t = (e as Record<string, unknown>).transform;
        const defaultZ = rawElements.length - 1 - i;
        if (t != null && typeof t === "object" && "x" in t) {
          const tt = t as Record<string, unknown>;
          const raw: PixelTransform = {
            x: Number(tt.x) || 0,
            y: Number(tt.y) || 0,
            width: Number(tt.width) || 0,
            height: Number(tt.height) || 0,
            zIndex: Number(tt.zIndex) ?? defaultZ,
          };
          nextTransforms[id] =
            raw.width > 1 || raw.height > 1
              ? toNormalizedTransform(raw, stageW, stageH)
              : raw;
        }
      });
      setSources(nextSources);
      setOnStageSourceIds(nextSources.map((s) => s.id));
      setSourceTransforms(nextTransforms);
      setHasUnsavedChanges(false);
    }
  }, [previewSceneId, activeScene, layoutElementsToSources, stageSize]);

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
        })
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
    if (!studio?.scenes?.length || previewSceneId) return;
    const first = studio.scenes[0];
    const active = studio.scenes.find((s) => s.isActive);
    const id = String((active ?? first).sceneId);
    setPreviewSceneId(id);
    setBroadcastSceneId(id);
  }, [studio?.scenes, previewSceneId]);

  useEffect(() => {
    if (!studio?.scenes?.length) return;
    if (activeScene) return;
    const first = studio.scenes[0];
    const id = String(first.sceneId);
    setPreviewSceneId(id);
    setBroadcastSceneId(id);
  }, [studio?.scenes, activeScene, previewSceneId]);

  useEffect(() => {
    if (!studio?.scenes?.length) return;
    const exists = studio.scenes.some(
      (s) => String(s.sceneId) === previewSceneId
    );
    if (exists) return;
    const id = String(studio.scenes[0].sceneId);
    setPreviewSceneId(id);
    setBroadcastSceneId(id);
  }, [studio?.scenes, previewSceneId]);

  // Go Live 시 broadcastSceneId를 현재 previewSceneId로 설정
  const prevIsLiveRef = useRef(false);
  useEffect(() => {
    if (isLive && !prevIsLiveRef.current && previewSceneId) {
      setBroadcastSceneId(previewSceneId);
    }
    prevIsLiveRef.current = isLive;
  }, [isLive, previewSceneId]);

  useEffect(() => {
    setOnStageSourceIds((prev) => {
      const valid = prev.filter((id) => sources.some((s) => s.id === id));
      return valid.length === prev.length ? prev : valid;
    });
  }, [sources]);

  const displaySourceOrderKey = useMemo(
    () => displaySources.map((s) => s.id).join(","),
    [displaySources]
  );
  useEffect(() => {
    if (displaySources.length === 0) return;
    const { width: stageWidth, height: stageHeight } = stageSize;
    setSourceTransforms((prev) => {
      const sorted = [...displaySources].sort(
        (a, b) => (prev[a.id]?.zIndex ?? 0) - (prev[b.id]?.zIndex ?? 0)
      );
      const arranged = arrangeSourcesInLayout(
        currentLayout,
        sorted.map((s, i) => ({ source: s, index: i })),
        stageWidth,
        stageHeight
      );
      const next: Record<string, SourceTransform> = { ...prev };
      const isPipLayout =
        displaySources.length === 2 &&
        displaySources.some((s) => s.type === "screen") &&
        displaySources.some((s) => s.type === "video");
      // arranged 순서로 할당 (pip: 화면공유 전체→cell0, 웹캠 작게→cell1)
      // pip: 웹캠이 오버레이이므로 앞에 보여야 함 → zIndex 역순 (arranged[0]=화면 z0, arranged[1]=웹캠 z1)
      arranged.forEach((item, i) => {
        const s = item.source;
        const z = isPipLayout ? i : displaySources.length - 1 - i;
        const current = prev[s.id];
        const cell = item;
        const hasValidTransform =
          current != null && current.width > 0 && current.height > 0;
        if (hasValidTransform && !isPipLayout) {
          next[s.id] = { ...current, zIndex: z };
        } else if (cell) {
          next[s.id] = toNormalizedTransform(
            {
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              zIndex: z,
            },
            stageWidth,
            stageHeight
          );
        } else {
          next[s.id] = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            zIndex: z,
          };
        }
      });
      return next;
    });
  }, [displaySourceOrderKey, displaySources, currentLayout, stageSize]);

  // LiveKit 연결 및 송출 시작
  const getPreviewStreamRef = options?.getPreviewStreamRef;
  const requestCaptureDrawRef = options?.requestCaptureDrawRef;

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
        const blob = new Blob(autoRecordedChunksRef.current, {
          type: mimeType,
        });
        if (blob.size > 0) {
          const now = new Date();
          const dateStr = `${now.getFullYear()}${String(
            now.getMonth() + 1
          ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
            now.getHours()
          ).padStart(2, "0")}${String(now.getMinutes()).padStart(
            2,
            "0"
          )}${String(now.getSeconds()).padStart(2, "0")}`;
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

  /** 다음 N프레임 대기 (캔버스 캡처 타이밍 보정) */
  const waitForFrames = useCallback((count: number) => {
    return new Promise<void>((resolve) => {
      let n = 0;
      const tick = () => {
        n += 1;
        if (n >= count) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, []);

  const handleStartCloudRecording = useCallback(async () => {
    if (!studioId) return;
    try {
      const body: RecordingStartRequest = {
        studioId: studioId,
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
    if (!studioId) return;
    try {
      await apiClient.post(
        `/api/recordings/${studioId}/stop`,
        ApiResponseRecordingSchema
      );
      setIsRecordingCloud(false);
    } catch (err) {
      console.error("클라우드 녹화 중지 실패:", err);
    }
  }, [studioId]);

  const handleGoLive = useCallback(
    async (destinationIds?: number[]) => {
      if (!studioId) return;

      // 레이스 방지: 이미 실행 중이면 무시
      if (goLiveInProgressRef.current) {
        console.warn("[GoLive] 이미 진행 중, 무시");
        return;
      }
      goLiveInProgressRef.current = true;

      // 송출할 채널이 없으면 경고
      const destIds = destinationIds ?? selectedDestinationIds;
      if (destIds.length === 0) {
        setPublishError("송출할 채널을 선택해주세요.");
        goLiveInProgressRef.current = false;
        return;
      }

      // 스테이지에 올라간 소스가 없으면 송출 차단 (빈 캔버스 송출 방지)
      const onStageIds = onStageSourceIds;
      if (!onStageIds.length) {
        setPublishError("스테이지에 소스를 추가한 뒤 송출을 시작해주세요.");
        goLiveInProgressRef.current = false;
        return;
      }

      try {
        setIsGoingLive(true);
        setPublishError(null);

        // 1. LiveKit: 이미 연결된 room 재사용 (화면공유/웹캠 유지), 없으면 새로 연결
        const existingRoom = getRoom();
        const room =
          existingRoom?.state === ConnectionState.Connected
            ? existingRoom
            : null;

        if (!room) {
          weCreatedRoomRef.current = true;
          const tokenResponse = await joinStream({
            studioId: studioId,
            participantName: user?.nickname || "Host",
          });

          const newRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
              resolution: { width: 1280, height: 720, frameRate: 30 },
            },
          });

          newRoom.on(RoomEvent.Disconnected, () => {
            setIsStreamConnected(false);
            console.log("Disconnected from LiveKit room");
          });

          newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
            setIsStreamConnected(state === ConnectionState.Connected);
          });

          await newRoom.connect(tokenResponse.livekitUrl, tokenResponse.token);
          roomRef.current = newRoom;
          setIsStreamConnected(true);
          console.log("Connected to LiveKit room:", tokenResponse.roomName);
        } else {
          weCreatedRoomRef.current = false;
          roomRef.current = room;
        }

        const roomToUse = room ?? roomRef.current;
        if (!roomToUse) throw new Error("Room not available");

        // 송출용으로 캔버스 1개만 보내기: 기존 비디오/화면공유 unpublish (캔버스에 이미 합성됨)
        const displaySourceIds = sources
          .filter((s) => onStageSourceIds.includes(s.id))
          .map((s) => s.id);
        for (const source of sources) {
          if (
            (source.type === "video" || source.type === "screen") &&
            !source.isRemote &&
            displaySourceIds.includes(source.id)
          ) {
            // keepTrackAlive: 캔버스가 아직 이 스트림으로 그리므로 track.stop() 하지 않음
            await unpublishTrack(source.id, { keepTrackAlive: true });
          }
        }

        // unpublish 반영·Room 상태 전파 대기 (레이스 완화)
        await new Promise((r) => setTimeout(r, 120));
        await waitForFrames(3);

        // Phase 1: 캡처용 레이어를 명시적으로 1회 그린 뒤 스트림 획득 (화면공유 포함)
        await requestCaptureDrawRef?.current?.();
        // 화면공유가 스테이지에 있으면 video 엘리먼트 첫 프레임 반영을 위해 추가 대기
        const hasScreenOnStage = sources.some(
          (s) =>
            s.type === "screen" &&
            !s.isRemote &&
            displaySourceIds.includes(s.id)
        );
        if (hasScreenOnStage) {
          await new Promise((r) => setTimeout(r, 200));
          await requestCaptureDrawRef?.current?.();
        }
        const canvasStream = getPreviewStreamRef?.current?.();
        if (canvasStream) {
          const videoTracks = canvasStream.getVideoTracks();
          if (videoTracks.length > 0) {
            const track = videoTracks[0];
            const settings = track.getSettings();
            console.log(
              "[GoLive] Virtual Canvas Stage 스트림:",
              settings.width,
              "x",
              settings.height,
              "@",
              settings.frameRate,
              "fps"
            );
            // Virtual Canvas Stage 해상도 검증 (720p/1080p만 허용)
            const expectedResolutions = [
              { w: 1280, h: 720 },
              { w: 1920, h: 1080 },
            ];
            const isValidResolution = expectedResolutions.some(
              (r) =>
                Math.abs((settings.width ?? 0) - r.w) < 10 &&
                Math.abs((settings.height ?? 0) - r.h) < 10
            );
            if (!isValidResolution) {
              console.warn(
                "[GoLive] 경고: Virtual Canvas Stage 해상도가 예상과 다릅니다:",
                settings.width,
                "x",
                settings.height,
                "(예상: 1280x720 또는 1920x1080)"
              );
            }
            await roomToUse.localParticipant.publishTrack(track, {
              name: "canvas",
              source: Track.Source.Camera,
            });
            console.log("[GoLive] Virtual Canvas Stage 트랙 publish 완료");
            // 백스테이지(화면공유 등)가 송출되지 않도록: 캔버스 외 비디오 트랙은 모두 unpublish
            const canvasTrackName = "canvas";
            const videoPubs = Array.from(
              roomToUse.localParticipant.trackPublications.values()
            ).filter((p) => p.kind === "video");
            console.log(
              "[GoLive] 현재 비디오 트랙 수:",
              videoPubs.length,
              videoPubs.map((p) => p.trackName)
            );
            for (const pub of videoPubs) {
              if (pub.trackName !== canvasTrackName && pub.track) {
                await roomToUse.localParticipant.unpublishTrack(pub.track);
                console.log(
                  "[GoLive] 비캔버스 비디오 트랙 제거:",
                  pub.trackName
                );
              }
            }
            // 최종 확인: 비디오 트랙이 "canvas" 하나만 남았는지 검증
            const finalVideoPubs = Array.from(
              roomToUse.localParticipant.trackPublications.values()
            ).filter((p) => p.kind === "video");
            if (
              finalVideoPubs.length !== 1 ||
              finalVideoPubs[0].trackName !== canvasTrackName
            ) {
              console.error(
                "[GoLive] 오류: Virtual Canvas Stage 외 비디오 트랙이 남아있습니다:",
                finalVideoPubs.map((p) => p.trackName)
              );
            } else {
              console.log(
                "[GoLive] 검증 완료: Virtual Canvas Stage 트랙만 남음"
              );
            }
            // Egress가 단일 트랙만 받도록 추가 대기 (서버 반영 시간)
            await new Promise((r) => setTimeout(r, 300));
          }
        } else {
          console.warn("Canvas stream not available, falling back to camera");
          const videoTrack = await createLocalTracks({
            video: true,
            audio: false,
          });
          for (const track of videoTrack) {
            await roomToUse.localParticipant.publishTrack(track);
          }
        }

        // 오디오 트랙 (없으면 publish)
        const hasAudio = Array.from(
          roomToUse.localParticipant.trackPublications.values()
        ).some((p) => p.kind === "audio");
        if (!hasAudio) {
          try {
            const audioTracks = await createLocalTracks({
              video: false,
              audio: true,
            });
            for (const track of audioTracks) {
              await roomToUse.localParticipant.publishTrack(track);
            }
            console.log("Published audio track");
          } catch (audioErr) {
            console.warn("Failed to get audio track:", audioErr);
          }
        }

        // 2. RTMP 송출 시작 (캔버스 트랙이 room에 반영될 짧은 대기)
        await new Promise((r) => setTimeout(r, 150));
        await startPublish({
          studioId: studioId,
          destinationIds: destIds,
        });

        // 3. 채팅 연동 자동 시작 (YouTube, Twitch, Chzzk)
        try {
          const chatResults = await startChatIntegrationByDestinations(
            studioId,
            destIds
          );
          chatResults.forEach((result) => {
            if (result.success) {
              console.log(`${result.platform} 채팅 연동 성공`);
            } else {
              console.warn(
                `${result.platform} 채팅 연동 실패: ${result.message}`
              );
            }
          });
        } catch (chatError) {
          console.warn("채팅 연동 시작 실패 (송출은 계속됨):", chatError);
        }

        setIsPublishing(true);
        setIsLive(true);
        setIsEditMode(false);
        console.log("Publishing started to destinations:", destIds);

        // 4. 자동 녹화 시작
        if (studio?.recordingStorage === "LOCAL") {
          // 약간의 딜레이 후 로컬 녹화 시작 (스트림 안정화)
          setTimeout(() => {
            startAutoRecording();
          }, 500);
        } else if (studio?.recordingStorage === "CLOUD") {
          // 클라우드 녹화: 서버 측 Egress 시작
          handleStartCloudRecording();
        }
      } catch (error) {
        console.error("Go live failed:", error);
        const err = error as {
          message?: string;
          response?: { data?: { message?: string } };
        };
        setPublishError(
          err.response?.data?.message ||
            err.message ||
            "송출 시작에 실패했습니다."
        );
      } finally {
        setIsGoingLive(false);
        goLiveInProgressRef.current = false;
      }
    },
    [
      studioId,
      user?.nickname,
      selectedDestinationIds,
      getPreviewStreamRef,
      requestCaptureDrawRef,
      studio?.recordingStorage,
      startAutoRecording,
      handleStartCloudRecording,
      getRoom,
      sources,
      onStageSourceIds,
      unpublishTrack,
      waitForFrames,
    ]
  );

  // 송출 중지 및 LiveKit 연결 해제
  const handleEndLive = useCallback(async () => {
    if (!studioId) return;

    if (endLiveInProgressRef.current) {
      console.warn("[EndLive] 이미 진행 중, 무시");
      return;
    }
    endLiveInProgressRef.current = true;

    try {
      // 0. 녹화 중지 (가장 먼저 실행하여 녹화 데이터 손실 방지)
      if (isAutoRecording) {
        stopAutoRecording();
      }
      if (isRecordingCloud) {
        await handleStopCloudRecording();
      }

      // 1. RTMP 송출 중지
      if (isPublishing) {
        await stopPublish(studioId);
        setIsPublishing(false);
      }

      // 2. 캔버스 트랙 unpublish 후, Go Live에서 새로 만든 room만 disconnect
      const room = roomRef.current;
      if (room) {
        const canvasPub = Array.from(
          room.localParticipant.trackPublications.values()
        ).find((p) => p.trackName === "canvas");
        if (canvasPub?.track) {
          await room.localParticipant.unpublishTrack(canvasPub.track);
        }
        if (weCreatedRoomRef.current) {
          await room.disconnect();
          roomRef.current = null;
          setIsStreamConnected(false);
        }
      }

      // 3. 채팅 연동 종료
      await stopAllChatIntegrations(studioId).catch(console.error);

      // 4. 서버에 스트림 퇴장 알림
      await leaveStream(studioId).catch(console.error);

      setIsLive(false);
      console.log("Live ended");
    } catch (error) {
      console.error("End live failed:", error);
    } finally {
      endLiveInProgressRef.current = false;
    }
  }, [studioId, isPublishing, isAutoRecording, stopAutoRecording, isRecordingCloud, handleStopCloudRecording]);

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
    if (!studioId || !isPublishing) return null;

    try {
      return await getPublishStatus(studioId);
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

  /** 호스트 여부 (장면 전환·추천 수신 가능) */
  const isHost = (studio?.myRole?.toUpperCase?.() ?? "") === "HOST";

  /** 장면 클릭 → 프리뷰 전환 (호스트/매니저 공통, 송출과 무관) */
  const handleSceneSelectForPreview = useCallback((sceneId: string) => {
    setPreviewSceneId(sceneId);
  }, []);

  /** 호스트: 송출 버튼 클릭 → 송출 장면 전환 및 브로드캐스트 */
  const handleSceneBroadcast = useCallback(
    (sceneId: string) => {
      setBroadcastSceneId(sceneId);
      setPreviewSceneId(sceneId); // 송출 전환 시 해당 장면 레이아웃 로드
      if (isStateSyncConnected) {
        broadcastSceneSelected(sceneId);
      }
    },
    [isStateSyncConnected, broadcastSceneSelected]
  );

  /** 편집자가 장면 추천 (방송 중에만, 호스트가 아님 + 편집 권한 있을 때) */
  const handleRecommendScene = useCallback(
    (sceneId: string, sceneName: string) => {
      if (isStateSyncConnected) {
        broadcastSceneRecommended(sceneId, sceneName);
      }
    },
    [isStateSyncConnected, broadcastSceneRecommended]
  );

  /** 호스트: 추천 장면 전환 확인 → 송출 장면 변경 */
  const handleRecommendationConfirm = useCallback(() => {
    if (recommendedScene) {
      handleSceneBroadcast(recommendedScene.sceneId);
      setRecommendedScene(null);
    }
  }, [recommendedScene, handleSceneBroadcast]);

  /** 호스트: 추천 장면 전환 취소 */
  const handleRecommendationCancel = useCallback(() => {
    setRecommendedScene(null);
  }, []);

  const handleAddScene = useCallback(
    async (name: string) => {
      const trimmed = name?.trim();
      if (!studioId || !trimmed) return;
      try {
        const response = await apiClient.post(
          `/api/studios/${studioId}/scenes`,
          ApiResponseSceneSchema,
          { name: trimmed } as z.infer<typeof CreateSceneRequestSchema>
        );
        await fetchStudio();
        // 생성 직후 해당 장면으로 전환하여 소스 추가·편집 가능
        const newSceneId = response.data?.sceneId;
        if (newSceneId != null) {
          setPreviewSceneId(String(newSceneId));
        }
      } catch (error) {
        console.error("씬 추가 실패:", error);
      }
    },
    [studioId, fetchStudio]
  );

  const handleRemoveScene = async (sceneId: string) => {
    const sceneIdNum = Number(sceneId);
    if (!studioId || Number.isNaN(sceneIdNum)) return;
    if (!confirm("이 씬을 삭제할까요?")) return;
    try {
      await apiClient.delete(
        `/api/studios/${studioId}/scenes/${sceneIdNum}`,
        z.object({ success: z.boolean(), message: z.string().optional() })
      );
      await fetchStudio();
    } catch (error) {
      console.error("씬 삭제 실패:", error);
    }
  };

  const handleUpdateScene = async (
    sceneId: string,
    payload: { name?: string }
  ) => {
    const sceneIdNum = Number(sceneId);
    if (!studioId || Number.isNaN(sceneIdNum)) return;
    try {
      await apiClient.put(
        `/api/studios/${studioId}/scenes/${sceneIdNum}`,
        ApiResponseSceneSchema,
        payload as z.infer<typeof UpdateSceneRequestSchema>
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
      const name =
        type === "video" ? "웹캠" : type === "screen" ? "화면 공유" : "마이크";
      const resolvedDeviceId =
        type === "screen"
          ? undefined
          : deviceId ??
            (type === "video"
              ? getPreferredVideoDeviceId() ?? undefined
              : getPreferredAudioDeviceId() ?? undefined);
      const newSource: Source = {
        id,
        type,
        name,
        isVisible: true,
        deviceId: resolvedDeviceId,
        isRemote: false,
      };

      // 화면 공유: getDisplayMedia는 사용자 제스처 직후에 호출되어야 함 → publish를 먼저 수행
      if (type === "screen" && isLiveKitConnected) {
        try {
          const trackSid = await publishScreenTrack(id);
          if (!trackSid) {
            console.warn("[StudioMain] 화면 공유 취소 또는 실패");
            return;
          }
          console.log("[StudioMain] 화면 공유 트랙 공유됨:", trackSid);
        } catch (err) {
          console.error("[StudioMain] 화면 공유 실패:", err);
          return;
        }
      }

      setSources((prev) => [...prev, newSource]);
      setShowAddSourceDialog(false);
      if (isStateSyncConnected) {
        broadcastState("SOURCE_ADDED", { source: newSource });
      }

      // LiveKit에 트랙 publish (화면 공유는 위에서 이미 처리)
      if (isLiveKitConnected && type !== "screen") {
        try {
          if (type === "video") {
            const trackSid = await publishVideoTrack(id, resolvedDeviceId);
            if (trackSid)
              console.log("[StudioMain] 비디오 트랙 공유됨:", trackSid);
          } else if (type === "audio") {
            const trackSid = await publishAudioTrack(id, resolvedDeviceId);
            if (trackSid)
              console.log("[StudioMain] 오디오 트랙 공유됨:", trackSid);
          }
        } catch (err) {
          console.error("[StudioMain] 미디어 공유 실패:", err);
        }
      }
    },
    [
      isStateSyncConnected,
      broadcastState,
      isLiveKitConnected,
      publishVideoTrack,
      publishScreenTrack,
      publishAudioTrack,
    ]
  );

  const setSourceTransform = useCallback(
    (sourceId: string, partial: Partial<PixelTransform>, broadcast = true) => {
      const { width: w, height: h } = stageSize;
      setSourceTransforms((prev) => {
        const current = prev[sourceId];
        const currentPixel = current
          ? toPixelTransform(current, w, h)
          : { x: 0, y: 0, width: 0, height: 0, zIndex: 0 };
        const mergedPixel: PixelTransform = {
          x: partial.x ?? currentPixel.x,
          y: partial.y ?? currentPixel.y,
          width: partial.width ?? currentPixel.width,
          height: partial.height ?? currentPixel.height,
          zIndex: partial.zIndex ?? currentPixel.zIndex,
        };
        const next: SourceTransform = toNormalizedTransform(mergedPixel, w, h);
        if (broadcast && isStateSyncConnected) {
          broadcastSourceTransform(sourceId, next);
        }
        return { ...prev, [sourceId]: next };
      });
      setHasUnsavedChanges(true);
    },
    [isStateSyncConnected, broadcastSourceTransform, stageSize]
  );

  const handleAddToStage = useCallback(
    (sourceId: string) => {
      setOnStageSourceIds((prev) =>
        prev.includes(sourceId) ? prev : [...prev, sourceId]
      );
      const source = sources.find((s) => s.id === sourceId);

      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_ADDED_TO_STAGE", { sourceId });
      }

      // 초기 위치는 레이아웃 effect가 자동으로 할당하도록 함 (정규화 좌표, UI Stage 가시 영역 내)
      // handleAddToStage에서는 transform을 설정하지 않음 → displaySourceOrderKey effect가 레이아웃 셀 기준으로 설정
    },
    [sources, isStateSyncConnected, broadcastState]
  );

  const handleBringSourceToFront = useCallback(
    (sourceId: string) => {
      setSources((prev) => {
        const firstOnStage = prev.findIndex((s) =>
          onStageSourceIds.includes(s.id)
        );
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
      setHasUnsavedChanges(true);
    },
    [onStageSourceIds, isStateSyncConnected, broadcastState]
  );

  const handleRemoveFromStage = useCallback(
    (sourceId: string) => {
      console.log("[StudioMain] Remove from stage:", sourceId);
      setOnStageSourceIds((prev) => prev.filter((id) => id !== sourceId));
      setHasUnsavedChanges(true);
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        console.log(
          "[StudioMain] Broadcasting SOURCE_REMOVED_FROM_STAGE:",
          sourceId
        );
        broadcastState("SOURCE_REMOVED_FROM_STAGE", { sourceId });
      }
    },
    [isStateSyncConnected, broadcastState]
  );

  const handleSourceToggle = useCallback(
    (sourceId: string) => {
      setSources((prev) => {
        const source = prev.find((s) => s.id === sourceId);
        const newVisible = !source?.isVisible;
        // 브로드캐스트 (연결된 모든 사용자가 공유)
        if (isStateSyncConnected) {
          broadcastState("SOURCE_TOGGLED", { sourceId, isVisible: newVisible });
        }
        return prev.map((s) =>
          s.id === sourceId ? { ...s, isVisible: newVisible } : s
        );
      });
    },
    [isStateSyncConnected, broadcastState]
  );

  const handleReorderSources = useCallback(
    (newOrder: Source[]) => {
      setSources(newOrder);
      setHasUnsavedChanges(true);
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_REORDERED", {
          sourceOrder: newOrder.map((s) => s.id),
        });
      }
    },
    [isStateSyncConnected, broadcastState]
  );

  /** 백스테이지에서 소스 완전 제거(목록·스테이지에서 삭제) */
  const handleRemoveSource = useCallback(
    async (sourceId: string) => {
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
      setHasUnsavedChanges(true);
      // 브로드캐스트 (연결된 모든 사용자가 공유)
      if (isStateSyncConnected) {
        broadcastState("SOURCE_REMOVED", { sourceId });
      }
    },
    [
      sources,
      isStateSyncConnected,
      broadcastState,
      isLiveKitConnected,
      unpublishTrack,
    ]
  );

  const handleSaveSceneLayout = useCallback(async () => {
    const sceneIdNum = Number(previewSceneId);
    if (!studioId || Number.isNaN(sceneIdNum) || !previewSceneId)
      return;
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
        `/api/studios/${studioId}/scenes/${sceneIdNum}`,
        z.object({
          success: z.boolean(),
          message: z.string().optional(),
          data: SceneResponseSchema,
        }),
        { layout }
      );
      await fetchStudio();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("씬 레이아웃 저장 실패:", error);
    }
  }, [
    studioId,
    previewSceneId,
    currentLayout,
    displaySources,
    sourceTransforms,
    fetchStudio,
  ]);

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
      alert("녹화할 수 있는 화면이 없습니다. 먼저 소스를 추가해주세요.");
      return;
    }
    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });
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

  // 레이아웃 변경 (브로드캐스트 포함)
  const setCurrentLayoutWithBroadcast = useCallback(
    (layout: LayoutType) => {
      setCurrentLayout(layout);
      setHasUnsavedChanges(true);
      if (isStateSyncConnected) {
        broadcastLayoutChange(layout);
      }
    },
    [isStateSyncConnected, broadcastLayoutChange]
  );

  // 편집 모드 변경 (브로드캐스트 포함)
  const setIsEditModeWithBroadcast = useCallback(
    (editMode: boolean) => {
      setIsEditMode(editMode);
      if (isStateSyncConnected) {
        broadcastState("EDIT_MODE_CHANGED", { isEditMode: editMode });
      }
    },
    [isStateSyncConnected, broadcastState]
  );

  // 해상도 변경 (브로드캐스트 포함)
  const setPreviewResolutionWithBroadcast = useCallback(
    (resolution: "720p" | "1080p") => {
      setPreviewResolution(resolution);
      if (isStateSyncConnected) {
        broadcastState("RESOLUTION_CHANGED", { resolution });
      }
    },
    [isStateSyncConnected, broadcastState]
  );

  const setIsVideoEnabledState = setIsVideoEnabled;
  const setIsAudioEnabledState = setIsAudioEnabled;

  return {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout: setCurrentLayoutWithBroadcast,
    previewSceneId,
    broadcastSceneId,
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
    isHost,
    handleSceneSelectForPreview,
    handleSceneBroadcast,
    handleRecommendScene,
    handleRecommendationConfirm,
    handleRecommendationCancel,
    recommendedScene,
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
    hasUnsavedChanges,
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
    localPublishedStreamsRef,
  };
}
