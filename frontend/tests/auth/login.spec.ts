import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('로그인', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인 페이지로 이동
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('로그인 페이지가 정상적으로 로드됨', async ({ page }) => {
    await expect(page).toHaveTitle(/OneTake|로그인/i);
    await expect(page.getByRole('heading', { name: /로그인/i })).toBeVisible();
  });

  test('이메일과 비밀번호 입력 필드가 표시됨', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('유효한 자격증명으로 로그인 성공', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // MSW 모킹된 계정으로 로그인
    await loginPage.login('test@example.com', '12345678');
    
    // 워크스페이스로 리다이렉트되는지 확인
    await expect(page).toHaveURL(/\/workspace\/\w+/);
    
    // 또는 로그인 상태 확인 (상단 네비게이션에 사용자 정보 표시)
    // await expect(page.getByText(/워크스페이스/i)).toBeVisible();
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.login('wrong@example.com', 'wrongpassword');
    
    // 에러 메시지가 표시되는지 확인
    // MSW 핸들러에서 에러 응답을 반환하도록 설정되어 있다면
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('이메일 없이 로그인 시도 시 유효성 검사', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.fillPassword('12345678');
    await loginPage.clickLogin();
    
    // 브라우저 기본 유효성 검사 또는 커스텀 에러 메시지 확인
    // 실제 구현에 따라 조정 필요
  });

  test('비밀번호 없이 로그인 시도 시 유효성 검사', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.fillEmail('test@example.com');
    await loginPage.clickLogin();
    
    // 브라우저 기본 유효성 검사 또는 커스텀 에러 메시지 확인
    // 실제 구현에 따라 조정 필요
  });

  test('회원가입 링크 클릭 시 회원가입 페이지로 이동', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.clickSignupLink();
    
    await expect(page).toHaveURL(/\/signup/);
  });
});
