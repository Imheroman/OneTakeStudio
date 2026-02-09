import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정 파일
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 테스트 파일 위치
  testDir: './tests',
  
  // 병렬 실행 설정
  fullyParallel: true,
  
  // CI 환경에서만 실패 시 재시도
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  
  // CI 환경에서는 1개 워커, 로컬에서는 CPU 코어 수만큼
  workers: process.env.CI ? 1 : undefined,
  
  // 리포트 설정
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  // 공통 설정
  use: {
    // 기본 URL (환경 변수로 오버라이드 가능)
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    // 트레이스 설정 (첫 번째 재시도 시에만)
    trace: 'on-first-retry',
    
    // 스크린샷 설정 (실패 시에만)
    screenshot: 'only-on-failure',
    
    // 비디오 녹화 (실패 시에만)
    video: 'retain-on-failure',
  },

  // 테스트할 브라우저 프로젝트
  projects: [
    // MSW 모킹 사용 테스트 (기본)
    {
      name: 'chromium-mocked',
      use: { 
        ...devices['Desktop Chrome'],
      },
      // MSW 모킹 테스트만 실행 (real-api가 아닌 파일)
      testMatch: /.*(?<!real-api)\.spec\.ts$/,
    },
    // 실제 API 사용 테스트 (실행 시 셸에서 NEXT_PUBLIC_API_MOCKING=disabled 지정 권장)
    {
      name: 'chromium-real-api',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /.*real-api\.spec\.ts$/,
    },
  ],

  // 개발 서버 자동 실행
  // 로컬에서는 수동으로 서버를 실행해야 함: npm run dev
  // CI 환경에서만 자동으로 서버 실행
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
