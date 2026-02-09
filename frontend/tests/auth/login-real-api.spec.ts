import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { skipIfBackendNotRunning } from '../utils/backend-check';
import { getTestUsers } from '../fixtures/test-users';

/**
 * 실제 백엔드 API를 사용하는 로그인 테스트
 * 
 * 실행 전 확인사항:
 * 1. 백엔드 서버가 실행 중이어야 함 (http://localhost:8080)
 * 2. 테스트용 계정이 생성되어 있어야 함 (e2e-test@example.com)
 * 3. MSW가 비활성화되어 있어야 함 (NEXT_PUBLIC_API_MOCKING=disabled)
 */
test.describe('로그인 (실제 API)', () => {
  // 백엔드 서버 상태 확인
  test.beforeAll(async ({ }, testInfo) => {
    await skipIfBackendNotRunning('http://localhost:8080', testInfo);
  });

  test.beforeEach(async ({ page }) => {
    // MSW 비활성화 확인 (환경 변수로 제어)
    // 실제로는 playwright.config.ts의 env 설정으로 제어됨
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('실제 API로 로그인 성공', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const testUsers = getTestUsers(true); // 실제 API 테스트용 계정

    // 테스트 계정 정보 확인
    if (!testUsers.valid.email || !testUsers.valid.password) {
      test.skip(true, '테스트용 계정 정보가 설정되지 않았습니다. E2E_TEST_EMAIL, E2E_TEST_PASSWORD 환경 변수를 설정하거나 tests/fixtures/test-users.ts를 수정하세요.');
    }

    // 네트워크 요청 모니터링 (리다이렉트 전에 응답을 받아야 함)
    const loginRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        const method = response.request().method();
        return url.includes('/api/auth/login') && method === 'POST';
      },
      { timeout: 10000 }
    );

    // 리다이렉트 대기 (워크스페이스 페이지로 이동하는지 확인)
    const navigationPromise = page.waitForURL(
      /\/workspace\/\w+/,
      { timeout: 15000 }
    ).catch(() => null); // 실패해도 계속 진행

    // 실제 테스트 계정으로 로그인
    await loginPage.login(
      testUsers.valid.email,
      testUsers.valid.password
    );

    // API 응답 확인
    const loginResponse = await loginRequestPromise;
    
    // 응답 본문 가져오기 (에러 응답도 포함)
    let responseBody: any;
    try {
      responseBody = await loginResponse.json();
    } catch (e) {
      // JSON 파싱 실패 시 텍스트로 시도
      const text = await loginResponse.text();
      responseBody = { raw: text };
    }
    
    console.log('로그인 API 응답:', JSON.stringify(responseBody, null, 2));
    console.log('응답 상태:', loginResponse.status());
    console.log('응답 헤더:', JSON.stringify(loginResponse.headers(), null, 2));
    console.log('사용한 계정:', testUsers.valid.email);
    
    // 500 에러인 경우 상세 정보 출력
    if (loginResponse.status() === 500) {
      console.error('=== 500 Internal Server Error 발생 ===');
      console.error('응답 본문:', JSON.stringify(responseBody, null, 2));
      throw new Error(
        `백엔드 서버 오류 (500): ${responseBody.message || responseBody.raw || '알 수 없는 오류'}\n` +
        `백엔드 서버 로그를 확인하세요.\n` +
        `가능한 원인:\n` +
        `1. 데이터베이스 연결 문제\n` +
        `2. 예외 처리되지 않은 에러\n` +
        `3. 서버 설정 문제`
      );
    }

    // 로그인 실패 시 명확한 에러 메시지
    if (!loginResponse.ok() || !responseBody.success) {
      const errorMsg = responseBody.message || '알 수 없는 오류';
      throw new Error(
        `로그인 실패 (${loginResponse.status()}): ${errorMsg}\n` +
        `사용한 계정: ${testUsers.valid.email}\n` +
        `해결 방법:\n` +
        `1. 백엔드에 해당 계정이 존재하는지 확인\n` +
        `2. 비밀번호가 올바른지 확인\n` +
        `3. 이메일 인증이 완료되었는지 확인\n` +
        `4. tests/fixtures/test-users.ts의 계정 정보를 실제 계정으로 변경\n` +
        `5. 또는 환경 변수로 설정: E2E_TEST_EMAIL, E2E_TEST_PASSWORD`
      );
    }

    // 현재 URL 확인 (디버깅)
    const currentUrlAfterResponse = page.url();
    console.log('API 응답 후 현재 URL:', currentUrlAfterResponse);
    
    // 워크스페이스로 리다이렉트되는지 확인
    try {
      if (navigationPromise) {
        await navigationPromise;
      }
      
      // 최종 URL 확인
      await expect(page).toHaveURL(/\/workspace\/\w+/, { timeout: 15000 });
      console.log('리다이렉트 성공, 최종 URL:', page.url());
      
      // 리다이렉트가 성공했다면 로그인 성공 (에러 메시지 확인 불필요)
      return; // 테스트 성공
    } catch (error) {
      // 리다이렉트 실패한 경우에만 에러 메시지 확인
      console.error('리다이렉트 실패, 에러 메시지 확인 중...');
      console.error('현재 URL:', page.url());
      
      // 로그인 페이지에 있는 경우에만 에러 메시지 확인
      if (page.url().includes('/login')) {
        await page.waitForTimeout(1000); // 에러 메시지 표시 대기
        const errorVisible = await loginPage.errorMessage.isVisible().catch(() => false);
        if (errorVisible) {
          const errorText = await loginPage.errorMessage.textContent();
          throw new Error(`로그인 실패: ${errorText}`);
        }
      }
      
      // 리다이렉트 실패 시 상세 로깅
      console.error('페이지 제목:', await page.title());
      throw error;
    }
  });

  test('실제 API로 잘못된 자격증명 로그인 실패', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const testUsers = getTestUsers(true);

    await loginPage.login(
      testUsers.invalid.email,
      testUsers.invalid.password
    );

    // 에러 메시지가 표시되는지 확인
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('실제 API로 이메일 형식 검증', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.fillEmail('invalid-email');
    await loginPage.fillPassword('password123');
    await loginPage.clickLogin();

    // 브라우저 기본 유효성 검사 또는 커스텀 에러 메시지 확인
    // 실제 구현에 따라 조정 필요
  });
});
