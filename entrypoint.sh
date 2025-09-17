#!/bin/sh

# 🚀 배포용 nginx entrypoint 스크립트
# 환경변수 검증, 헬스체크, 로깅, 에러 핸들링 포함

set -e  # 에러 발생 시 스크립트 종료

# 로깅 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
}

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  INFO: $1"
}

# 환경변수 기본값 설정
CHAT_SERVER_HOST=${CHAT_SERVER_HOST}
CHAT_SERVER_PORT=${CHAT_SERVER_PORT}
CHATBOT_SERVER_HOST=${CHATBOT_SERVER_HOST}
CHATBOT_SERVER_PORT=${CHATBOT_SERVER_PORT}

# 필수 환경변수 검증
validate_environment() {
    log_info "환경변수 검증 시작..."
    
    # 필수 환경변수 검증
    if [ -z "$CHAT_SERVER_HOST" ]; then
        log_error "필수 환경변수 CHAT_SERVER_HOST가 설정되지 않았습니다."
        exit 1
    fi
    
    if [ -z "$CHAT_SERVER_PORT" ]; then
        log_error "필수 환경변수 CHAT_SERVER_PORT가 설정되지 않았습니다."
        exit 1
    fi
    
    if [ -z "$CHATBOT_SERVER_HOST" ]; then
        log_error "필수 환경변수 CHATBOT_SERVER_HOST가 설정되지 않았습니다."
        exit 1
    fi
    
    if [ -z "$CHATBOT_SERVER_PORT" ]; then
        log_error "필수 환경변수 CHATBOT_SERVER_PORT가 설정되지 않았습니다."
        exit 1
    fi
    
    log_success "환경변수 검증 완료"
    log_info "Chat Server: ${CHAT_SERVER_HOST}:${CHAT_SERVER_PORT}"
    log_info "Bot Server: ${CHATBOT_SERVER_HOST}:${CHATBOT_SERVER_PORT}"
}

# 백엔드 서비스 헬스체크
health_check() {
    log_info "백엔드 서비스 헬스체크 시작..."
    
    # Chat Server 헬스체크
    log_info "Chat Server 헬스체크 중... (${CHAT_SERVER_HOST}:${CHAT_SERVER_PORT})"
    if ! nc -z "${CHAT_SERVER_HOST}" "${CHAT_SERVER_PORT}" 2>/dev/null; then
        log_error "Chat Server에 연결할 수 없습니다: ${CHAT_SERVER_HOST}:${CHAT_SERVER_PORT}"
        log_info "Chat Server가 시작될 때까지 대기 중..."
        
        # 최대 60초 대기
    count=0
    while [ $count -lt 60 ]; do
        if nc -z "${CHAT_SERVER_HOST}" "${CHAT_SERVER_PORT}" 2>/dev/null; then
            log_success "Chat Server 연결 성공!"
            break
        fi
        sleep 2
        count=$((count + 2))
        log_info "대기 중... (${count}/60초)"
    done
        
        if [ $count -ge 60 ]; then
            log_error "Chat Server 연결 타임아웃 (60초)"
            exit 1
        fi
    else
        log_success "Chat Server 연결 성공!"
    fi
    
    # Bot Server 헬스체크
    log_info "Bot Server 헬스체크 중... (${CHATBOT_SERVER_HOST}:${CHATBOT_SERVER_PORT})"
    if ! nc -z "${CHATBOT_SERVER_HOST}" "${CHATBOT_SERVER_PORT}" 2>/dev/null; then
        log_error "Bot Server에 연결할 수 없습니다: ${CHATBOT_SERVER_HOST}:${CHATBOT_SERVER_PORT}"
        log_info "Bot Server가 시작될 때까지 대기 중..."
        
        # 최대 60초 대기
        count=0
        while [ $count -lt 60 ]; do
            if nc -z "${CHATBOT_SERVER_HOST}" "${CHATBOT_SERVER_PORT}" 2>/dev/null; then
                log_success "Bot Server 연결 성공!"
                break
            fi
            sleep 2
            count=$((count + 2))
            log_info "대기 중... (${count}/60초)"
        done
        
        if [ $count -ge 60 ]; then
            log_error "Bot Server 연결 타임아웃 (60초)"
            exit 1
        fi
    else
        log_success "Bot Server 연결 성공!"
    fi
    
    log_success "모든 백엔드 서비스 헬스체크 완료"
}

# nginx 설정 생성
generate_nginx_config() {
    log_info "nginx 설정 생성 시작..."
    
    # nginx.conf.template이 존재하는지 확인
    if [ ! -f "/etc/nginx/nginx.conf.template" ]; then
        log_error "nginx.conf.template 파일을 찾을 수 없습니다."
        exit 1
    fi
    
    # 환경변수 치환하여 nginx 설정 생성
    # envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
    envsubst '${CHAT_SERVER_HOST} ${CHAT_SERVER_PORT} ${CHATBOT_SERVER_HOST}  ${CHATBOT_SERVER_PORT}
    ${WEBSOCKET_ENDPOINT} ${BOT_WEBSOCKET_ENDPOINT}
    ${WEBSOCKET_PREFIX} ${BOT_WEBSOCKET_PREFIX}' \
      < /etc/nginx/nginx.conf.template >  /etc/nginx/conf.d/default.conf
    
    log_success "nginx 설정 생성 완료"
    
    # 생성된 설정 파일 로그 출력 (디버깅용)
    if [ "${DEBUG:-false}" = "true" ]; then
        log_info "생성된 nginx 설정:"
        cat /etc/nginx/conf.d/default.conf
    fi
}

# nginx 설정 검증
validate_nginx_config() {
    log_info "nginx 설정 검증 중..."
    
    if nginx -t 2>/dev/null; then
        log_success "nginx 설정 검증 성공"
    else
        log_error "nginx 설정 검증 실패"
        log_error "nginx 설정 파일 내용:"
        cat /etc/nginx/conf.d/default.conf
        exit 1
    fi
}

# nginx 서버 시작
start_nginx() {
    log_info "nginx 서버 시작..."
    
    # 기존 nginx 프로세스가 있다면 종료
    if pgrep nginx > /dev/null; then
        log_info "기존 nginx 프로세스 종료 중..."
        nginx -s quit 2>/dev/null || true
        sleep 2
    fi
    
    # nginx 시작
    nginx -g 'daemon off;' &
    nginx_pid=$!
    
    # nginx 시작 확인
    sleep 2
    if kill -0 $nginx_pid 2>/dev/null; then
        log_success "nginx 서버 시작 완료 (PID: $nginx_pid)"
    else
        log_error "nginx 서버 시작 실패"
        exit 1
    fi
}

# 그레이스풀 셧다운 함수
graceful_shutdown() {
    log_info "그레이스풀 셧다운 시작..."
    
    # nginx 종료
    if pgrep nginx > /dev/null; then
        log_info "nginx 서버 종료 중..."
        nginx -s quit
        sleep 2
    fi
    
    log_success "그레이스풀 셧다운 완료"
    exit 0
}

# 시그널 핸들러 설정
trap graceful_shutdown SIGTERM SIGINT

# 메인 실행 함수
main() {
    log_info "🚀 nginx entrypoint 스크립트 시작"
    
    # 1. 환경변수 검증
    validate_environment
    
    # 2. 백엔드 서비스 헬스체크
    health_check
    
    # 3. nginx 설정 생성
    generate_nginx_config
    
    # 4. nginx 설정 검증
    validate_nginx_config
    
    # 5. nginx 서버 시작
    start_nginx
    
    log_success "🎉 모든 초기화 완료! nginx 서버가 실행 중입니다."
    
    # nginx 프로세스 대기
    wait
}

# 스크립트 실행
main "$@"
