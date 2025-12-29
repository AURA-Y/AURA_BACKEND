import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class JoinBotDto {
  @ApiProperty({
    description: "Bot이 참가할 방 ID",
    example: "room-d0340570-f900-469c-a4a5-63eeacba83dc",
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: "Bot의 이름 (기본값: AURA)",
    example: "AURA",
    required: false,
  })
  @IsString()
  @IsOptional()
  botName?: string;
}

export class BotJoinResponse {
  @ApiProperty({
    description: "Bot 참가 성공 여부",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Bot ID (participant identity)",
    example: "bot-abc123",
  })
  botId: string;

  @ApiProperty({
    description: "참가한 방 ID",
    example: "room-d0340570-f900-469c-a4a5-63eeacba83dc",
  })
  roomId: string;

  @ApiProperty({
    description: "Bot 이름",
    example: "AURA",
  })
  botName: string;

  @ApiProperty({
    description: "참가 시각",
    example: "2025-12-29T10:30:00.000Z",
  })
  joinedAt: string;
}
