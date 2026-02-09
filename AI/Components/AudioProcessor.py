import numpy as np
from pydub import AudioSegment
from pydub.utils import make_chunks

class AudioProcessor:
    def __init__(self, audio_path):
        print(f"Loading Audio for analysis: {audio_path}...")
        self.audio = AudioSegment.from_file(audio_path)
        self.duration = len(self.audio) / 1000.0  # seconds

    def find_energy_peaks(self, window_size=10.0, top_n=3):
        """
        오디오의 볼륨(RMS)을 분석하여 가장 에너지가 높은 구간(웃음, 환호 등)을 찾습니다.
        Args:
            window_size: 분석할 윈도우 크기 (초 단위, 보통 10~30초)
            top_n: 상위 몇 개의 구간을 뽑을지
        Returns:
            List of (start_time, end_time, energy_score)
        """
        chunk_length_ms = 1000 # 1초 단위로 분석
        chunks = make_chunks(self.audio, chunk_length_ms)
        
        energies = []
        for i, chunk in enumerate(chunks):
            # RMS (Root Mean Square)는 소리의 크기를 나타내는 가장 정확한 지표입니다.
            if len(chunk) < chunk_length_ms: continue
            energies.append(chunk.rms)

        # Rolling average로 구간 에너지 계산
        window_len = int(window_size)
        if len(energies) < window_len:
            return [(0, self.duration, 0)]

        # 윈도우별 합계 계산 (Convolution 활용)
        window_energies = np.convolve(energies, np.ones(window_len), 'valid')
        
        # 상위 N개 구간 추출 (겹치지 않게 로직 짤 수도 있으나, 여기선 단순 정렬)
        # 인덱스(초)와 에너지를 묶음
        peak_candidates = []
        for i, energy in enumerate(window_energies):
            peak_candidates.append((i, i + window_size, energy))
            
        # 에너지 순으로 정렬
        peak_candidates.sort(key=lambda x: x[2], reverse=True)
        
        # 겹치지 않는 상위 구간 선택 로직 (간단화)
        final_peaks = []
        for cand in peak_candidates:
            if len(final_peaks) >= top_n: break
            
            # 이미 선택된 구간과 겹치는지 확인
            is_overlap = False
            for p in final_peaks:
                # 겹침 조건: (StartA <= EndB) and (EndA >= StartB)
                if (cand[0] < p[1]) and (cand[1] > p[0]):
                    is_overlap = True
                    break
            
            if not is_overlap:
                final_peaks.append(cand)

        print(f"Found {len(final_peaks)} high-energy moments (Audio Analysis)")
        return final_peaks

    @staticmethod
    def generate_jump_cut_plan(whisper_segments, selected_start, selected_end, max_silence=0.3):
        """
        Whisper 데이터를 기반으로 무음을 제거한 '점프컷 리스트'를 생성합니다.
        
        Args:
            whisper_segments: transcribeAudio 결과 [[text, start, end], ...]
            selected_start/end: LLM이 고른 하이라이트 구간
            max_silence: 이 시간(초) 이상의 침묵은 잘라냅니다.
            
        Returns:
            keep_ranges: [[start, end], [start, end], ...] (실제 영상에서 살릴 구간들)
        """
        # 1. 선택된 구간 내의 세그먼트만 필터링
        relevant_segs = []
        for item in whisper_segments:
            # item: [text, start, end]
            s, e = item[1], item[2]
            
            # 구간 안에 완전히 포함되거나 걸쳐있는 경우
            if s >= selected_start and e <= selected_end:
                relevant_segs.append((s, e))
            # (정교하게 하려면 걸쳐있는 경우 잘라낼 수도 있음)

        if not relevant_segs:
            return [[selected_start, selected_end]]

        # 2. 무음 제거 로직 (Merge close segments)
        keep_ranges = []
        if not relevant_segs: return []

        current_start = relevant_segs[0][0]
        current_end = relevant_segs[0][1]

        for i in range(1, len(relevant_segs)):
            next_start = relevant_segs[i][0]
            next_end = relevant_segs[i][1]
            
            gap = next_start - current_end
            
            if gap <= max_silence:
                # 갭이 작으면 합칩니다 (점프컷 하지 않음 -> 자연스러운 연결)
                current_end = next_end
            else:
                # 갭이 크면 여기서 끊고, 무음(Gap)은 버립니다.
                keep_ranges.append([current_start, current_end])
                current_start = next_start
                current_end = next_end
        
        # 마지막 조각 추가
        keep_ranges.append([current_start, current_end])

        # 총 길이 계산
        total_duration = sum([end - start for start, end in keep_ranges])
        print(f"Jump Cut Applied: {selected_end - selected_start:.1f}s -> {total_duration:.1f}s (Tight & Fast)")
        
        return keep_ranges

# 테스트용
if __name__ == "__main__":
    # 사용 예시
    pass