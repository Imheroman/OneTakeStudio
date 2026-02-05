@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM OneTakeStudio API 테스트 스크립트 (Windows)

REM 환경 변수 설정
if "%BASE_URL%"=="" set BASE_URL=http://localhost:8080
if "%MEDIA_URL%"=="" set MEDIA_URL=http://localhost:8082
if "%USER_ID%"=="" set USER_ID=test-user-123

:MENU
cls
echo ========================================
echo   OneTakeStudio API 테스트
echo ========================================
echo.
echo BASE_URL: %BASE_URL%
echo MEDIA_URL: %MEDIA_URL%
echo USER_ID: %USER_ID%
echo.
echo ========================================
echo 테스트할 API를 선택하세요:
echo.
echo   1. 스토리지 사용량 조회
echo   2. 스토리지 파일 목록 조회
echo   3. 알림 목록 조회
echo   4. 읽지 않은 알림 개수
echo   5. 모든 알림 읽음 처리
echo   6. 숏츠 작업 목록 조회
echo   7. SSE 알림 구독 (실시간)
echo   8. 전체 테스트 실행
echo   0. 종료
echo.
echo ========================================
echo.

set /p choice="선택: "

if "%choice%"=="1" goto TEST_STORAGE_USAGE
if "%choice%"=="2" goto TEST_STORAGE_FILES
if "%choice%"=="3" goto TEST_NOTIFICATIONS
if "%choice%"=="4" goto TEST_UNREAD_COUNT
if "%choice%"=="5" goto TEST_MARK_ALL_READ
if "%choice%"=="6" goto TEST_SHORTS_LIST
if "%choice%"=="7" goto TEST_SSE
if "%choice%"=="8" goto TEST_ALL
if "%choice%"=="0" goto END

echo 잘못된 선택입니다.
pause
goto MENU

:TEST_STORAGE_USAGE
echo.
echo ▶ 스토리지 사용량 조회
echo   GET %BASE_URL%/api/storage
echo.
curl -s -X GET "%BASE_URL%/api/storage" -H "X-User-Id: %USER_ID%"
echo.
echo.
pause
goto MENU

:TEST_STORAGE_FILES
echo.
echo ▶ 스토리지 파일 목록 조회
echo   GET %BASE_URL%/api/storage/files
echo.
curl -s -X GET "%BASE_URL%/api/storage/files?page=0&size=20" -H "X-User-Id: %USER_ID%"
echo.
echo.
pause
goto MENU

:TEST_NOTIFICATIONS
echo.
echo ▶ 알림 목록 조회
echo   GET %MEDIA_URL%/api/notifications
echo.
curl -s -X GET "%MEDIA_URL%/api/notifications" -H "X-User-Id: %USER_ID%"
echo.
echo.
pause
goto MENU

:TEST_UNREAD_COUNT
echo.
echo ▶ 읽지 않은 알림 개수
echo   GET %MEDIA_URL%/api/notifications/unread-count
echo.
curl -s -X GET "%MEDIA_URL%/api/notifications/unread-count" -H "X-User-Id: %USER_ID%"
echo.
echo.
pause
goto MENU

:TEST_MARK_ALL_READ
echo.
echo ▶ 모든 알림 읽음 처리
echo   PUT %MEDIA_URL%/api/notifications/read-all
echo.
curl -s -X PUT "%MEDIA_URL%/api/notifications/read-all" -H "X-User-Id: %USER_ID%"
echo.
echo.
pause
goto MENU

:TEST_SHORTS_LIST
echo.
echo ▶ 내 숏츠 작업 목록 조회
echo   GET %MEDIA_URL%/api/shorts/my
echo.
curl -s -X GET "%MEDIA_URL%/api/shorts/my" -H "X-User-Id: %USER_ID%"
echo.
echo.
pause
goto MENU

:TEST_SSE
echo.
echo ▶ SSE 실시간 알림 구독
echo   (Ctrl+C로 종료)
echo.
curl -N -H "X-User-Id: %USER_ID%" "%MEDIA_URL%/api/notifications/subscribe"
echo.
pause
goto MENU

:TEST_ALL
echo.
echo ========================================
echo   전체 API 테스트 시작
echo ========================================
echo.

echo [1/5] 스토리지 사용량 조회...
curl -s -X GET "%BASE_URL%/api/storage" -H "X-User-Id: %USER_ID%"
echo.
timeout /t 1 /nobreak >nul

echo [2/5] 스토리지 파일 목록 조회...
curl -s -X GET "%BASE_URL%/api/storage/files?page=0&size=20" -H "X-User-Id: %USER_ID%"
echo.
timeout /t 1 /nobreak >nul

echo [3/5] 알림 목록 조회...
curl -s -X GET "%MEDIA_URL%/api/notifications" -H "X-User-Id: %USER_ID%"
echo.
timeout /t 1 /nobreak >nul

echo [4/5] 읽지 않은 알림 개수...
curl -s -X GET "%MEDIA_URL%/api/notifications/unread-count" -H "X-User-Id: %USER_ID%"
echo.
timeout /t 1 /nobreak >nul

echo [5/5] 숏츠 작업 목록 조회...
curl -s -X GET "%MEDIA_URL%/api/shorts/my" -H "X-User-Id: %USER_ID%"
echo.

echo.
echo ========================================
echo   전체 테스트 완료!
echo ========================================
echo.
pause
goto MENU

:END
echo 종료합니다.
exit /b 0
