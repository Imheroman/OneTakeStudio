from faster_whisper import WhisperModel
import torch

_model_cache = {}

def _get_model():
    key = "small"
    if key in _model_cache:
        return _model_cache[key]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("Device:", device)
    model = WhisperModel(key, device=device)
    _model_cache[key] = model
    return model

def transcribeAudio(audio_path, language="ko"):
    """
    Returns: [[text, start, end], ...]
    language: "ko", "en", "ja", ...
    한국 영상이면 language="ko" 추천 (가장 안정)
    """
    try:
        print("Transcribing audio...")
        model = _get_model()
        print("Model loaded")

        segments, info = model.transcribe(
            audio=audio_path,
            beam_size=5,
            language=language,
            max_new_tokens=128,
            condition_on_previous_text=False
        )

        segments = list(segments)
        extracted_texts = [[seg.text, float(seg.start), float(seg.end)] for seg in segments]
        print(f"✓ Transcription complete: {len(extracted_texts)} segments extracted")
        return extracted_texts

    except Exception as e:
        print("Transcription Error:", e)
        return []
