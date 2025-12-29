import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RoomService } from './room.service';
import type { RoomMetadata } from './room.service';
import { randomUUID } from 'crypto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GetTokenDto, TokenResponse } from './dto/get-token.dto';
import { CreateRoomResponse } from './dto/create-room-response.dto';

@Controller('api')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  /**
   * 방 입장 토큰 발급
   * POST /api/token
   */
  @Post('token')
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('token')
  @ApiOperation({
    summary: '방 입장 토큰 발급',
    description: '기존 방에 입장하기 위한 세션 토큰을 발급합니다',
  })
  @ApiResponse({
    status: 201,
    description: '토큰 발급 성공',
    type: TokenResponse,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (roomId 또는 userName 누락)',
  })
  async getToken(@Body() dto: GetTokenDto): Promise<TokenResponse> {
    const token = this.roomService.createToken(dto.roomId, dto.userName);

    return {
      token,
      url: process.env.SIGNALLING_URL || 'http://localhost:3002',
    };
  }

  /**
   * 상태 확인 API
   * GET /api/health
   */
  @Get("health")
  @ApiTags("health")
  @ApiOperation({
    summary: "서버 상태 확인",
    description: "백엔드 서버의 헬스체크를 수행합니다",
  })
  @ApiResponse({
    status: 200,
    description: "서버 정상 동작 중",
    schema: {
      example: {
        status: "ok",
        timestamp: "2025-12-27T06:00:00.000Z",
      },
    },
  })
  health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 방 생성 API
   * POST /api/room/create
   */
  @Post('room/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('room')
  @ApiOperation({
    summary: '새 방 생성',
    description:
      'Mediasoup 서버에 새 방을 생성하고 입장 토큰을 함께 반환합니다',
  })
  @ApiResponse({
    status: 201,
    description: '방 생성 성공',
    type: CreateRoomResponse,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (userName 누락, maxParticipants 범위 오류)',
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류 (Mediasoup 방 생성 실패)',
  })
  async createRoom(@Body() dto: CreateRoomDto): Promise<CreateRoomResponse> {
    const roomId = `room-${randomUUID()}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const maxParticipants = dto.maxParticipants || 10;

    // 1. Mediasoup 서버에 실제 방 생성 (Router 생성)
    await this.roomService.createRoom(
      {
        userName: dto.userName,
        roomTitle: dto.roomTitle || `${dto.userName}의 방`,
        maxParticipants,
      },
      roomId,
    );

    // 2. 방 메타데이터 저장
    const metadata: RoomMetadata = {
      roomId,
      roomTitle: dto.roomTitle || `${dto.userName}의 방`,
      description: dto.description || '',
      maxParticipants,
      createdBy: dto.userName,
      createdAt: new Date(),
    };
    this.roomService.saveRoomMetadata(metadata);

    // 3. 입장 토큰 생성
    const token = this.roomService.createToken(roomId, dto.userName);

    // Bot auto-join is handled in RoomService.createRoom()

    return {
      roomId,
      roomUrl: `${frontendUrl}/room/${roomId}`,
      roomTitle: metadata.roomTitle,
      description: metadata.description,
      maxParticipants,
      userName: dto.userName,
      token,
      livekitUrl: process.env.SIGNALLING_URL || 'http://localhost:3002',
    };
  }

  /**
   * 특정 방 정보 조회
   * GET /api/room/:roomId
   */
  @Get("room/:roomId")
  @ApiTags("room")
  @ApiOperation({
    summary: "방 정보 조회",
    description: "roomId로 방의 메타데이터를 조회합니다",
  })
  @ApiParam({
    name: "roomId",
    description: "방 ID",
    example: "room-d0340570-f900-469c-a4a5-63eeacba83dc",
  })
  @ApiResponse({
    status: 200,
    description: "방 정보 조회 성공",
  })
  @ApiResponse({
    status: 404,
    description: "방을 찾을 수 없음",
  })
  getRoomInfo(@Param("roomId") roomId: string): RoomMetadata {
    const metadata = this.roomService.getRoomMetadata(roomId);

    if (!metadata) {
      throw new NotFoundException(`Room '${roomId}' not found`);
    }

    return metadata;
  }

  /**
   * 모든 방 목록 조회
   * GET /api/rooms
   */
  @Get('rooms')
  @ApiTags('room')
  @ApiOperation({
    summary: '전체 방 목록 조회',
    description: '현재 생성된 모든 방의 목록을 반환합니다',
  })
  @ApiResponse({
    status: 200,
    description: '방 목록 조회 성공',
    schema: {
      example: {
        rooms: [
          {
            roomId: 'room-uuid-123',
            roomTitle: '개발자 회의방',
            description: '스프린트 미팅',
            maxParticipants: 10,
            createdBy: '김철수',
            createdAt: '2025-12-27T06:00:00.000Z',
          },
        ],
        total: 1,
      },
    },
  })
  getAllRooms() {
    const rooms = this.roomService.getAllRoomMetadata();
    return {
      rooms,
      total: rooms.length,
    };
  }
}
