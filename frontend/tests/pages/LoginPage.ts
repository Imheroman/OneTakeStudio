import { Page, Locator } from '@playwright/test';

/**
 * 로그인 페이지 Page Object Model
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/이메일/i);
    this.passwordInput = page.getByLabel(/비밀번호/i);
    this.loginButton = page.getByRole('button', { name: /로그인하기/i });
    // 로그인 폼의 실제 에러 메시지만 매칭
    // LoginForm의 에러 메시지: form 내부의 bg-red-50 + text-red-600 클래스를 가진 div
    // Next.js route announcer는 form 밖에 있으므로 제외됨
    this.errorMessage = page.locator('form .bg-red-50.text-red-600');
    this.signupLink = page.getByRole('link', { name: /회원가입/i });
  }

  /**
   * 로그인 페이지로 이동
   */
  async goto() {
    await this.page.goto('/login');
    // 페이지가 완전히 로드될 때까지 대기
    await this.page.waitForLoadState('networkidle');
    // 로그인 폼이 표시될 때까지 대기
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 이메일 입력
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * 비밀번호 입력
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * 로그인 버튼 클릭
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * 로그인 수행 (이메일 + 비밀번호 입력 + 로그인 버튼 클릭)
   * 리다이렉트를 기다리지 않음 (테스트에서 별도로 처리)
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    // 폼 제출 후 약간의 대기 (API 요청 시작 대기)
    await this.page.waitForTimeout(500);
  }

  /**
   * 회원가입 링크 클릭
   */
  async clickSignupLink() {
    await this.signupLink.click();
  }
}
