#!/bin/bash

# OneTakeStudio API 테스트 스크립트

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수 설정
BASE_URL="${BASE_URL:-http://localhost:8080}"
MEDIA_URL="${MEDIA_URL:-http://localhost:8082}"
USER_ID="${USER_ID:-test-user-123}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  OneTakeStudio API 테스트${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "BASE_URL: ${GREEN}${BASE_URL}${NC}"
echo -e "MEDIA_URL: ${GREEN}${MEDIA_URL}${NC}"
echo -e "USER_ID: ${GREEN}${USER_ID}${NC}"
echo ""

# 함수: API 호출 및 결과 출력
call_api() {
    local method=$1
    local url=$2
    local description=$3
    local data=$4

    echo -e "${YELLOW}▶ ${description}${NC}"
    echo -e "  ${method} ${url}"

    if [ -n "$data" ]; then
        response=$(curl -s -X ${method} "${url}" \
            -H "X-User-Id: ${USER_ID}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    else
        response=$(curl -s -X ${method} "${url}" \
            -H "X-User-Id: ${USER_ID}")
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 성공${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${RED}✗ 실패${NC}"
    fi
    echo ""
}

# 메뉴
show_menu() {
    echo -e "${BLUE}========================================${NC}"
    echo "테스트할 API를 선택하세요:"
    echo ""
    echo "  1. 스토리지 사용량 조회"
    echo "  2. 스토리지 파일 목록 조회"
    echo "  3. 알림 목록 조회"
    echo "  4. 읽지 않은 알림 개수"
    echo "  5. 모든 알림 읽음 처리"
    echo "  6. 숏츠 작업 목록 조회"
    echo "  7. SSE 알림 구독 (실시간)"
    echo "  8. 전체 테스트 실행"
    echo "  0. 종료"
    echo ""
    echo -e "${BLUE}========================================${NC}"
}

# 1. 스토리지 사용량 조회
test_storage_usage() {
    call_api "GET" "${BASE_URL}/api/storage" "스토리지 사용량 조회"
}

# 2. 스토리지 파일 목록 조회
test_storage_files() {
    call_api "GET" "${BASE_URL}/api/storage/files?page=0&size=20" "스토리지 파일 목록 조회"
}

# 3. 알림 목록 조회
test_notifications() {
    call_api "GET" "${MEDIA_URL}/api/notifications" "알림 목록 조회"
}

# 4. 읽지 않은 알림 개수
test_unread_count() {
    call_api "GET" "${MEDIA_URL}/api/notifications/unread-count" "읽지 않은 알림 개수"
}

# 5. 모든 알림 읽음 처리
test_mark_all_read() {
    call_api "PUT" "${MEDIA_URL}/api/notifications/read-all" "모든 알림 읽음 처리"
}

# 6. 숏츠 작업 목록 조회
test_shorts_list() {
    call_api "GET" "${MEDIA_URL}/api/shorts/my" "내 숏츠 작업 목록 조회"
}

# 7. SSE 알림 구독
test_sse_subscribe() {
    echo -e "${YELLOW}▶ SSE 실시간 알림 구독${NC}"
    echo -e "  (Ctrl+C로 종료)"
    echo ""
    curl -N -H "X-User-Id: ${USER_ID}" \
        "${MEDIA_URL}/api/notifications/subscribe"
}

# 8. 전체 테스트 실행
test_all() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  전체 API 테스트 시작${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    test_storage_usage
    sleep 1

    test_storage_files
    sleep 1

    test_notifications
    sleep 1

    test_unread_count
    sleep 1

    test_shorts_list
    sleep 1

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  전체 테스트 완료!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# 메인 루프
while true; do
    show_menu
    read -p "선택: " choice
    echo ""

    case $choice in
        1) test_storage_usage ;;
        2) test_storage_files ;;
        3) test_notifications ;;
        4) test_unread_count ;;
        5) test_mark_all_read ;;
        6) test_shorts_list ;;
        7) test_sse_subscribe ;;
        8) test_all ;;
        0)
            echo -e "${GREEN}종료합니다.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}잘못된 선택입니다.${NC}"
            echo ""
            ;;
    esac

    read -p "계속하려면 Enter를 누르세요..."
    clear
done
