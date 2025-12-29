import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS 활성화 (개발 환경: 모든 오리진 허용)
  const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:8080']
    : ['http://localhost:3000', 'http://localhost:8080', '*'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation Pipe 전역 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 속성 자동 제거
      forbidNonWhitelisted: true, // DTO에 없는 속성 있으면 에러
      transform: true, // 타입 자동 변환
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API 문서 설정
  const config = new DocumentBuilder()
    .setTitle('AURA Signalling Server API')
    .setDescription('Mediasoup 기반 화상 회의 서비스 Signalling Server API')
    .setVersion('1.0')
    .addTag('health', '서버 상태 확인')
    .addTag('room', '방 관리')
    .addTag('token', '토큰 발급')
    .addTag('bot', 'Bot 관리')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);

  logger.log(`Signalling Server is running on: http://localhost:${port}`);
  logger.log(`API Docs available at http://localhost:${port}/api-docs`);
  logger.log(`WebSocket server is ready for connections`);
}
bootstrap();
