/**
 * LiveKit 룸 연결 및 스트림 퍼블리시 유틸
 * Go Live 시 프리뷰 스트림을 LiveKit 룸에 퍼블리시하여 백엔드 이그레스가 사용할 수 있게 합니다.
 */
import { Room } from "livekit-client";

/** 백엔드가 반환하는 livekitUrl이 http(s)일 수 있으므로 WebSocket URL로 변환 */
function toWebSocketUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.startsWith("https://")) return trimmed.replace("https://", "wss://");
  if (trimmed.startsWith("http://")) return trimmed.replace("http://", "ws://");
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) return trimmed;
  return `wss://${trimmed}`;
}

/**
 * LiveKit 룸에 연결하고 주어진 MediaStream의 비디오/오디오 트랙을 퍼블리시합니다.
 * @returns 연결된 Room (나중에 disconnect 시 사용)
 */
export async function connectAndPublish(
  livekitUrl: string,
  token: string,
  stream: MediaStream,
): Promise<Room> {
  const wsUrl = toWebSocketUrl(livekitUrl);
  const room = new Room();

  await room.connect(wsUrl, token);

  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();

  for (const track of videoTracks) {
    if (track.enabled) {
      await room.localParticipant.publishTrack(track, { name: "preview-video", source: "camera" });
    }
  }
  for (const track of audioTracks) {
    if (track.enabled) {
      await room.localParticipant.publishTrack(track, { name: "preview-audio", source: "microphone" });
    }
  }

  return room;
}

/**
 * 룸 연결 해제 및 스트림 정리
 */
export async function disconnectRoom(room: Room, stopTracks = true): Promise<void> {
  await room.disconnect(stopTracks);
}
