import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Room } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { MediaService } from '../media/media.service';
import { BotService } from '../bot/bot.service';

/**
 * 방 메타데이터 (REST API용)
 */
export interface RoomMetadata {
  roomId: string;
  roomTitle: string;
  description: string;
  maxParticipants: number;
  createdBy: string;
  createdAt: Date;
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private rooms: Map<string, Room> = new Map();
  private roomMetadata: Map<string, RoomMetadata> = new Map();

  constructor(
    private readonly mediaService: MediaService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
  ) {}

  /**
   * 방 생성 (MediaService에서 Router 직접 생성)
   */
  async createRoom(
    createRoomDto: CreateRoomDto,
    customId?: string,
  ): Promise<RoomResponseDto> {
    const roomId = customId || uuidv4();
    const roomName = createRoomDto.roomTitle || `Room ${roomId}`;

    try {
      // MediaService에서 Router 직접 생성 (통합 서버)
      const router = await this.mediaService.createRouter(roomId);

      // Room 엔티티 생성
      const room = new Room(
        roomId,
        roomName,
        router,
        createRoomDto.maxParticipants,
      );

      this.rooms.set(roomId, room);
      this.logger.log(`Room created: ${roomId} - ${roomName}`);

      // Bot 자동 추가 (비동기로 실행, 에러 무시)
      this.botService
        .joinRoom(roomId, 'AURA Bot', '/bot-avatar.png')
        .then((bot) => {
          this.logger.log(`Bot ${bot.botId} auto-joined room ${roomId}`);
        })
        .catch((error) => {
          this.logger.warn(`Failed to auto-join bot: ${error.message}`);
        });

      return new RoomResponseDto(room);
    } catch (error) {
      this.logger.error(`Failed to create room: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create room`);
    }
  }

  /**
   * 방 조회
   */
  getRoom(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }
    return room;
  }

  /**
   * 모든 방 조회
   */
  getAllRooms(): RoomResponseDto[] {
    return Array.from(this.rooms.values()).map(
      (room) => new RoomResponseDto(room),
    );
  }

  /**
   * 방 삭제 (Media Server에 Router 삭제 요청)
   */
  async deleteRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    try {
      // Router 삭제 (MediaService에서 자동 처리됨)
      await this.mediaService.closeRouter(roomId);

      this.rooms.delete(roomId);
      this.logger.log(`Room deleted: ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to delete room: ${error.message}`);
      // 로컬 상태만이라도 정리
      this.rooms.delete(roomId);
    }
  }

  /**
   * 방 참가 가능 여부 확인
   */
  canJoinRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }
    return !room.isFull();
  }

  /**
   * Peer를 방에 추가
   */
  addPeerToRoom(roomId: string, peerId: string, peer: any): void {
    const room = this.getRoom(roomId);

    if (room.isFull()) {
      throw new BadRequestException('Room is full');
    }

    room.addPeer(peerId, peer);
    this.logger.log(`Peer ${peerId} added to room ${roomId}`);
  }

  /**
   * Peer를 방에서 제거
   */
  removePeerFromRoom(roomId: string, peerId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.removePeer(peerId);
      this.logger.log(`Peer ${peerId} removed from room ${roomId}`);

      // 방이 비었으면 자동 삭제
      if (room.getPeerCount() === 0) {
        this.deleteRoom(roomId);
      }
    }
  }

  /**
   * 방 메타데이터 저장 (REST API용)
   */
  saveRoomMetadata(metadata: RoomMetadata): void {
    this.roomMetadata.set(metadata.roomId, metadata);
    this.logger.log(`Room metadata saved: ${metadata.roomId}`);
  }

  /**
   * 방 메타데이터 조회 (REST API용)
   */
  getRoomMetadata(roomId: string): RoomMetadata | undefined {
    return this.roomMetadata.get(roomId);
  }

  /**
   * 모든 방 메타데이터 조회 (REST API용)
   */
  getAllRoomMetadata(): RoomMetadata[] {
    return Array.from(this.roomMetadata.values());
  }

  /**
   * 간단한 인증 토큰 생성 (REST API용)
   * 프론트엔드에서 Socket.io 연결 시 사용할 간단한 세션 토큰 반환
   */
  createToken(roomId: string, userName: string): string {
    // 단순 세션 식별용 토큰 (Base64 인코딩)
    const tokenData = {
      roomId,
      userName,
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }
}
