# AURA Backend - Unified Server

Mediasoup 기반 화상 회의 통합 서버입니다.

## 🏗️ 아키텍처

```
통합 서버 (aura-server)
├── REST API (방 생성, 토큰, Bot)
├── WebSocket (Signalling)
└── Mediasoup Workers (미디어 처리)
```

**특징**:
- ✅ 단일 서버로 모든 기능 처리
- ✅ Latency 최소화 (HTTP 오버헤드 없음)
- ✅ 수평 확장 가능 (동일한 서버 여러 인스턴스)
- ✅ 환경변수로 Worker 수 조절

## 🚀 실행 방법

### Docker Compose (권장)

```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 필요한 값 수정

# 서비스 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 종료
docker-compose down
```

### 개별 실행 (개발 환경)

```bash
cd aura-server
bun install
bun run start:dev
```

## 🔌 API 엔드포인트

### REST API (http://localhost:3002)

- `GET /api/health` - Health check
- `POST /api/room/create` - 방 생성
- `GET /api/rooms` - 방 목록
- `GET /api/room/:roomId` - 방 정보
- `POST /api/token` - 토큰 발급
- `POST /api/bot/join` - Bot 참가
- `GET /api/bot/active` - 활성 Bot 목록
- `GET /api-docs` - Swagger 문서

### WebSocket

- Socket.io 기반 시그널링
- 포트: 3002

## 📝 환경 변수

- `PORT`: 서버 포트 (기본값: 3002)
- `FRONTEND_URL`: Frontend URL (기본값: http://localhost:3000)
- `JWT_SECRET`: JWT 시크릿 키
- `MEDIASOUP_ANNOUNCED_IP`: 외부 접속 IP (프로덕션 환경에서 필수)
- **`MEDIASOUP_WORKERS`**: Mediasoup worker 수 (기본값: CPU 코어 수)
  - 권장: 8 (프로덕션)
  - 테스트: 2-4 (개발)

## 🐳 Docker

### 이미지 빌드

```bash
docker build -t aura-server ./aura-server
```

### 개별 실행

```bash
docker run -p 3002:3002 -p 10000-10100:10000-10100/udp \
  -e MEDIASOUP_WORKERS=8 \
  -e MEDIASOUP_ANNOUNCED_IP=YOUR_PUBLIC_IP \
  aura-server
```

## 🔧 기술 스택

- **Runtime**: Bun 1.3
- **Framework**: NestJS
- **Media**: Mediasoup (통합)
- **WebSocket**: Socket.io
- **API Docs**: Swagger
- **Validation**: class-validator

## 🚢 ECS 배포

같은 이미지로 여러 인스턴스를 실행하여 수평 확장:

```yaml
# 환경변수로 Worker 수 조절
Task Definition:
  - Container 1: MEDIASOUP_WORKERS=8
  - Container 2: MEDIASOUP_WORKERS=8
```

**ALB 설정**:
- Target Group에 모든 인스턴스 등록
- Health Check: `/api/health`
- 자동 로드 밸런싱
