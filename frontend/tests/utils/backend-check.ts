/**
 * 백엔드 서버 상태 확인 헬퍼
 */

/**
 * 백엔드 서버가 실행 중인지 확인
 * @param baseURL 백엔드 서버 URL (기본값: http://localhost:8080)
 * @param timeout 타임아웃 (밀리초, 기본값: 5000)
 * @returns 서버가 실행 중이면 true, 아니면 false
 */
export async function checkBackendServer(
  baseURL: string = 'http://localhost:8080',
  timeout: number = 5000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseURL}/actuator/health`, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 백엔드 서버가 실행 중인지 확인하고, 실행 중이 아니면 테스트 스킵
 * @param baseURL 백엔드 서버 URL
 * @param test Playwright test 객체
 */
export async function skipIfBackendNotRunning(
  baseURL: string = 'http://localhost:8080',
  test: any
): Promise<void> {
  const isRunning = await checkBackendServer(baseURL);
  if (!isRunning) {
    test.skip(true, `백엔드 서버가 실행 중이 아닙니다: ${baseURL}`);
  }
}
