import { create } from "zustand";

export interface LocalRecording {
  id: string;
  studioId: string | number;
  blob: Blob;
  fileName: string;
  mimeType: string;
  duration: number; // seconds
  startedAt: Date;
  endedAt: Date;
  size: number; // bytes
}

interface LocalRecordingState {
  recordings: LocalRecording[];
  currentRecording: {
    studioId: string | number;
    startedAt: Date;
  } | null;

  /** 녹화 시작 */
  startRecording: (studioId: string | number) => void;

  /** 녹화 완료 및 저장 */
  saveRecording: (studioId: string | number, blob: Blob, mimeType: string) => void;

  /** 녹화 취소 */
  cancelRecording: () => void;

  /** 녹화 삭제 */
  deleteRecording: (id: string) => void;

  /** 특정 스튜디오의 녹화 목록 조회 */
  getRecordingsByStudio: (studioId: string | number) => LocalRecording[];

  /** 녹화 다운로드 */
  downloadRecording: (id: string) => void;
}

export const useLocalRecordingStore = create<LocalRecordingState>((set, get) => ({
  recordings: [],
  currentRecording: null,

  startRecording: (studioId) => {
    set({
      currentRecording: {
        studioId,
        startedAt: new Date(),
      },
    });
  },

  saveRecording: (studioId, blob, mimeType) => {
    const state = get();
    if (!state.currentRecording) return;

    const endedAt = new Date();
    const duration = Math.round(
      (endedAt.getTime() - state.currentRecording.startedAt.getTime()) / 1000
    );

    const recording: LocalRecording = {
      id: `local-${Date.now()}`,
      studioId,
      blob,
      fileName: `녹화_${formatDateTime(state.currentRecording.startedAt)}.webm`,
      mimeType,
      duration,
      startedAt: state.currentRecording.startedAt,
      endedAt,
      size: blob.size,
    };

    set((prev) => ({
      recordings: [recording, ...prev.recordings],
      currentRecording: null,
    }));
  },

  cancelRecording: () => {
    set({ currentRecording: null });
  },

  deleteRecording: (id) => {
    set((prev) => ({
      recordings: prev.recordings.filter((r) => r.id !== id),
    }));
  },

  getRecordingsByStudio: (studioId) => {
    return get().recordings.filter((r) => r.studioId === studioId);
  },

  downloadRecording: (id) => {
    const recording = get().recordings.find((r) => r.id === id);
    if (!recording) return;

    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = recording.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
}));

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}`;
}
