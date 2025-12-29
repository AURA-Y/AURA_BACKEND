import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    description: '사용자 이름',
    example: '김철수',
  })
  @IsString()
  @IsNotEmpty({ message: 'userName은 필수입니다' })
  userName: string;

  @ApiPropertyOptional({
    description: '방 제목',
    example: '개발자 회의방',
    default: '[userName]의 방',
  })
  @IsString()
  @IsOptional()
  roomTitle?: string;

  @ApiPropertyOptional({
    description: '방 설명',
    example: '오후 3시 스프린트 미팅',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '최대 참여 인원',
    example: 10,
    minimum: 2,
    maximum: 50,
    default: 10,
  })
  @IsInt({ message: 'maxParticipants는 정수여야 합니다' })
  @Min(2, { message: '최소 2명 이상이어야 합니다' })
  @Max(50, { message: '최대 50명까지 가능합니다' })
  @IsOptional()
  maxParticipants?: number;
}

export class RoomMetadata {
  @ApiProperty({ description: '방 ID', example: 'room-uuid-123' })
  roomId: string;

  @ApiProperty({ description: '방 제목', example: '개발자 회의방' })
  roomTitle: string;

  @ApiProperty({ description: '방 설명', example: '오후 3시 스프린트 미팅' })
  description: string;

  @ApiProperty({ description: '최대 참여 인원', example: 10 })
  maxParticipants: number;

  @ApiProperty({ description: '방 생성자', example: '김철수' })
  createdBy: string;

  @ApiProperty({ description: '생성 시간', example: '2025-12-27T06:00:00.000Z' })
  createdAt: Date;
}
