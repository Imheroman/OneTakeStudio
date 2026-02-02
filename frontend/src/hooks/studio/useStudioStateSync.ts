/**
 * 스튜디오 상태 동기화 훅
 * WebSocket을 통한 실시간 상태 동기화
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type StudioStateType =
  | "LAYOUT_CHANGE"
  | "SOURCE_ADDED"
  | "SOURCE_REMOVED"
  | "SOURCE_TRANSFORM"
  | "SOURCE_TOGGLED"
  | "SOURCE_REORDERED"
  | "SOURCE_BROUGHT_FRONT"
  | "BANNER_SELECTED"
  | "BANNER_DESELECTED"
  | "ASSET_SELECTED"
  | "ASSET_DESELECTED"
  | "STYLE_CHANGE"
  | "LOCK_ACQUIRED"
  | "LOCK_RELEASED"
  | "LOCK_EXPIRED"
  | "SCENE_SELECTED"
  | "SCENE_SAVED"
  | "EDIT_MODE_CHANGED"
  | "RESOLUTION_CHANGED"
  | "MEMBER_JOINED"
  | "MEMBER_LEFT";

export interface StudioStateMessage {
  type: StudioStateType;
  studioId: number;
  userId: string;
  nickname: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface UseStudioStateSyncOptions {
  studioId: number;
  userId: string;
  nickname: string;
  onStateChange?: (message: StudioStateMessage) => void;
  onLockChange?: (message: StudioStateMessage) => void;
  onPresenceChange?: (message: StudioStateMessage) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8082/ws/media";

export function useStudioStateSync(options: UseStudioStateSyncOptions) {
  const { studioId, userId, nickname, onStateChange, onLockChange, onPresenceChange } = options;

  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket 연결
  useEffect(() => {
    if (!studioId || studioId === 0) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("[StudioStateSync] WebSocket 연결됨");
        setIsConnected(true);

        // 상태 변경 구독
        client.subscribe(`/topic/studio/${studioId}/state`, (message: IMessage) => {
          try {
            const stateMessage: StudioStateMessage = JSON.parse(message.body);
            // 내가 보낸 메시지는 무시
            if (stateMessage.userId !== userId) {
              onStateChange?.(stateMessage);
            }
          } catch (e) {
            console.error("[StudioStateSync] 상태 메시지 파싱 실패:", e);
          }
        });

        // 락 상태 구독
        client.subscribe(`/topic/studio/${studioId}/lock`, (message: IMessage) => {
          try {
            const lockMessage: StudioStateMessage = JSON.parse(message.body);
            onLockChange?.(lockMessage);
          } catch (e) {
            console.error("[StudioStateSync] 락 메시지 파싱 실패:", e);
          }
        });

        // 프레즌스 구독
        client.subscribe(`/topic/studio/${studioId}/presence`, (message: IMessage) => {
          try {
            const presenceMessage: StudioStateMessage = JSON.parse(message.body);
            onPresenceChange?.(presenceMessage);
          } catch (e) {
            console.error("[StudioStateSync] 프레즌스 메시지 파싱 실패:", e);
          }
        });
      },
      onDisconnect: () => {
        console.log("[StudioStateSync] WebSocket 연결 해제됨");
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error("[StudioStateSync] STOMP 에러:", frame.headers["message"]);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [studioId, userId, onStateChange, onLockChange, onPresenceChange]);

  // 상태 변경 브로드캐스트
  const broadcastState = useCallback(
    (type: StudioStateType, payload?: Record<string, unknown>) => {
      if (!clientRef.current?.connected) {
        console.warn("[StudioStateSync] WebSocket 연결 안됨, 브로드캐스트 스킵");
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
    (sourceId: string, transform: Record<string, unknown>) => {
      broadcastState("SOURCE_TRANSFORM", { sourceId, transform });
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

  return {
    isConnected,
    broadcastState,
    broadcastLayoutChange,
    broadcastSourceTransform,
    broadcastBannerSelected,
    broadcastAssetSelected,
    broadcastStyleChange,
    broadcastSceneSelected,
  };
}
