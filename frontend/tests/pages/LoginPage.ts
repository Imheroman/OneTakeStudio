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
    this.loginButton = page.getByRole('button', { name: /로그인/i });
    this.errorMessage = page.locator('[role="alert"]').or(page.locator('.text-red-500, .text-destructive'));
    this.signupLink = page.getByRole('link', { name: /회원가입/i });
  }

  /**
   * 로그인 페이지로 이동
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
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
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  /**
   * 회원가입 링크 클릭
   */
  async clickSignupLink() {
    await this.signupLink.click();
  }
}
