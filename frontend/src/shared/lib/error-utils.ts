/**
 * catch (error: unknown) 시 HTTP/axios 에러에서 status·message 추출
 * 에러 위험 포인트 제거: any 대신 타입 안전한 접근
 */

export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    return (
      e.code === "ERR_NETWORK" ||
      (typeof e.message === "string" && e.message.includes("Network Error"))
    );
  }
  return false;
}

export function getHttpErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "response" in error) {
    const r = (error as { response?: { status?: number } }).response;
    return r?.status;
  }
  return undefined;
}

export function getHttpErrorMessage(
  error: unknown,
  fallback = "알 수 없는 오류가 발생했습니다."
): string {
  if (error && typeof error === "object" && "response" in error) {
    const r = (error as { response?: { data?: { message?: string } } })
      .response;
    const msg = r?.data?.message;
    if (typeof msg === "string") return msg;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
