# Jenkins와 kaniko에서 바로 이미지를 만들 수 있도록 프론트 빌드를 이미지 안에서 끝낸다.
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

# nginx 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

# entrypoint 스크립트 복사 및 실행 권한 부여
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 기본 nginx 설정 백업 및 제거
RUN rm -f /etc/nginx/conf.d/default.conf

# React 빌드 결과 복사
COPY --from=build /app/build/ /usr/share/nginx/html

# 80 포트로 서비스
EXPOSE 80

# entrypoint 스크립트 실행
ENTRYPOINT ["/entrypoint.sh"]
