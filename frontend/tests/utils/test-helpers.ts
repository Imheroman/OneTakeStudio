import { Page } from '@playwright/test';

/**
 * 테스트 헬퍼 함수들
 */

/**
 * 로그인 상태로 만들기
 * @param page Playwright Page 객체
 * @param email 로그인할 이메일
 * @param password 로그인할 비밀번호
 */
export async function loginAsUser(
  page: Page,
  email: string = 'test@example.com',
  password: string = '12345678'
) {
  await page.goto('/login');
  await page.getByLabel(/이메일/i).fill(email);
  await page.getByLabel(/비밀번호/i).fill(password);
  await page.getByRole('button', { name: /로그인/i }).click();
  
  // 워크스페이스로 리다이렉트될 때까지 대기
  await page.waitForURL(/\/workspace\/\w+/, { timeout: 10000 });
}

/**
 * 로그아웃
 * @param page Playwright Page 객체
 */
export async function logout(page: Page) {
  // 로그아웃 버튼 클릭 (실제 구현에 따라 조정 필요)
  const logoutButton = page.getByRole('button', { name: /로그아웃/i });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 5000 });
  }
}

/**
 * 특정 페이지로 이동하고 로드 완료 대기
 * @param page Playwright Page 객체
 * @param path 이동할 경로
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * API 응답 대기
 * @param page Playwright Page 객체
 * @param urlPattern 대기할 API URL 패턴
 * @param timeout 타임아웃 (밀리초)
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
) {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}
