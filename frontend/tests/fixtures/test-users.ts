/**
 * 테스트용 사용자 계정 정보
 * 실제 API 테스트 시 사용
 */

export interface TestUser {
  email: string;
  password: string;
  nickname?: string;
}

/**
 * 실제 API 테스트용 계정
 * 백엔드에 미리 생성되어 있어야 함
 */
export const REAL_API_TEST_USERS: Record<string, TestUser> = {
  valid: {
    email: 'kfor11@naver.com',
    password: 'user01user01',
    nickname: 'ㅇㅇ',
  },
  invalid: {
    email: 'gestgdh2@gmail.com',
    password: '12345678',
  },
};

/**
 * MSW 모킹 테스트용 계정
 */
export const MOCKED_TEST_USERS: Record<string, TestUser> = {
  valid: {
    email: 'test@example.com',
    password: '12345678',
    nickname: '테스트 사용자',
  },
  invalid: {
    email: 'wrong@example.com',
    password: 'wrongpassword',
  },
};

/**
 * 현재 테스트 환경에 맞는 테스트 사용자 반환
 * @param useRealAPI 실제 API 사용 여부
 * @returns 테스트 사용자 객체
 */
export function getTestUsers(useRealAPI: boolean = false): Record<string, TestUser> {
  return useRealAPI ? REAL_API_TEST_USERS : MOCKED_TEST_USERS;
}
