import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetTokenDto {
  @ApiProperty({
    description: '방 이름 (roomId)',
    example: 'room-d0340570-f900-469c-a4a5-63eeacba83dc',
  })
  @IsString()
  @IsNotEmpty({ message: 'roomId은 필수입니다' })
  roomId: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '이영희',
  })
  @IsString()
  @IsNotEmpty({ message: 'userName은 필수입니다' })
  userName: string;
}

export class TokenResponse {
  @ApiProperty({
    description: 'LiveKit 접근 토큰 (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'LiveKit 서버 URL',
    example: 'wss://livekit-server.com',
  })
  url: string;
}
