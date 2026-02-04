/**
 * 스튜디오 상태 동기화 훅
 * WebSocket을 통한 실시간 상태 동기화
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { Client, IMessage, IFrame } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type StudioStateType =
  | "LAYOUT_CHANGE"
  | "SOURCE_ADDED"
  | "SOURCE_REMOVED"
  | "SOURCE_TRANSFORM"
  | "SOURCE_TOGGLED"
  | "SOURCE_REORDERED"
  | "SOURCE_BROUGHT_FRONT"
  | "SOURCE_ADDED_TO_STAGE"
  | "SOURCE_REMOVED_FROM_STAGE"
  | "BANNER_SELECTED"
  | "BANNER_DESELECTED"
  | "ASSET_SELECTED"
  | "ASSET_DESELECTED"
  | "STYLE_CHANGE"
  | "LOCK_ACQUIRED"
  | "LOCK_RELEASED"
  | "LOCK_EXPIRED"
  | "SCENE_SELECTED"
  | "SCENE_RECOMMENDED"
  | "SCENE_SAVED"
  | "EDIT_MODE_CHANGED"
  | "RESOLUTION_CHANGED"
  | "MEMBER_JOINED"
  | "MEMBER_LEFT"
  | "CURRENT_MEMBERS"
  | "FULL_STATE_SYNC";

export interface StudioStateMessage {
  type: StudioStateType;
  studioId: string;
  userId: string;
  nickname: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface UseStudioStateSyncOptions {
  studioId: string;
  userId: string;
  nickname: string;
  onStateChange?: (message: StudioStateMessage) => void;
  onLockChange?: (message: StudioStateMessage) => void;
  onPresenceChange?: (message: StudioStateMessage) => void;
}

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8082/ws/media";

export interface OnlineMember {
  odUserId: string;
  nickname: string;
  joinedAt: string;
}

export function useStudioStateSync(options: UseStudioStateSyncOptions) {
  const {
    studioId,
    userId,
    nickname,
    onStateChange,
    onLockChange,
    onPresenceChange,
  } = options;

  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);

  // 콜백을 ref로 유지해서 항상 최신 버전 참조 (클로저 문제 해결)
  const onStateChangeRef = useRef(onStateChange);
  const onLockChangeRef = useRef(onLockChange);
  const onPresenceChangeRef = useRef(onPresenceChange);
  onStateChangeRef.current = onStateChange;
  onLockChangeRef.current = onLockChange;
  onPresenceChangeRef.current = onPresenceChange;

  // WebSocket 연결
  useEffect(() => {
    if (!studioId) return;
    if (!userId) {
      console.warn("[StudioStateSync] userId가 없어서 WebSocket 연결 스킵");
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("[StudioStateSync] WebSocket 연결됨");
        setIsConnected(true);

        // 상태 변경 구독
        client.subscribe(
          `/topic/studio/${studioId}/state`,
          (message: IMessage) => {
            try {
              const stateMessage: StudioStateMessage = JSON.parse(message.body);
              console.log(
                "[StudioStateSync] 수신된 메시지:",
                stateMessage.type,
                stateMessage.userId
              );
              // 내가 보낸 메시지는 무시
              if (stateMessage.userId !== userId) {
                onStateChangeRef.current?.(stateMessage);
              }
            } catch (e) {
              console.error("[StudioStateSync] 상태 메시지 파싱 실패:", e);
            }
          }
        );

        // 락 상태 구독
        client.subscribe(
          `/topic/studio/${studioId}/lock`,
          (message: IMessage) => {
            try {
              const lockMessage: StudioStateMessage = JSON.parse(message.body);
              onLockChangeRef.current?.(lockMessage);
            } catch (e) {
              console.error("[StudioStateSync] 락 메시지 파싱 실패:", e);
            }
          }
        );

        // 프레즌스 구독
        client.subscribe(
          `/topic/studio/${studioId}/presence`,
          (message: IMessage) => {
            try {
              const presenceMessage: StudioStateMessage = JSON.parse(
                message.body
              );

              // 온라인 멤버 목록 업데이트
              if (presenceMessage.type === "CURRENT_MEMBERS") {
                // 서버에서 전송한 현재 접속자 목록으로 초기화
                const members =
                  (presenceMessage.payload?.members as Array<{
                    odUserId: string;
                    nickname: string;
                    joinedAt: string;
                  }>) ?? [];
                setOnlineMembers(
                  members.map((m) => ({
                    odUserId: m.odUserId,
                    nickname: m.nickname,
                    joinedAt: m.joinedAt,
                  }))
                );
                console.log(
                  "[StudioStateSync] 현재 접속자 목록 수신:",
                  members.length,
                  "명"
                );
              } else if (presenceMessage.type === "MEMBER_JOINED") {
                setOnlineMembers((prev) => {
                  // 이미 있으면 무시
                  if (prev.some((m) => m.odUserId === presenceMessage.userId)) {
                    return prev;
                  }
                  return [
                    ...prev,
                    {
                      odUserId: presenceMessage.userId,
                      nickname: presenceMessage.nickname,
                      joinedAt: presenceMessage.timestamp,
                    },
                  ];
                });
              } else if (presenceMessage.type === "MEMBER_LEFT") {
                setOnlineMembers((prev) =>
                  prev.filter((m) => m.odUserId !== presenceMessage.userId)
                );
              }

              onPresenceChangeRef.current?.(presenceMessage);
            } catch (e) {
              console.error("[StudioStateSync] 프레즌스 메시지 파싱 실패:", e);
            }
          }
        );

        // 내 입장 알림 전송 (서버에서 접속자 목록 관리 + CURRENT_MEMBERS 응답)
        const joinMessage: StudioStateMessage = {
          type: "MEMBER_JOINED",
          studioId,
          userId,
          nickname,
          timestamp: new Date().toISOString(),
        };
        client.publish({
          destination: `/app/studio/${studioId}/presence`,
          body: JSON.stringify(joinMessage),
        });

        // fallback: 서버가 CURRENT_MEMBERS를 보내지 않을 경우 자신을 목록에 추가
        // (서버에서 CURRENT_MEMBERS가 오면 덮어쓰기됨)
        setOnlineMembers((prev) => {
          if (prev.some((m) => m.odUserId === userId)) return prev;
          return [
            ...prev,
            { odUserId: userId, nickname, joinedAt: new Date().toISOString() },
          ];
        });
      },
      onDisconnect: () => {
        console.log("[StudioStateSync] WebSocket 연결 해제됨");
        setIsConnected(false);
      },
      onStompError: (frame: IFrame) => {
        console.error(
          "[StudioStateSync] STOMP 에러:",
          frame.headers["message"]
        );
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      // 퇴장 알림 브로드캐스트
      if (client.connected) {
        const leaveMessage: StudioStateMessage = {
          type: "MEMBER_LEFT",
          studioId,
          userId,
          nickname,
          timestamp: new Date().toISOString(),
        };
        client.publish({
          destination: `/app/studio/${studioId}/presence`,
          body: JSON.stringify(leaveMessage),
        });
      }
      client.deactivate();
      clientRef.current = null;
      setOnlineMembers([]);
    };
  }, [studioId, userId, nickname]); // 콜백은 ref로 관리하므로 의존성에서 제외

  // 상태 변경 브로드캐스트
  const broadcastState = useCallback(
    (type: StudioStateType, payload?: Record<string, unknown>) => {
      if (!clientRef.current?.connected) {
        console.warn(
          "[StudioStateSync] WebSocket 연결 안됨, 브로드캐스트 스킵"
        );
        return;
      }

      const message: StudioStateMessage = {
        type,
        studioId,
        userId,
        nickname,
        payload,
        timestamp: new Date().toISOString(),
      };

      clientRef.current.publish({
        destination: `/app/studio/${studioId}/state`,
        body: JSON.stringify(message),
      });
    },
    [studioId, userId, nickname]
  );

  // 편의 함수들
  const broadcastLayoutChange = useCallback(
    (layout: string) => {
      broadcastState("LAYOUT_CHANGE", { layout });
    },
    [broadcastState]
  );

  const broadcastSourceTransform = useCallback(
    (sourceId: string, transform: object) => {
      broadcastState("SOURCE_TRANSFORM", {
        sourceId,
        transform: transform as Record<string, unknown>,
      });
    },
    [broadcastState]
  );

  const broadcastBannerSelected = useCallback(
    (banner: unknown) => {
      broadcastState("BANNER_SELECTED", { banner });
    },
    [broadcastState]
  );

  const broadcastAssetSelected = useCallback(
    (asset: unknown) => {
      broadcastState("ASSET_SELECTED", { asset });
    },
    [broadcastState]
  );

  const broadcastStyleChange = useCallback(
    (style: unknown) => {
      broadcastState("STYLE_CHANGE", { style });
    },
    [broadcastState]
  );

  const broadcastSceneSelected = useCallback(
    (sceneId: string) => {
      broadcastState("SCENE_SELECTED", { sceneId });
    },
    [broadcastState]
  );

  const broadcastSceneRecommended = useCallback(
    (sceneId: string, sceneName: string) => {
      broadcastState("SCENE_RECOMMENDED", { sceneId, sceneName });
    },
    [broadcastState]
  );

  return {
    isConnected,
    onlineMembers,
    broadcastState,
    broadcastLayoutChange,
    broadcastSourceTransform,
    broadcastBannerSelected,
    broadcastAssetSelected,
    broadcastStyleChange,
    broadcastSceneSelected,
    broadcastSceneRecommended,
  };
}
