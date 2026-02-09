import cv2
import numpy as np
import webrtcvad
import wave
import contextlib
from pydub import AudioSegment
import os

# model files
prototxt_path = "models/deploy.prototxt"
model_path = "models/res10_300x300_ssd_iter_140000_fp16.caffemodel"
temp_audio_path = "temp_audio.wav"

net = cv2.dnn.readNetFromCaffe(prototxt_path, model_path)
vad = webrtcvad.Vad(2)  # 0~3 (3이 가장 공격적)

# exported globals
SpeakerFrames = []   # per frame speaker bbox [x,y,x1,y1] or None
BestFaceFrames = []  # per frame largest face bbox or None
FaceCounts = []      # per frame face count int

def extract_audio_from_video(video_path, audio_path):
    audio = AudioSegment.from_file(video_path)
    audio = audio.set_frame_rate(16000).set_channels(1)
    audio.export(audio_path, format="wav")

def process_audio_frame(audio_data, sample_rate=16000, frame_duration_ms=30):
    n = int(sample_rate * frame_duration_ms / 1000) * 2  # 2 bytes/sample
    offset = 0
    while offset + n <= len(audio_data):
        frame = audio_data[offset:offset + n]
        offset += n
        yield frame

def voice_activity_detection(audio_frame, sample_rate=16000):
    return vad.is_speech(audio_frame, sample_rate)

def _clip_box(x, y, x1, y1, w, h):
    x = max(0, min(int(x), w - 1))
    y = max(0, min(int(y), h - 1))
    x1 = max(0, min(int(x1), w))
    y1 = max(0, min(int(y1), h))
    if x1 <= x or y1 <= y:
        return None
    return [x, y, x1, y1]

def detect_faces_and_speakers(input_video_path, debug_output_path=None, conf_th=0.4, frame_duration_ms=30):
    """
    Build:
      FaceCounts[i]
      BestFaceFrames[i]  (largest face)
      SpeakerFrames[i]   (when speaking -> largest face, else short hold)
    """
    global SpeakerFrames, BestFaceFrames, FaceCounts
    SpeakerFrames = []
    BestFaceFrames = []
    FaceCounts = []

    # extract audio
    extract_audio_from_video(input_video_path, temp_audio_path)

    with contextlib.closing(wave.open(temp_audio_path, "rb")) as wf:
        sample_rate = wf.getframerate()
        audio_data = wf.readframes(wf.getnframes())

    audio_gen = process_audio_frame(audio_data, sample_rate, frame_duration_ms)

    cap = cv2.VideoCapture(input_video_path)
    if not cap.isOpened():
        print("Error: could not open video in Speaker.py")
        try: os.remove(temp_audio_path)
        except: pass
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    vw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    out = None
    if debug_output_path:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(debug_output_path, fourcc, float(fps), (vw, vh))

    # keep last speaker for 1 sec during silence to reduce flicker
    last_speaker = None
    hold_frames = int(fps * 1.0)
    hold_left = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]

        # face detect (DNN)
        blob = cv2.dnn.blobFromImage(
            cv2.resize(frame, (300, 300)),
            1.0,
            (300, 300),
            (104.0, 177.0, 123.0),
        )
        net.setInput(blob)
        detections = net.forward()

        faces = []
        for i in range(detections.shape[2]):
            conf = float(detections[0, 0, i, 2])
            if conf < conf_th:
                continue
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            x, y, x1, y1 = box.astype("int")
            b = _clip_box(x, y, x1, y1, w, h)
            if b:
                faces.append(b)

        FaceCounts.append(len(faces))
        best_face = max(faces, key=lambda b: (b[2]-b[0]) * (b[3]-b[1])) if faces else None
        BestFaceFrames.append(best_face)

        # audio frame
        audio_frame = next(audio_gen, None)
        if audio_frame is None:
            break

        speaking = voice_activity_detection(audio_frame, sample_rate)

        speaker_box = None
        if best_face is None:
            speaker_box = None
            last_speaker = None
            hold_left = 0
        else:
            if speaking:
                speaker_box = best_face
                last_speaker = best_face
                hold_left = hold_frames
            else:
                if last_speaker is not None and hold_left > 0:
                    speaker_box = last_speaker
                    hold_left -= 1
                else:
                    speaker_box = None

        SpeakerFrames.append(speaker_box)

        # debug draw
        if out is not None:
            for b in faces:
                cv2.rectangle(frame, (b[0], b[1]), (b[2], b[3]), (0, 255, 0), 2)
            if speaker_box is not None:
                cv2.rectangle(frame, (speaker_box[0], speaker_box[1]), (speaker_box[2], speaker_box[3]), (0, 0, 255), 2)
                if speaking:
                    cv2.putText(frame, "Speaker", (speaker_box[0], max(0, speaker_box[1]-10)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            out.write(frame)

    cap.release()
    if out is not None:
        out.release()

    try:
        os.remove(temp_audio_path)
    except:
        pass

    print(f"[Speaker] done. frames={len(FaceCounts)} fps={fps}")
