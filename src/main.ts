import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initializePublicIP } from './utils/get-public-ip';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function initializeDatabase() {
  const logger = new Logger('DatabaseInit');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'aura',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    logger.log('Database connection established');

    // users 테이블 생성
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    logger.log('✓ Users table created');

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);
    logger.log('✓ Username index created');

    // 테스트 계정 3개 생성
    const testUsers = [
      { username: 'testuser1', password: 'password123!', name: '테스트유저1' },
      { username: 'testuser2', password: 'password123!', name: '테스트유저2' },
      { username: 'testuser3', password: 'password123!', name: '테스트유저3' },
    ];

    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await dataSource.query(
        `INSERT INTO users (username, password, name) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING`,
        [user.username, hashedPassword, user.name]
      );
    }
    logger.log('✓ Test users created (testuser1, testuser2, testuser3)');

    await dataSource.destroy();
    logger.log('Database initialization complete');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // AWS ECS 환경에서 Public IP 자동 감지 (Mediasoup announcedIp 설정)
  await initializePublicIP();

  // 데이터베이스 초기화 (테이블 생성 및 테스트 계정 추가)
  await initializeDatabase();

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
