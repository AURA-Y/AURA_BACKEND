import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { BotService } from "./bot.service";
import { JoinBotDto, BotJoinResponse } from "./dto/join-bot.dto";

@Controller("api/bot")
@ApiTags("bot")
export class BotController {
  constructor(private readonly botService: BotService) {}

  /**
   * Bot을 방에 참가시킵니다
   * POST /api/bot/join
   */
  @Post("join")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Bot을 방에 참가시킵니다",
    description: "AI Bot을 화상회의 방에 참가시킵니다",
  })
  @ApiResponse({
    status: 201,
    description: "Bot 참가 성공",
    type: BotJoinResponse,
  })
  @ApiResponse({
    status: 400,
    description: "잘못된 요청 (방을 찾을 수 없음)",
  })
  @ApiResponse({
    status: 500,
    description: "서버 내부 오류",
  })
  async joinRoom(@Body() dto: JoinBotDto): Promise<BotJoinResponse> {
    const botInstance = await this.botService.joinRoom(
      dto.roomId,
      dto.botName
    );

    return {
      success: true,
      botId: botInstance.botId,
      roomId: botInstance.roomId,
      botName: botInstance.botName,
      joinedAt: botInstance.joinedAt.toISOString(),
    };
  }

  /**
   * Bot을 방에서 나가게 합니다
   * DELETE /api/bot/:botId
   */
  @Delete(":botId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Bot을 방에서 나가게 합니다",
    description: "활성화된 Bot을 화상회의 방에서 퇴장시킵니다",
  })
  @ApiParam({
    name: "botId",
    description: "Bot ID",
    example: "bot-abc123",
  })
  @ApiResponse({
    status: 200,
    description: "Bot 퇴장 성공",
    schema: {
      example: {
        success: true,
        message: "Bot successfully left the room",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bot을 찾을 수 없음",
  })
  async leaveRoom(@Param("botId") botId: string) {
    await this.botService.leaveRoom(botId);

    return {
      success: true,
      message: "Bot successfully left the room",
    };
  }

  /**
   * 모든 활성 Bot 목록 조회
   * GET /api/bot/active
   */
  @Get("active")
  @ApiOperation({
    summary: "활성 Bot 목록 조회",
    description: "현재 활성화되어 있는 모든 Bot의 목록을 조회합니다",
  })
  @ApiResponse({
    status: 200,
    description: "활성 Bot 목록",
    schema: {
      example: {
        bots: [
          {
            botId: "bot-abc123",
            botName: "AURA",
            roomId: "room-xyz789",
            joinedAt: "2025-12-29T10:30:00.000Z",
            participantCount: 3,
          },
        ],
        total: 1,
      },
    },
  })
  getActiveBots() {
    const bots = this.botService.getActiveBots();

    return {
      bots: bots.map((bot) => ({
        botId: bot.botId,
        botName: bot.botName,
        roomId: bot.roomId,
        joinedAt: bot.joinedAt.toISOString(),
        avatarUrl: bot.avatarUrl,
      })),
      total: bots.length,
    };
  }

  /**
   * 특정 Bot 정보 조회
   * GET /api/bot/:botId
   */
  @Get(":botId")
  @ApiOperation({
    summary: "Bot 정보 조회",
    description: "특정 Bot의 상세 정보를 조회합니다",
  })
  @ApiParam({
    name: "botId",
    description: "Bot ID",
    example: "bot-abc123",
  })
  @ApiResponse({
    status: 200,
    description: "Bot 정보",
    schema: {
      example: {
        botId: "bot-abc123",
        botName: "AURA",
        roomId: "room-xyz789",
        joinedAt: "2025-12-29T10:30:00.000Z",
        participantCount: 3,
        connectionState: "connected",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Bot을 찾을 수 없음",
  })
  getBotInfo(@Param("botId") botId: string) {
    const bot = this.botService.getBotInfo(botId);

    if (!bot) {
      return {
        success: false,
        message: `Bot '${botId}' not found`,
      };
    }

    return {
      botId: bot.botId,
      botName: bot.botName,
      roomId: bot.roomId,
      joinedAt: bot.joinedAt.toISOString(),
      avatarUrl: bot.avatarUrl,
    };
  }
}
