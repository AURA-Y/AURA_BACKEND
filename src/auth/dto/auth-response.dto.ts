import { ApiProperty } from '@nestjs/swagger';

class UserInfo {
  @ApiProperty({
    description: '사용자 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '사용자명',
    example: 'testuser',
  })
  username: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
  })
  name: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT 액세스 토큰 (7일 유효)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '사용자 정보',
    type: UserInfo,
  })
  user: {
    id: string;
    username: string;
    name: string;
  };

  constructor(accessToken: string, user: { id: string; username: string; name: string }) {
    this.accessToken = accessToken;
    this.user = user;
  }
}
