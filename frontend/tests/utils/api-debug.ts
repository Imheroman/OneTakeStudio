/**
 * API 디버깅 헬퍼 함수
 */

/**
 * API 응답을 상세히 로깅
 */
export async function logApiResponse(response: Response, label: string = 'API 응답') {
  const status = response.status;
  const headers = Object.fromEntries(response.headers.entries());
  
  let body: any;
  try {
    body = await response.clone().json();
  } catch {
    body = await response.clone().text();
  }
  
  console.log(`\n=== ${label} ===`);
  console.log('Status:', status);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Body:', JSON.stringify(body, null, 2));
  console.log('========================\n');
  
  return { status, headers, body };
}

/**
 * 네트워크 요청 실패 시 상세 정보 출력
 */
export function logNetworkError(error: any, context: string = '') {
  console.error(`\n=== 네트워크 에러 ${context ? `(${context})` : ''} ===`);
  console.error('Error:', error);
  if (error.response) {
    console.error('Response Status:', error.response.status);
    console.error('Response Data:', error.response.data);
  }
  console.error('========================\n');
}
