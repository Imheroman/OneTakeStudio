"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle2, Construction, Info } from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          기능 안내
        </h1>
        <p className="text-gray-500 mt-1">
          OneTake 스튜디오의 구현 상태를 확인하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            구현된 기능
          </CardTitle>
          <CardDescription>현재 사용 가능한 기능입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">라이브</Badge>
              <span>YouTube 라이브 송출 (RTMP)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">녹화</Badge>
              <span>로컬 녹화 (브라우저 MediaRecorder → 다운로드)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">녹화</Badge>
              <span>클라우드 녹화 (서버 녹화 → 로컬 저장)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">스튜디오</Badge>
              <span>씬 CRUD, 소스 추가(웹캠/마이크), 씬별 레이아웃 저장</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">채널</Badge>
              <span>YouTube 채널 연동 (RTMP URL, 스트림 키 등록)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">기타</Badge>
              <span>오디오 레벨 시각화, 해상도 전환(720p/1080p)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-amber-500" />
            준비 중인 기능
          </CardTitle>
          <CardDescription>개발 중이거나 곧 제공될 예정인 기능입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-700">
                송출
              </Badge>
              <span>치지직, 트위치 송출 (현재 YouTube만 지원)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-700">
                저장
              </Badge>
              <span>Cloud 저장 (스튜디오 생성 시, 현재 Local만 지원)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-700">
                송출+저장
              </Badge>
              <span>Go Live 시 클라우드 동시 저장</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-700">
                저장
              </Badge>
              <span>녹화 결과 S3/클라우드 업로드</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-gray-500" />
            참고
          </CardTitle>
          <CardDescription>
            자세한 미구현 항목은 프로젝트 문서를 참고하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
              frontend/docs/UNIMPLEMENTED_FEATURES.md
            </code>
            에 상세 내역이 정리되어 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
