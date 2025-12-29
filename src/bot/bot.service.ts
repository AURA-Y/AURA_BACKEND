import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { RoomService } from "../room/room.service";
import { randomUUID } from "crypto";

/**
 * 가상 Bot 인스턴스
 */
interface BotInstance {
  botId: string;
  botName: string;
  roomId: string;
  joinedAt: Date;
  avatarUrl?: string; // Bot 이미지 URL
}

/**
 * 가상 Bot Service
 *
 * 실제 WebRTC 연결 없이 Bot 상태만 관리
 * 프론트엔드에서 Bot을 렌더링
 *
 * 나중에 실제 AI Agent로 교체 가능
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private activeBots: Map<string, BotInstance> = new Map();

  constructor(
    @Inject(forwardRef(() => RoomService))
    private readonly roomService: RoomService,
  ) {}

  /**
   * 가상 Bot을 방에 "참가"시킵니다
   * 실제로는 상태만 저장하고, 프론트엔드에서 렌더링
   */
  async joinRoom(
    roomId: string,
    botName?: string,
    avatarUrl?: string
  ): Promise<BotInstance> {
    const botId = `bot-${randomUUID()}`;
    const finalBotName = botName || "AURA";

    this.logger.log(`Virtual bot joining room: ${roomId} as ${finalBotName}`);

    // 1. 방이 존재하는지 확인
    try {
      this.roomService.getRoom(roomId);
    } catch (error) {
      throw new BadRequestException(`Room '${roomId}' not found`);
    }

    // 2. 가상 Bot 인스턴스 생성
    const botInstance: BotInstance = {
      botId,
      botName: finalBotName,
      roomId,
      joinedAt: new Date(),
      avatarUrl: avatarUrl || "/bot-avatar.png", // 기본 아바타
    };

    // 3. 활성 Bot 목록에 추가
    this.activeBots.set(botId, botInstance);

    this.logger.log(
      `Virtual bot ${botId} joined room ${roomId} (total bots: ${this.activeBots.size})`
    );

    return botInstance;
  }

  /**
   * Bot을 방에서 "퇴장"시킵니다
   */
  async leaveRoom(botId: string): Promise<void> {
    const botInstance = this.activeBots.get(botId);

    if (!botInstance) {
      throw new BadRequestException(`Bot '${botId}' not found`);
    }

    this.logger.log(`Bot ${botId} leaving room ${botInstance.roomId}`);

    this.activeBots.delete(botId);
    this.logger.log(`Bot ${botId} left the room`);
  }

  /**
   * 모든 활성 Bot 목록 조회
   */
  getActiveBots(): BotInstance[] {
    return Array.from(this.activeBots.values());
  }

  /**
   * 특정 Bot 정보 조회
   */
  getBotInfo(botId: string): BotInstance | undefined {
    return this.activeBots.get(botId);
  }

  /**
   * 특정 방의 Bot 목록 조회
   */
  getBotsInRoom(roomId: string): BotInstance[] {
    return Array.from(this.activeBots.values()).filter(
      (bot) => bot.roomId === roomId
    );
  }

  /**
   * 애플리케이션 종료 시 모든 Bot 정리
   */
  async onModuleDestroy() {
    this.logger.log("Cleaning up all bots...");
    this.activeBots.clear();
  }
}
