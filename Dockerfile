# Build stage
FROM --platform=linux/amd64 oven/bun:1.3-alpine AS builder

WORKDIR /app

# mediasoup 빌드에 필요한 패키지 설치
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers \
    && pip3 install --break-system-packages invoke

# 패키지 파일 복사
COPY package.json bun.lock* ./

# 의존성 설치 (mediasoup postinstall 실행)
RUN bun install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 빌드
RUN bun run build

# Production stage
FROM --platform=linux/amd64 oven/bun:1.3-alpine

WORKDIR /app

# mediasoup 실행에 필요한 런타임 패키지 설치
RUN apk add --no-cache \
    libstdc++ \
    curl \
    ca-certificates

# package.json 복사
COPY package.json bun.lock* ./

# 빌드된 파일과 node_modules 복사 (mediasoup worker 포함)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 포트 노출
EXPOSE 3002
# mediasoup RTC 포트 범위 (AWS 설정과 일치)
EXPOSE 10000-59999/udp

# 환경 변수 기본값 (ECS Task Definition에서 override 가능)
ENV NODE_ENV=production
ENV PORT=3002
ENV MEDIASOUP_WORKER_COUNT=4
ENV MEDIASOUP_RTC_MIN_PORT=10000
ENV MEDIASOUP_RTC_MAX_PORT=59999

# Health check (ALB가 수행하지만 로컬 테스트용)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

# 애플리케이션 실행
CMD ["bun", "run", "dist/main.js"]
