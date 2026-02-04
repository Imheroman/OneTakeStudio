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
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

export default function FeaturesPage() {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  return (
    <div className="max-w-4xl mx-auto">
      <section
        className={cn(
          "rounded-2xl p-6 shadow-sm",
          isDark
            ? "bg-white/5 backdrop-blur-sm border border-white/10"
            : "bg-white/70 backdrop-blur-sm border border-gray-200/80"
        )}
      >
        <div className="space-y-8">
          <div>
            <h1
              className={cn(
                "text-3xl font-bold tracking-tight",
                isDark ? "text-gray-100" : "text-gray-900"
              )}
            >
              기능 안내
            </h1>
            <p
              className={cn("mt-1", isDark ? "text-gray-400" : "text-gray-500")}
            >
              OneTake 스튜디오의 구현 상태를 확인하세요.
            </p>
          </div>

          <Card className={cn(isDark && "bg-white/5 border-white/10")}>
            <CardHeader>
              <CardTitle
                className={cn(
                  "flex items-center gap-2",
                  isDark && "text-gray-200"
                )}
              >
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                구현된 기능
              </CardTitle>
              <CardDescription className={cn(isDark && "text-gray-400")}>
                현재 사용 가능한 기능입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul
                className={cn("space-y-3 text-sm", isDark && "text-gray-300")}
              >
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    라이브
                  </Badge>
                  <span>YouTube 라이브 송출 (RTMP)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    녹화
                  </Badge>
                  <span>로컬 녹화 (브라우저 MediaRecorder → 다운로드)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    녹화
                  </Badge>
                  <span>클라우드 녹화 (서버 녹화 → 로컬 저장)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    스튜디오
                  </Badge>
                  <span>
                    씬 CRUD, 소스 추가(웹캠/마이크), 씬별 레이아웃 저장
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    채널
                  </Badge>
                  <span>YouTube 채널 연동 (RTMP URL, 스트림 키 등록)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    기타
                  </Badge>
                  <span>오디오 레벨 시각화, 해상도 전환(720p/1080p)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-amber-200",
              isDark ? "bg-amber-900/20 border-amber-700/50" : "bg-amber-50/30"
            )}
          >
            <CardHeader>
              <CardTitle
                className={cn(
                  "flex items-center gap-2",
                  isDark && "text-amber-400"
                )}
              >
                <Construction className="h-5 w-5 text-amber-500" />
                준비 중인 기능
              </CardTitle>
              <CardDescription className={cn(isDark && "text-gray-400")}>
                개발 중이거나 곧 제공될 예정인 기능입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul
                className={cn("space-y-3 text-sm", isDark && "text-gray-300")}
              >
                <li className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700"
                  >
                    송출
                  </Badge>
                  <span>치지직, 트위치 송출 (현재 YouTube만 지원)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700"
                  >
                    저장
                  </Badge>
                  <span>Cloud 저장 (스튜디오 생성 시, 현재 Local만 지원)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700"
                  >
                    송출+저장
                  </Badge>
                  <span>Go Live 시 클라우드 동시 저장</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700"
                  >
                    저장
                  </Badge>
                  <span>녹화 결과 S3/클라우드 업로드</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className={cn(isDark && "bg-white/5 border-white/10")}>
            <CardHeader>
              <CardTitle
                className={cn(
                  "flex items-center gap-2",
                  isDark && "text-gray-200"
                )}
              >
                <Info
                  className={cn(
                    "h-5 w-5",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}
                />
                참고
              </CardTitle>
              <CardDescription className={cn(isDark && "text-gray-400")}>
                자세한 미구현 항목은 프로젝트 문서를 참고하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-sm",
                  isDark ? "text-gray-300" : "text-gray-600"
                )}
              >
                <code
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs",
                    isDark ? "bg-white/10 text-gray-300" : "bg-gray-100"
                  )}
                >
                  frontend/docs/UNIMPLEMENTED_FEATURES.md
                </code>
                에 상세 내역이 정리되어 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
